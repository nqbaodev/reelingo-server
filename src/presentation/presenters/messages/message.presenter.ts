import {
  encodeCursor,
  type CursorListResponse,
  type CursorPage,
} from "@/application/pagination";
import type { Message } from "@/domain";
import type {
  ChatTurn,
  MessageListCursor,
  MessageResponseState,
} from "@/application/interfaces/repositories/message.repository";
import type {
  MessageResponseDto,
  MessageResponseStateDto,
  MessageTurnResponseDto,
} from "@/presentation/dtos/messages/message.dto";

export function toMessageResponse(message: Message): MessageResponseDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    assetIds: message.assetIds,
    generation: message.generation,
    chatRun: message.chatRun,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toMessageResponseStateResponse(
  response: MessageResponseState,
): MessageResponseStateDto {
  return {
    chatRun: response.chatRun,
    generation: response.generation,
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
