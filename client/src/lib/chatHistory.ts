export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  image?: { key: string; url: string; name: string };
};

export type ChatHistoryWebResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon: string;
};

export type ChatHistorySourceSet = {
  query: string;
  results: ChatHistoryWebResult[];
  error?: string;
};

export type ChatHistoryVisualResult = {
  title: string;
  url: string;
  domain: string;
  caption: string;
  imageUrl: string;
};

export type ChatHistoryVisualSet = {
  query: string;
  results: ChatHistoryVisualResult[];
  error?: string;
};

export type FedMemory = {
  id: string;
  content: string;
  enabled: boolean;
  scope: "global" | "chat";
  chatId?: string;
  updatedAt: number;
};

export type ChatHistoryThread = {
  parentConversationId: string;
  parentMessageIndex: number;
  anchorContent: string;
  createdAt: number;
};

export type ChatHistoryConversation = {
  id: string;
  title: string;
  messages: ChatHistoryMessage[];
  projectId?: string;
  studioId?: string;
  sourceSets?: Record<number, ChatHistorySourceSet>;
  visualSets?: Record<number, ChatHistoryVisualSet>;
  thread?: ChatHistoryThread;
  updatedAt: number;
};

export function getConversationTitle(messages: ChatHistoryMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content?.trim() || "New conversation";
  return firstUserMessage.length > 42 ? `${firstUserMessage.slice(0, 42)}…` : firstUserMessage;
}

export function upsertConversation(conversations: ChatHistoryConversation[], next: ChatHistoryConversation, limit = 30): ChatHistoryConversation[] {
  return [next, ...conversations.filter((conversation) => conversation.id !== next.id)].slice(0, limit);
}

export function buildReplyThreadMessages(messages: ChatHistoryMessage[], replyIndex: number): ChatHistoryMessage[] {
  return messages.slice(0, Math.max(0, replyIndex) + 1).map((message) => ({ ...message, image: message.image ? { ...message.image } : undefined }));
}

export function buildMemoryContext(conversations: ChatHistoryConversation[], activeId: string, limit = 4, maxChars = 5200): string {
  const relevant = conversations
    .filter((conversation) => conversation.id !== activeId && conversation.messages.some((message) => message.role === "user"))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .map((conversation) => {
      const excerpt = conversation.messages.slice(-4).map((message) => `${message.role === "user" ? "Visitor" : "gvone"}: ${message.content.trim()}`).join("\n");
      return `Previous conversation — ${conversation.title}:\n${excerpt}`;
    })
    .join("\n\n");
  return relevant.slice(0, maxChars);
}

export function getVisibleFedMemories(items: FedMemory[], activeChatId: string): FedMemory[] {
  return items.filter((item) => item.scope === "global" || item.chatId === activeChatId);
}

export function buildFedMemoryContext(items: FedMemory[], activeChatId: string, maxChars = 2800): string {
  const references = getVisibleFedMemories(items, activeChatId)
    .filter((item) => item.enabled && item.content.trim())
    .slice(0, 4)
    .map((item, index) => `${index + 1}. ${item.content.trim()}`)
    .join("\n");
  return references.slice(0, maxChars);
}

export function buildProjectContext(conversations: ChatHistoryConversation[], projectId: string, activeId: string, limit = 3, maxChars = 3400, studioId?: string): string {
  const sharedContext = conversations
    .filter((conversation) => conversation.projectId === projectId && (!studioId || conversation.studioId === studioId) && conversation.id !== activeId && conversation.messages.some((message) => message.role === "user"))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .map((conversation) => {
      const excerpt = conversation.messages.slice(-4).map((message) => `${message.role === "user" ? "Visitor" : "gvone"}: ${message.content.trim()}`).join("\n");
      return `Project chat — ${conversation.title}:\n${excerpt}`;
    })
    .join("\n\n");
  return sharedContext.slice(0, maxChars);
}
