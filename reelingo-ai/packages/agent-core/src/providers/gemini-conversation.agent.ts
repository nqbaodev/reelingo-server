import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type FunctionCall,
  type FunctionDeclaration,
} from "@google/genai";
import {
  AgentUnavailableError,
  type AgentRunner,
  type TextDeltaListener,
} from "../runtime/agent-runner";
import { MediaType, type AgentInput, type AgentResult } from "../domain/chat";

interface GeminiConversationAgentConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

const GENERATE_IMAGE_TOOL = "generate_image";
const GENERATE_VIDEO_TOOL = "generate_video";

const mediaTools: FunctionDeclaration[] = [
  {
    name: GENERATE_IMAGE_TOOL,
    description:
      "Request image generation only when the user clearly asks to create an image.",
    parametersJsonSchema: { type: "object", additionalProperties: false },
  },
  {
    name: GENERATE_VIDEO_TOOL,
    description:
      "Request video generation only when the user clearly asks to create a video.",
    parametersJsonSchema: { type: "object", additionalProperties: false },
  },
];

export class GeminiConversationAgent implements AgentRunner {
  private readonly client: GoogleGenAI;

  constructor(private readonly config: GeminiConversationAgentConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
      httpOptions: {
        timeout: config.timeoutMs,
        retryOptions: { attempts: 1 },
      },
    });
  }

  async respond(
    input: AgentInput,
    signal: AbortSignal,
    onTextDelta?: TextDeltaListener,
  ): Promise<AgentResult> {
    try {
      const hint = input.intentHint
        ? `The UI suggests ${input.intentHint}, but the hint alone is never sufficient to call a tool.`
        : "The UI has no media preference.";
      const response = await this.client.models.generateContentStream({
        model: this.config.model,
        contents: input.content,
        config: {
          abortSignal: signal,
          systemInstruction: [
            "You are the conversational assistant for Reelingo.",
            "Reply with natural-language text for ordinary chat and questions.",
            "Call generate_image only for a clear image-creation request and generate_video only for a clear video-creation request.",
            "If the requested media type is ambiguous, ask a concise clarifying question instead of calling a tool.",
            "Return at most one tool call and do not claim that media generation has completed.",
            hint,
          ].join(" "),
          tools: [{ functionDeclarations: mediaTools }],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
          },
        },
      });

      const textParts: string[] = [];
      const functionCalls: FunctionCall[] = [];
      let textDeltaListener = onTextDelta;

      for await (const chunk of response) {
        const chunkFunctionCalls = chunk.functionCalls ?? [];
        if (chunkFunctionCalls.length > 0) {
          functionCalls.push(...chunkFunctionCalls);
          continue;
        }

        const text = chunk.text;
        if (!text) continue;

        textParts.push(text);
        if (textDeltaListener) {
          try {
            await textDeltaListener(text);
          } catch {
            textDeltaListener = undefined;
          }
        }
      }

      if (functionCalls.length > 1) {
        throw new Error("Gemini returned more than one media tool call");
      }

      const functionName = functionCalls.at(0)?.name;
      if (functionName === GENERATE_IMAGE_TOOL) {
        return { type: "generation", mediaType: MediaType.IMAGE };
      }
      if (functionName === GENERATE_VIDEO_TOOL) {
        return { type: "generation", mediaType: MediaType.VIDEO };
      }
      if (functionName) {
        throw new Error(`Gemini returned an unsupported tool: ${functionName}`);
      }

      const content = textParts.join("").trim();
      if (!content) {
        throw new Error("Gemini returned an empty response");
      }

      return { type: "reply", content };
    } catch (error) {
      throw new AgentUnavailableError("Gemini conversation agent is unavailable", {
        cause: error,
      });
    }
  }
}
