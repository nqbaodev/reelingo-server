import { MAX_MESSAGE_CONTENT_LENGTH } from "@/config";
import { ConflictError, NotFoundError } from "@/core/errors";
import { I18n } from "@/core/i18n";
import {
  ChatResultType,
  createDefaultAiGenerationConfig,
} from "@/features/ai/domain";
import {
  type ChatClient,
  ChatUnavailableError,
} from "@/features/ai/infrastructure";
import {
  ClaimChatResultType,
  type ChatTurn,
  type MessageRepository,
} from "../infrastructure";

function normalizeAssistantContent(content: string): string {
  const normalized = content.replaceAll(String.fromCharCode(0), "").trim();
  const bounded = Array.from(normalized)
    .slice(0, MAX_MESSAGE_CONTENT_LENGTH)
    .join("")
    .trim();
  if (!bounded) {
    throw new ChatUnavailableError(
      "AI chat returned invalid assistant content",
    );
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
      case ClaimChatResultType.COMPLETED:
        return claim.turn;
    }

    try {
      const result = await this.chat.respond({
        content:
          claim.triggerMessage.content ??
          `[User attached ${claim.triggerMessage.mediaIds.length} media item(s) without text]`,
        intentHint: claim.context.intentHint,
      });
      const content = normalizeAssistantContent(result.content);

      const turn =
        result.type === ChatResultType.REPLY
          ? await this.messages.completeChatReply({
              runId: claim.runId,
              claimVersion: claim.claimVersion,
              content,
            })
          : await this.messages.completeChatGeneration({
              runId: claim.runId,
              claimVersion: claim.claimVersion,
              content,
              type: result.mediaType,
              config:
                claim.context.generationSettings[result.mediaType] ??
                createDefaultAiGenerationConfig(),
            });

      if (!turn) {
        throw new NotFoundError(I18n.messageNotFound);
      }
      return turn;
    } catch (err) {
      if (err instanceof ChatUnavailableError) {
        await this.messages.failChat(claim.runId, claim.claimVersion);
      }
      throw err;
    }
  }
}
