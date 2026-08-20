import { describe, expect, it } from "vitest";
import { buildReplyVisualDiscoveryPrompt } from "../client/src/lib/replyVisualDiscovery";

describe("reply visual discovery", () => {
  it("turns any assistant reply into a focused visual-discovery request", () => {
    expect(buildReplyVisualDiscoveryPrompt("A warm\neditorial visual direction.")).toBe("Find image references and a visual direction related to this gvone response: A warm editorial visual direction.");
  });

  it("bounds long reply text before sending a discovery request", () => {
    const prompt = buildReplyVisualDiscoveryPrompt("a".repeat(800));
    expect(prompt).toHaveLength("Find image references and a visual direction related to this gvone response: ".length + 520);
  });
});
