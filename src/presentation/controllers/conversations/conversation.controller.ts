import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { sendSuccess } from "@/presentation/http";
import { I18n } from "@/application/i18n";
import { requireCurrentUserId } from "@/presentation/middlewares/auth/require-auth";
import type {
  ListConversationsUseCase,
  UpdateConversationNameUseCase,
} from "@/application/use-cases/conversations";
import {
  toConversationListResponse,
  toConversationResponse,
} from "@/presentation/presenters/conversations/conversation.presenter";
import type {
  ConversationNameRequestDto,
  ConversationParamsDto,
  ListConversationsQueryDto,
  ProjectConversationParamsDto,
} from "@/presentation/dtos/conversations/conversation.dto";

interface ConversationControllerDeps {
  listConversations: ListConversationsUseCase;
  updateConversationName: UpdateConversationNameUseCase;
}

export class ConversationController {
  constructor(private readonly deps: ConversationControllerDeps) {}

  list = async (req: Request, res: Response) => {
    const { projectId } = req.params as ProjectConversationParamsDto;
    const page = await this.deps.listConversations.execute(
      requireCurrentUserId(req),
      projectId,
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
