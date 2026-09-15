import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireAuth } from "@/features/auth/presentation/require-auth";
import type {
  CreateConversationUseCase,
  ListConversationsUseCase,
  UpdateConversationNameUseCase,
} from "../application";
import {
  toConversationListResponse,
  toConversationResponse,
} from "./conversation.presenter";
import type {
  ConversationNameInput,
  ConversationParams,
  ListConversationsQuery,
} from "./conversation.validators";

interface ConversationControllerDeps {
  createConversation: CreateConversationUseCase;
  listConversations: ListConversationsUseCase;
  updateConversationName: UpdateConversationNameUseCase;
}

export class ConversationController {
  constructor(private readonly deps: ConversationControllerDeps) {}

  create = async (
    req: Request<ParamsDictionary, unknown, ConversationNameInput>,
    res: Response,
  ) => {
    const conversation = await this.deps.createConversation.execute(
      requireAuth(req).user.id,
      req.body.name,
    );
    sendSuccess(res, toConversationResponse(conversation), I18n.conversationCreated, 201);
  };

  list = async (req: Request, res: Response) => {
    const page = await this.deps.listConversations.execute(
      requireAuth(req).user.id,
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
      requireAuth(req).user.id,
      conversationId,
      req.body.name,
    );
    sendSuccess(res, toConversationResponse(conversation), I18n.updated);
  };
}
