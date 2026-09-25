import { MAX_MESSAGE_CONTENT_LENGTH } from "@/config";
import { ConflictError, NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import { ChatResultType, createDefaultAiGenerationConfig } from "@/features/ai/domain";
import { type ChatClient, ChatUnavailableError } from "@/features/ai/infrastructure";
import {
  ClaimChatResultType,
  type ChatTurn,
  type MessageRepository,
} from "../../infrastructure";
import { ChatProgressEventType, type ChatProgressObserver } from "../events/chat-progress";

function normalizeAssistantContent(content: string): string {
  const normalized = content.replaceAll(String.fromCharCode(0), "").trim();
  const bounded = Array.from(normalized)
    .slice(0, MAX_MESSAGE_CONTENT_LENGTH)
    .join("")
    .trim();
  if (!bounded) {
    throw new ChatUnavailableError("AI chat returned invalid assistant content");
  }

  return bounded;
}

export class RespondToMessageUseCase {
  constructor(
    private readonly messages: MessageRepository,
    private readonly chat: ChatClient,
    private readonly leaseMs: number,
  ) {}

  async execute(
    userId: number,
    conversationId: string,
    triggerMessageId: string,
    observer?: ChatProgressObserver,
  ): Promise<ChatTurn> {
    const claim = await this.messages.claimChat({
      userId,
      conversationId,
      triggerMessageId,
      staleBefore: new Date(Date.now() - this.leaseMs),
    });

    switch (claim.type) {
      case ClaimChatResultType.NOT_FOUND:
        throw new NotFoundError(I18n.messageNotFound);
      case ClaimChatResultType.BUSY:
        throw new ConflictError(I18n.chatAlreadyProcessing);
      case ClaimChatResultType.COMPLETED: {
        await observer?.publish({
          type: ChatProgressEventType.COMPLETED,
          turn: claim.turn,
        });
        return claim.turn;
      }
    }

    try {
      await observer?.publish({
        type: ChatProgressEventType.STARTED,
        runId: claim.runId,
      });
      const result = await this.chat.respond(
        {
          content:
            claim.triggerMessage.content ??
            `[User attached ${claim.triggerMessage.mediaIds.length} media item(s) without text]`,
          intentHint: claim.context.intentHint,
        },
        async (delta) => {
          await observer?.publish({
            type: ChatProgressEventType.TEXT_DELTA,
            delta,
          });
        },
      );
      const turn =
        result.type === ChatResultType.REPLY
          ? await this.messages.completeChatReply({
              runId: claim.runId,
              claimVersion: claim.claimVersion,
              content: normalizeAssistantContent(result.content),
            })
          : await this.messages.completeChatGeneration({
              runId: claim.runId,
              claimVersion: claim.claimVersion,
              type: result.mediaType,
              config:
                claim.context.generationSettings[result.mediaType] ??
                createDefaultAiGenerationConfig(),
            });

      if (!turn) {
        throw new NotFoundError(I18n.messageNotFound);
      }

      if (result.type === ChatResultType.GENERATION) {
        const generation = turn.userMessage.generation;
        if (!generation) {
          throw new Error("Completed generation chat has no generation");
        }
        await observer?.publish({
          type: ChatProgressEventType.GENERATION_QUEUED,
          generation,
        });
      }
      await observer?.publish({
        type: ChatProgressEventType.COMPLETED,
        turn,
      });
      return turn;
    } catch (err) {
      if (err instanceof ChatUnavailableError) {
        await this.messages.failChat(claim.runId, claim.claimVersion);
      }
      throw err;
    }
  }
}
