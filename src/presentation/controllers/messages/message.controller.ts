import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError, ServiceUnavailableError } from "@/application/errors";
import { sendSuccess } from "@/presentation/http";
import { I18n } from "@/application/i18n";
import { ChatUnavailableError } from "@/application/interfaces/ai/chat.client";
import { requireCurrentUserId } from "@/presentation/middlewares/auth/require-auth";
import { toConversationResponse } from "@/presentation/presenters/conversations/conversation.presenter";
import { ServerSentEventStream } from "@/presentation/http/server-sent-event-stream";
import type {
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  SendMessageUseCase,
} from "@/application/use-cases/messages";
import {
  ChatProgressEventType,
  type ChatProgressEvent,
  type ChatProgressObserver,
} from "@/application/events/messages";
import type {
  ListMessagesQueryDto,
  MessageConversationParamsDto,
  MessageResponseParamsDto,
  SendMessageRequestDto,
} from "@/presentation/dtos/messages/message.dto";
import {
  toMessageListResponse,
  toMessageResponse,
  toMessageResponseStateResponse,
  toMessageTurnResponse,
} from "@/presentation/presenters/messages/message.presenter";

interface MessageControllerDeps {
  getMessageResponse: GetMessageResponseUseCase;
  listMessages: ListMessagesUseCase;
  sendMessage: SendMessageUseCase;
}

export class MessageController {
  constructor(private readonly deps: MessageControllerDeps) {}

  send = async (
    req: Request<ParamsDictionary, unknown, SendMessageRequestDto>,
    res: Response,
  ) => {
    const userId = requireCurrentUserId(req);
    await this.streamMessageResponse(req, res, userId, req.body);
  };

  private async streamMessageResponse(
    req: Request,
    res: Response,
    userId: number,
    command: SendMessageRequestDto,
  ): Promise<void> {
    const stream = createEventStream(req, res);
    const observer: ChatProgressObserver = {
      publish: async (event) => {
        try {
          await publishProgressEvent(stream, event);
        } catch (err) {
          req.log.error(
            { err, eventType: event.type },
            "Failed to publish chat progress",
          );
          await stream.end();
        }
      },
    };

    try {
      await this.deps.sendMessage.execute(userId, command, observer);
      await stream.end();
    } catch (err) {
      if (stream.isClosed) {
        req.log.error({ err }, "Assistant response failed after the event stream closed");
        return;
      }
      if (stream.isIdle) {
        throw toHttpError(err);
      }

      req.log.error({ err }, "Streaming assistant response failed");
      await stream.sendJson(MessageStreamEvent.FAILED, toStreamFailure(err));
      await stream.end();
    }
  }

  getResponse = async (req: Request, res: Response) => {
    const { conversationId, messageId } = req.params as MessageResponseParamsDto;
    const response = await this.deps.getMessageResponse.execute(
      requireCurrentUserId(req),
      conversationId,
      messageId,
    );
    res.setHeader("Cache-Control", "no-store");
    sendSuccess(res, toMessageResponseStateResponse(response));
  };

  list = async (req: Request, res: Response) => {
    const { conversationId } = req.params as MessageConversationParamsDto;
    const page = await this.deps.listMessages.execute(
      requireCurrentUserId(req),
      conversationId,
      req.validatedQuery as ListMessagesQueryDto,
    );
    sendSuccess(res, toMessageListResponse(page));
  };
}

function createEventStream(req: Request, res: Response): ServerSentEventStream {
  return new ServerSentEventStream(res, {
    onError: (err) => req.log.error({ err }, "SSE transport failed"),
  });
}

const STREAM_EVENT_VERSION = 1;
const MessageStreamEvent = {
  MESSAGE_CREATED: "message.created",
  STARTED: "chat.started",
  TEXT_DELTA: "assistant.delta",
  GENERATION_QUEUED: "generation.queued",
  COMPLETED: "chat.completed",
  FAILED: "chat.failed",
} as const;

async function publishProgressEvent(
  stream: ServerSentEventStream,
  event: ChatProgressEvent,
): Promise<void> {
  switch (event.type) {
    case ChatProgressEventType.MESSAGE_CREATED:
      await stream.sendJson(MessageStreamEvent.MESSAGE_CREATED, {
        v: STREAM_EVENT_VERSION,
        conversationId: event.message.conversationId,
        messageId: event.message.id,
        runId: event.runId,
        message: toMessageResponse(event.message),
        createdConversation: event.createdConversation
          ? toConversationResponse(event.createdConversation)
          : null,
      });
      return;
    case ChatProgressEventType.STARTED:
      await stream.sendJson(MessageStreamEvent.STARTED, {
        v: STREAM_EVENT_VERSION,
        runId: event.runId,
      });
      return;
    case ChatProgressEventType.TEXT_DELTA:
      await stream.sendJson(MessageStreamEvent.TEXT_DELTA, {
        v: STREAM_EVENT_VERSION,
        delta: event.delta,
      });
      return;
    case ChatProgressEventType.GENERATION_QUEUED:
      await stream.sendJson(MessageStreamEvent.GENERATION_QUEUED, {
        v: STREAM_EVENT_VERSION,
        generation: event.generation,
      });
      return;
    case ChatProgressEventType.COMPLETED:
      await stream.sendJson(MessageStreamEvent.COMPLETED, {
        v: STREAM_EVENT_VERSION,
        conversationId: event.turn.userMessage.conversationId,
        messageId: event.turn.userMessage.id,
        assistantMessageId: event.turn.assistantMessage?.id ?? null,
        runId: event.runId,
        ...toMessageTurnResponse(event.turn),
      });
  }
}

function toHttpError(err: unknown): unknown {
  return err instanceof ChatUnavailableError
    ? new ServiceUnavailableError(I18n.serviceUnavailable, {
        params: { service: "AI chat" },
        cause: err,
      })
    : err;
}

function toStreamFailure(err: unknown) {
  if (err instanceof ChatUnavailableError) {
    return {
      v: STREAM_EVENT_VERSION,
      code: "SERVICE_UNAVAILABLE",
      retryable: true,
    };
  }
  if (err instanceof AppError) {
    return {
      v: STREAM_EVENT_VERSION,
      code: err.code,
      retryable: err.statusCode === 409 || err.statusCode >= 500,
    };
  }

  return {
    v: STREAM_EVENT_VERSION,
    code: "INTERNAL_SERVER_ERROR",
    retryable: true,
  };
}
