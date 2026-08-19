import { describe, expect, it, vi } from "vitest";

const invokeLLMMock = vi.hoisted(() => vi.fn());
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));

import { analyzeImage } from "./visualAssistant";

describe("visual assistant", () => {
  it("returns a grounded visual answer and a discovery phrase from the vision model", async () => {
    invokeLLMMock.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ answer: "I can see a red bicycle beside a brick wall.", discoveryQuery: "red bicycle brick wall photography" }) } }] });
    await expect(analyzeImage({ imageUrl: "https://example.com/image.jpg", prompt: "Identify this image" })).resolves.toEqual({ answer: "I can see a red bicycle beside a brick wall.", discoveryQuery: "red bicycle brick wall photography" });
    expect(invokeLLMMock).toHaveBeenCalledWith(expect.objectContaining({ messages: expect.arrayContaining([expect.objectContaining({ role: "user", content: expect.arrayContaining([expect.objectContaining({ type: "image_url" })]) })]) }));
  });
});
