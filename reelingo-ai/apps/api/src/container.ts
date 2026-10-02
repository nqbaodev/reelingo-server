import { GeminiConversationAgent } from "@reelingo/agent-core/providers/gemini-conversation.agent";
import { RespondToChatWorkflow } from "@reelingo/agent-core/workflows/respond-to-chat.workflow";
import { config } from "./config/app-config";
import { createChatRouter } from "./http/chat.routes";

export function createContainer() {
  const agent = new GeminiConversationAgent(config.gemini);
  const respondToChat = new RespondToChatWorkflow(agent);

  return {
    chatRouter: createChatRouter(respondToChat, config.server.serviceToken),
  };
}
