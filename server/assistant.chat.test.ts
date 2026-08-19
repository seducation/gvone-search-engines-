import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const invokeLLMMock = vi.hoisted(() => vi.fn());
const searchWebMock = vi.hoisted(() => vi.fn());
const analyzeImageMock = vi.hoisted(() => vi.fn());
const discoverImagesMock = vi.hoisted(() => vi.fn());
const storageGetSignedUrlMock = vi.hoisted(() => vi.fn());
const storagePutMock = vi.hoisted(() => vi.fn());
vi.mock("./_core/llm", () => ({ invokeLLM: invokeLLMMock }));
vi.mock("./webSearch", () => ({ searchWeb: searchWebMock }));
vi.mock("./visualAssistant", () => ({ analyzeImage: analyzeImageMock }));
vi.mock("./imageDiscovery", () => ({ discoverImages: discoverImagesMock }));
vi.mock("./storage", () => ({ storageGetSignedUrl: storageGetSignedUrlMock, storagePut: storagePutMock }));

describe("assistant.chat", () => {
  it("returns the character response from the LLM", async () => {
    invokeLLMMock.mockResolvedValueOnce({
      choices: [{ message: { content: "I’m here with you. Tell me more." } }],
    });
    searchWebMock.mockResolvedValueOnce([{ title: "Encouragement guide", url: "https://example.com", domain: "example.com", snippet: "A useful source.", favicon: "https://example.com/favicon.ico" }]);

    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } satisfies TrpcContext;

    const result = await appRouter.createCaller(ctx).assistant.chat({
      messages: [{ role: "user", content: "I need a little encouragement." }],
    });

    expect(result).toMatchObject({ content: "I’m here with you. Tell me more.", results: [{ title: "Encouragement guide", url: "https://example.com", domain: "example.com", snippet: "A useful source.", favicon: "https://example.com/favicon.ico" }], webError: null, visualResults: [], visualQuery: null, visualError: null });
    expect(invokeLLMMock).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "system", content: expect.stringContaining("cinematic virtual assistant website") }),
      ]),
    }));
  });

  it("surfaces a retryable web error without losing the assistant response", async () => {
    invokeLLMMock.mockResolvedValueOnce({ choices: [{ message: { content: "I’m still here." } }] });
    searchWebMock.mockRejectedValueOnce(new Error("temporary search outage"));
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const result = await appRouter.createCaller(ctx).assistant.chat({ messages: [{ role: "user", content: "Find me something useful." }] });
    expect(result).toMatchObject({ content: "I’m still here.", results: [], webError: "Website sources are temporarily unavailable." });
  });

  it("uses vision analysis and returns visual discoveries for an attached image", async () => {
    storageGetSignedUrlMock.mockResolvedValueOnce("https://storage.example/image.jpg");
    analyzeImageMock.mockResolvedValueOnce({ answer: "I can see a red bicycle.", discoveryQuery: "red bicycle street photography" });
    discoverImagesMock.mockResolvedValueOnce([{ title: "Red bicycle reference", url: "https://example.com/red-bike", domain: "example.com", caption: "A related visual reference.", imageUrl: "https://example.com/red-bike.jpg" }]);
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const result = await appRouter.createCaller(ctx).assistant.chat({ messages: [{ role: "user", content: "Identify this", image: { key: "visuals/red.jpg", url: "/manus-storage/visuals/red.jpg", name: "red.jpg" } }] });
    expect(result).toMatchObject({ content: "I can see a red bicycle.", visualQuery: "red bicycle street photography", visualResults: [{ title: "Red bicycle reference" }], visualError: null });
    expect(analyzeImageMock).toHaveBeenCalledWith({ imageUrl: "https://storage.example/image.jpg", prompt: "Identify this" });
  });

  it("returns visual references for a text prompt when image discovery is requested", async () => {
    invokeLLMMock.mockResolvedValueOnce({ choices: [{ message: { content: "Here are some visual directions to explore." } }] });
    searchWebMock.mockResolvedValueOnce([]);
    discoverImagesMock.mockResolvedValueOnce([{ title: "Studio lighting reference", url: "https://example.com/studio", domain: "example.com", caption: "A related visual direction.", imageUrl: "https://example.com/studio.jpg" }]);
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const result = await appRouter.createCaller(ctx).assistant.chat({ messages: [{ role: "user", content: "Find visual references for soft studio lighting." }], discoverVisuals: true });
    expect(result).toMatchObject({ content: "Here are some visual directions to explore.", visualQuery: "Find visual references for soft studio lighting.", visualResults: [{ title: "Studio lighting reference" }], visualError: null });
  });

  it("stores a supported visual attachment before vision analysis", async () => {
    storagePutMock.mockResolvedValueOnce({ key: "gvone-visuals/image_123.jpg", url: "/manus-storage/gvone-visuals/image_123.jpg" });
    const ctx = { user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
    const base64 = Buffer.from("small supported image payload").toString("base64");
    await expect(appRouter.createCaller(ctx).assistant.uploadImage({ name: "reference.jpg", mimeType: "image/jpeg", base64 })).resolves.toEqual({ key: "gvone-visuals/image_123.jpg", url: "/manus-storage/gvone-visuals/image_123.jpg", name: "reference.jpg" });
    expect(storagePutMock).toHaveBeenCalledWith(expect.stringContaining("gvone-visuals/"), expect.any(Buffer), "image/jpeg");
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
