import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireCurrentUserId } from "@/features/auth/presentation/require-auth";
import type { CreateMessageUseCase, ListMessagesUseCase } from "../application";
import { toMessageListResponse, toMessageResponse } from "./message.presenter";
import type {
  CreateMessageBody,
  ListMessagesQuery,
  MessageConversationParams,
} from "./message.validators";

interface MessageControllerDeps {
  createMessage: CreateMessageUseCase;
  listMessages: ListMessagesUseCase;
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
