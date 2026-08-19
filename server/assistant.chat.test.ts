import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const invokeLLMMock = vi.hoisted(() => vi.fn());
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));

describe("assistant.chat", () => {
  it("returns the character response from the LLM", async () => {
    invokeLLMMock.mockResolvedValueOnce({
      choices: [{ message: { content: "I’m here with you. Tell me more." } }],
    });

    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } satisfies TrpcContext;

    const result = await appRouter.createCaller(ctx).assistant.chat({
      messages: [{ role: "user", content: "I need a little encouragement." }],
    });

    expect(result).toEqual({ content: "I’m here with you. Tell me more." });
    expect(invokeLLMMock).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "system", content: expect.stringContaining("cinematic virtual assistant website") }),
      ]),
    }));
  });

  it("rejects blank messages before calling the model", async () => {
    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } satisfies TrpcContext;

    await expect(appRouter.createCaller(ctx).assistant.chat({
      messages: [{ role: "user", content: "" }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
