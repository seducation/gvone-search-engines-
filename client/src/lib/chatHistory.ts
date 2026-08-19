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

export type ChatHistoryConversation = {
  id: string;
  title: string;
  messages: ChatHistoryMessage[];
  sourceSets?: Record<number, ChatHistorySourceSet>;
  visualSets?: Record<number, ChatHistoryVisualSet>;
  updatedAt: number;
};

export function getConversationTitle(messages: ChatHistoryMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content?.trim() || "New conversation";
  return firstUserMessage.length > 42 ? `${firstUserMessage.slice(0, 42)}…` : firstUserMessage;
}

export function upsertConversation(conversations: ChatHistoryConversation[], next: ChatHistoryConversation, limit = 30): ChatHistoryConversation[] {
  return [next, ...conversations.filter((conversation) => conversation.id !== next.id)].slice(0, limit);
}
