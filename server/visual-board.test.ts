import { describe, expect, it } from "vitest";
import { buildVisualBoardReferences } from "../client/src/lib/visualBoard";

describe("visual board references", () => {
  it("combines project-saved references with current discoveries without duplicate URLs", () => {
    const saved = [{ id: "saved-1", title: "Saved reference", url: "https://example.com/saved", imageUrl: "https://example.com/saved.jpg", domain: "example.com", caption: "Saved to the project", savedAt: 1 }];
    const current = [
      { title: "Duplicate discovery", url: "https://example.com/saved", imageUrl: "https://example.com/saved.jpg", domain: "example.com", caption: "Should not repeat" },
      { title: "Fresh discovery", url: "https://example.com/current", imageUrl: "https://example.com/current.jpg", domain: "example.com", caption: "Current discovery" },
    ];

    const references = buildVisualBoardReferences(saved, current);
    expect(references).toHaveLength(2);
    expect(references.map((reference) => reference.url)).toEqual(["https://example.com/saved", "https://example.com/current"]);
    expect(references[0]?.saved).toBe(true);
    expect(references[1]?.saved).toBe(false);
  });
});
