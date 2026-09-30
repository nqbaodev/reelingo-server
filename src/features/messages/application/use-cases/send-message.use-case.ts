import {
  ChatProgressEventType,
  type ChatProgressObserver,
} from "../events/chat-progress";
import type { ChatTurn } from "../../infrastructure";
import type {
  CreateMessageCommand,
  CreateMessageUseCase,
} from "./create-message.use-case";
import type { GenerateAssistantResponseUseCase } from "./generate-assistant-response.use-case";

export class SendMessageUseCase {
  constructor(
    private readonly createMessage: CreateMessageUseCase,
    private readonly generateAssistantResponse: GenerateAssistantResponseUseCase,
  ) {}

  async execute(
    userId: number,
    command: CreateMessageCommand,
    observer: ChatProgressObserver,
  ): Promise<ChatTurn> {
    const { message, createdConversation } = await this.createMessage.execute(
      userId,
      command,
    );
    const runId = message.chatRun?.id;
    if (!runId) {
      throw new Error("Created user message has no chat run");
    }
    await observer.publish({
      type: ChatProgressEventType.MESSAGE_CREATED,
      message,
      createdConversation,
      runId,
    });
    return this.generateAssistantResponse.execute(
      {
        userId,
        conversationId: message.conversationId,
        triggerMessageId: message.id,
      },
      observer,
    );
  }
}
