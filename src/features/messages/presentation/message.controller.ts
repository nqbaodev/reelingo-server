import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ServiceUnavailableError } from "@/core/errors";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { ChatUnavailableError } from "@/features/ai/infrastructure";
import { requireCurrentUserId } from "@/features/auth/presentation/require-auth";
import type {
  CreateMessageUseCase,
  GetMessageResponseUseCase,
  ListMessagesUseCase,
  RespondToMessageUseCase,
} from "../application";
import {
  toMessageListResponse,
  toMessageResponse,
  toMessageResponseStateResponse,
  toMessageTurnResponse,
} from "./message.presenter";
import type {
  CreateMessageBody,
  ListMessagesQuery,
  MessageConversationParams,
  MessageResponseParams,
} from "./message.validators";

interface MessageControllerDeps {
  createMessage: CreateMessageUseCase;
  getMessageResponse: GetMessageResponseUseCase;
  listMessages: ListMessagesUseCase;
  respondToMessage: RespondToMessageUseCase;
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
    const { conversationId, messageId } = req.params as MessageResponseParams;
    try {
      const turn = await this.deps.respondToMessage.execute(
        requireCurrentUserId(req),
        conversationId,
        messageId,
      );
      sendSuccess(res, toMessageTurnResponse(turn));
    } catch (err) {
      throw err instanceof ChatUnavailableError
        ? new ServiceUnavailableError(I18n.serviceUnavailable, {
            params: { service: "AI chat" },
            cause: err,
          })
        : err;
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
