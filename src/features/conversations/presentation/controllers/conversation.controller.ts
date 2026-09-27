import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireCurrentUserId } from "@/features/auth/presentation/authentication/require-auth";
import type {
  CreateConversationUseCase,
  ListConversationsUseCase,
  UpdateConversationNameUseCase,
} from "../../application";
import {
  toConversationListResponse,
  toConversationResponse,
} from "../presenters/conversation.presenter";
import type {
  CreateConversationBody,
  ConversationNameInput,
  ConversationParams,
  ListConversationsQuery,
} from "../validators/conversation.validators";

interface ConversationControllerDeps {
  createConversation: CreateConversationUseCase;
  listConversations: ListConversationsUseCase;
  updateConversationName: UpdateConversationNameUseCase;
}

export class ConversationController {
  constructor(private readonly deps: ConversationControllerDeps) {}

  create = async (
    req: Request<ParamsDictionary, unknown, CreateConversationBody>,
    res: Response,
  ) => {
    const conversation = await this.deps.createConversation.execute(
      requireCurrentUserId(req),
      req.body.content,
    );
    sendSuccess(res, toConversationResponse(conversation), I18n.conversationCreated, 201);
  };

  list = async (req: Request, res: Response) => {
    const page = await this.deps.listConversations.execute(
      requireCurrentUserId(req),
      req.validatedQuery as ListConversationsQuery,
    );
    sendSuccess(res, toConversationListResponse(page));
  };

  updateName = async (
    req: Request<ParamsDictionary, unknown, ConversationNameInput>,
    res: Response,
  ) => {
    const { conversationId } = req.params as ConversationParams;
    const conversation = await this.deps.updateConversationName.execute(
      requireCurrentUserId(req),
      conversationId,
      req.body.name,
    );
    sendSuccess(res, toConversationResponse(conversation), I18n.updated);
  };
}
