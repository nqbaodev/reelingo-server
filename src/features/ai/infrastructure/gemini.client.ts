import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type FunctionCall,
  type FunctionDeclaration,
} from "@google/genai";
import { ChatResultType, type ChatInput, type ChatResult } from "../domain";
import { MediaType } from "@/features/media/domain";
import {
  type ChatClient,
  type ChatTextDeltaHandler,
  ChatUnavailableError,
} from "./chat.client";

const GENERATE_IMAGE_TOOL = "generate_image";
const GENERATE_VIDEO_TOOL = "generate_video";

const generationToolParameters = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "A concise confirmation in the user's language that generation was queued. Do not claim the media is complete.",
    },
  },
  required: ["reply"],
  additionalProperties: false,
};

const mediaGenerationTools: FunctionDeclaration[] = [
  {
    name: GENERATE_IMAGE_TOOL,
    description:
      "Start image generation only when the user clearly asks to create or generate an image.",
    parametersJsonSchema: generationToolParameters,
  },
  {
    name: GENERATE_VIDEO_TOOL,
    description:
      "Start video generation only when the user clearly asks to create or generate a video.",
    parametersJsonSchema: generationToolParameters,
  },
];

function getReply(args: Record<string, unknown> | undefined): string {
  const reply = args?.reply;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("Gemini returned a media tool call without a reply");
  }

  return reply.trim();
}

interface GeminiClientConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class GeminiClient implements ChatClient {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: GeminiClientConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        timeout: config.timeoutMs,
        retryOptions: { attempts: 1 },
      },
    });
  }

  async respond(
    input: ChatInput,
    onTextDelta?: ChatTextDeltaHandler,
  ): Promise<ChatResult> {
    try {
      const hint = input.intentHint
        ? `The UI currently suggests ${input.intentHint}, but this is only a preference and never sufficient by itself to call a tool.`
        : "The UI has no media preference.";
      const response = await this.client.models.generateContentStream({
        model: this.config.model,
        contents: input.content,
        config: {
          systemInstruction: [
            "You are the conversational assistant for Reelingo.",
            "Reply with natural-language text for ordinary chat, questions, capability discussions, and requests that do not clearly ask to create media.",
            "Call generate_image only for a clear image-creation request and generate_video only for a clear video-creation request.",
            "If the user wants media but the requested media type is ambiguous, ask a concise clarifying question in text instead of calling a tool.",
            "Return at most one tool call. Every media tool call must include a concise reply confirming that generation was queued, in the user's language.",
            hint,
          ].join(" "),
          tools: [{ functionDeclarations: mediaGenerationTools }],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
          },
        },
      });

      const textParts: string[] = [];
      const functionCalls: FunctionCall[] = [];
      let textDeltaHandler = onTextDelta;
      for await (const chunk of response) {
        const chunkFunctionCalls = chunk.functionCalls ?? [];
        if (chunkFunctionCalls.length > 0) {
          functionCalls.push(...chunkFunctionCalls);
          continue;
        }

        const text = chunk.text;
        if (!text) continue;

        textParts.push(text);
        if (textDeltaHandler) {
          try {
            await textDeltaHandler(text);
          } catch {
            textDeltaHandler = undefined;
          }
        }
      }

      if (functionCalls.length > 1) {
        throw new Error("Gemini returned more than one media generation call");
      }

      const functionCall = functionCalls[0];
      const functionName = functionCall?.name;
      if (functionName === GENERATE_IMAGE_TOOL) {
        return {
          type: ChatResultType.GENERATION,
          mediaType: MediaType.IMAGE,
          content: getReply(functionCall?.args),
        };
      }
      if (functionName === GENERATE_VIDEO_TOOL) {
        return {
          type: ChatResultType.GENERATION,
          mediaType: MediaType.VIDEO,
          content: getReply(functionCall?.args),
        };
      }
      if (functionName) {
        throw new Error(`Gemini returned an unsupported function: ${functionName}`);
      }

      const text = textParts.join("").trim();
      if (!text) {
        throw new Error("Gemini returned an empty chat response");
      }

      return { type: ChatResultType.REPLY, content: text };
    } catch (err) {
      throw new ChatUnavailableError("Gemini chat routing is unavailable", {
        cause: err,
      });
    }
  }
}
