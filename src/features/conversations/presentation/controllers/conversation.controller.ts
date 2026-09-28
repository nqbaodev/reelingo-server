import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { sendSuccess } from "@/core/http";
import { I18n } from "@/core/i18n";
import { requireCurrentUserId } from "@/features/auth/presentation/require-auth";
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
  ConversationNameRequestDto,
  ConversationParamsDto,
  CreateConversationRequestDto,
  ListConversationsQueryDto,
} from "../dtos/conversation.dto";

interface ConversationControllerDeps {
  createConversation: CreateConversationUseCase;
  listConversations: ListConversationsUseCase;
  updateConversationName: UpdateConversationNameUseCase;
}

export class ConversationController {
  constructor(private readonly deps: ConversationControllerDeps) {}

  create = async (
    req: Request<ParamsDictionary, unknown, CreateConversationRequestDto>,
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
      req.validatedQuery as ListConversationsQueryDto,
    );
    sendSuccess(res, toConversationListResponse(page));
  };

  updateName = async (
    req: Request<ParamsDictionary, unknown, ConversationNameRequestDto>,
    res: Response,
  ) => {
    const { conversationId } = req.params as ConversationParamsDto;
    const conversation = await this.deps.updateConversationName.execute(
      requireCurrentUserId(req),
      conversationId,
      req.body.name,
    );
    sendSuccess(res, toConversationResponse(conversation), I18n.updated);
  };
}
