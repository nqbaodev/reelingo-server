import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/application/pagination";
import type { Message, MessageChatRun, MessageGeneration } from "@/domain";
import { toUnixMilliseconds } from "@/utils";
import type {
  ChatTurn,
  MessageListCursor,
  MessageResponseState,
} from "@/application/interfaces/repositories/message.repository";
import type {
  AiSessionResponseDto,
  MessageGenerationResponseDto,
  MessageResponseDto,
  MessageResponseStateDto,
  MessageTurnResponseDto,
} from "@/presentation/dtos/messages/message.dto";

function toAiSessionResponse(session: MessageChatRun): AiSessionResponseDto {
  return {
    id: session.id,
    status: session.status,
    resultMessageId: session.resultMessageId,
  };
}

function toMessageGenerationResponse(
  generation: MessageGeneration,
): MessageGenerationResponseDto {
  return {
    id: generation.id,
    triggerMessageId: generation.triggerMessageId,
    type: generation.type,
    status: generation.status,
    config: {
      aspectRatio: generation.config.aspectRatio,
      resolution: generation.config.resolution,
      outputCount: generation.config.outputCount,
      enhancePrompt: generation.config.enhancePrompt,
    },
    resultMessageId: generation.resultMessageId,
  };
}

export function toMessageResponse(message: Message): MessageResponseDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    assetIds: message.assetIds,
    generation: message.generation
      ? toMessageGenerationResponse(message.generation)
      : null,
    session: message.chatRun ? toAiSessionResponse(message.chatRun) : null,
    createdAt: toUnixMilliseconds(message.createdAt),
  };
}

export function toMessageResponseStateResponse(
  response: MessageResponseState,
): MessageResponseStateDto {
  return {
    session: toAiSessionResponse(response.chatRun),
    generation: response.generation
      ? toMessageGenerationResponse(response.generation)
      : null,
    assistantMessage: response.assistantMessage
      ? toMessageResponse(response.assistantMessage)
      : null,
  };
}

export function toMessageTurnResponse(turn: ChatTurn): MessageTurnResponseDto {
  return {
    userMessage: toMessageResponse(turn.userMessage),
    assistantMessage: turn.assistantMessage
      ? toMessageResponse(turn.assistantMessage)
      : null,
  };
}

export function toMessageListResponse(
  page: CursorPage<Message, MessageListCursor>,
): CursorListResponse<MessageResponseDto> {
  return {
    items: page.items.map(toMessageResponse),
    nextCursor: page.nextCursor
      ? encodeCursor({
          createdAt: page.nextCursor.createdAt.toISOString(),
          id: page.nextCursor.id,
        })
      : null,
  };
}
