import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { AppError, ServiceUnavailableError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { ChatUnavailableError } from "@/features/ai/infrastructure";
import {
  AiGenerationEventType,
  type AiGenerationEvent,
  type AiGenerationEvents,
} from "@/features/ai/application";
import { requireCurrentUserId } from "@/features/auth/presentation/authentication/require-auth";
import { ServerSentEventStream } from "@/shared/http/server-sent-event-stream";
import type {
  ChatProgressEvent,
  ChatProgressObserver,
  CreateMessageUseCase,
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  RespondToMessageUseCase,
} from "../../application";
import { ChatProgressEventType } from "../../application";
import {
  toMessageListResponse,
  toMessageResponse,
  toMessageResponseStateResponse,
  toMessageTurnResponse,
} from "../presenters/message.presenter";
import type {
  CreateMessageBody,
  ListMessagesQuery,
  MessageConversationParams,
  MessageResponseParams,
} from "../validators/message.validators";

interface MessageControllerDeps {
  createMessage: CreateMessageUseCase;
  getMessageResponse: GetMessageResponseUseCase;
  listMessages: ListMessagesUseCase;
  respondToMessage: RespondToMessageUseCase;
  generationEvents: AiGenerationEvents;
}

export class MessageController {
  constructor(private readonly deps: MessageControllerDeps) {}

  create = async (
    req: Request<ParamsDictionary, unknown, CreateMessageBody>,
    res: Response,
  ) => {
    const { conversationId } = req.params as MessageConversationParams;
    const message = await this.deps.createMessage.execute(
      requireCurrentUserId(req),
      conversationId,
      req.body,
    );
    sendSuccess(res, toMessageResponse(message), I18n.messageSent, 201);
  };

  respond = async (req: Request, res: Response) => {
    res.vary("Accept");
    if (acceptsEventStream(req)) {
      await this.respondWithEventStream(req, res);
      return;
    }

    const { conversationId, messageId } = req.params as MessageResponseParams;
    try {
      const turn = await this.deps.respondToMessage.execute(
        requireCurrentUserId(req),
        conversationId,
        messageId,
      );
      sendSuccess(res, toMessageTurnResponse(turn));
    } catch (err) {
      throw toHttpError(err);
    }
  };

  private respondWithEventStream = async (req: Request, res: Response) => {
    const { conversationId, messageId } = req.params as MessageResponseParams;
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
      await this.deps.respondToMessage.execute(
        requireCurrentUserId(req),
        conversationId,
        messageId,
        observer,
      );
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
  };

  getResponse = async (req: Request, res: Response) => {
    const { conversationId, messageId } = req.params as MessageResponseParams;
    const response = await this.deps.getMessageResponse.execute(
      requireCurrentUserId(req),
      conversationId,
      messageId,
    );
    res.setHeader("Cache-Control", "no-store");
    sendSuccess(res, toMessageResponseStateResponse(response));
  };

  events = async (req: Request, res: Response) => {
    const stream = createEventStream(req, res);
    const userId = requireCurrentUserId(req);
    const unsubscribe = this.deps.generationEvents.subscribe(userId, (event) => {
      void publishGenerationEvent(stream, event).catch(async (err: unknown) => {
        req.log.error(
          { err, eventType: event.type },
          "Failed to publish AI generation event",
        );
        await stream.end();
      });
    });

    try {
      await stream.sendJson(MessageStreamEvent.CONNECTED, {
        v: STREAM_EVENT_VERSION,
      });
      await stream.waitUntilClosed();
    } finally {
      unsubscribe();
    }
  };

  list = async (req: Request, res: Response) => {
    const { conversationId } = req.params as MessageConversationParams;
    const page = await this.deps.listMessages.execute(
      requireCurrentUserId(req),
      conversationId,
      req.validatedQuery as ListMessagesQuery,
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
  CONNECTED: "stream.connected",
  STARTED: "chat.started",
  TEXT_DELTA: "assistant.delta",
  GENERATION_QUEUED: "generation.queued",
  COMPLETED: "chat.completed",
  FAILED: "chat.failed",
  GENERATION_COMPLETED: "generation.completed",
  GENERATION_FAILED: "generation.failed",
} as const;

async function publishGenerationEvent(
  stream: ServerSentEventStream,
  event: AiGenerationEvent,
): Promise<void> {
  switch (event.type) {
    case AiGenerationEventType.COMPLETED:
      await stream.sendJson(MessageStreamEvent.GENERATION_COMPLETED, {
        v: STREAM_EVENT_VERSION,
        generationId: event.generationId,
        message: toMessageResponse(event.message),
      });
      return;
    case AiGenerationEventType.FAILED:
      await stream.sendJson(MessageStreamEvent.GENERATION_FAILED, {
        v: STREAM_EVENT_VERSION,
        generationId: event.generationId,
        conversationId: event.conversationId,
        triggerMessageId: event.triggerMessageId,
      });
  }
}

async function publishProgressEvent(
  stream: ServerSentEventStream,
  event: ChatProgressEvent,
): Promise<void> {
  switch (event.type) {
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
        ...toMessageTurnResponse(event.turn),
      });
  }
}

function acceptsEventStream(req: Request): boolean {
  const accept = req.get("accept");
  if (!accept) return false;

  return accept.split(",").some((range) => {
    const [mediaType, ...parameters] = range
      .split(";")
      .map((part) => part.trim().toLowerCase());
    if (mediaType !== "text/event-stream") return false;

    const quality = parameters.find((parameter) => parameter.startsWith("q="));
    return quality === undefined || Number(quality.slice(2)) !== 0;
  });
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
