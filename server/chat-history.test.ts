import { describe, expect, it } from "vitest";
import { buildFedMemoryContext, buildMemoryContext, getConversationTitle, upsertConversation, type ChatHistoryConversation } from "../client/src/lib/chatHistory";

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

  it("retains per-response source sets when a conversation is stored", () => {
    const next: ChatHistoryConversation = {
      id: "sources",
      title: "Saved sources",
      messages: [{ role: "assistant", content: "Here are some sources." }],
      sourceSets: { 0: { query: "useful sources", results: [{ title: "Example", url: "https://example.com", domain: "example.com", snippet: "A source", favicon: "https://example.com/favicon.ico" }] } },
      updatedAt: 3,
    };
    expect(upsertConversation([], next)[0].sourceSets?.[0].results).toHaveLength(1);
  });

  it("builds bounded background memory without including the active thread", () => {
    const conversations: ChatHistoryConversation[] = [
      { id: "active", title: "Current", messages: [{ role: "user", content: "Current thread" }], updatedAt: 4 },
      { id: "recent", title: "Project notes", messages: [{ role: "user", content: "I prefer concise research." }, { role: "assistant", content: "I will keep it concise." }], updatedAt: 3 },
      { id: "older", title: "Ideas", messages: [{ role: "user", content: "Remember my calm writing style." }], updatedAt: 2 },
    ];
    const memory = buildMemoryContext(conversations, "active", 2);
    expect(memory).toContain("Project notes");
    expect(memory).toContain("calm writing style");
    expect(memory).not.toContain("Current thread");
  });

  it("uses only enabled fed-memory notes and bounds their reference context", () => {
    const fedMemory = buildFedMemoryContext([
      { id: "enabled", content: "I prefer grounded, concise recommendations.", enabled: true, updatedAt: 2 },
      { id: "paused", content: "This should not be passed along.", enabled: false, updatedAt: 1 },
    ]);
    expect(fedMemory).toContain("grounded, concise");
    expect(fedMemory).not.toContain("should not be passed");
  });
});
