import { describe, expect, it } from "vitest";
import { getConversationTitle, upsertConversation, type ChatHistoryConversation } from "../client/src/lib/chatHistory";

describe("chat history helpers", () => {
  it("uses the first user message as a readable conversation title", () => {
    expect(getConversationTitle([{ role: "assistant", content: "Welcome" }, { role: "user", content: "  Help me think through a new idea  " }])).toBe("Help me think through a new idea");
  });

  it("truncates long titles and keeps the newest session first", () => {
    const existing: ChatHistoryConversation = { id: "old", title: "Old", messages: [], updatedAt: 1 };
    const next: ChatHistoryConversation = { id: "new", title: "New", messages: [], updatedAt: 2 };
    expect(getConversationTitle([{ role: "user", content: "A".repeat(60) }])).toHaveLength(43);
    expect(upsertConversation([existing], next)).toEqual([next, existing]);
  });

  it("replaces an existing session and respects the retention limit", () => {
    const old = Array.from({ length: 3 }, (_, index) => ({ id: String(index), title: String(index), messages: [], updatedAt: index }));
    const replacement = { id: "1", title: "updated", messages: [], updatedAt: 9 };
    expect(upsertConversation(old, replacement, 3).map((item) => item.id)).toEqual(["1", "0", "2"]);
    expect(upsertConversation(old, { id: "new", title: "new", messages: [], updatedAt: 9 }, 3).map((item) => item.id)).toEqual(["new", "0", "1"]);
  });
});
