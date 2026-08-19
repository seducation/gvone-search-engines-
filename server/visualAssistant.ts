import { invokeLLM } from "./_core/llm";

export type VisualAnalysis = {
  answer: string;
  discoveryQuery: string;
};

function parseVisualAnalysis(content: string | undefined): VisualAnalysis {
  if (!content) throw new Error("Visual analysis returned an empty response.");
  const parsed = JSON.parse(content) as Partial<VisualAnalysis>;
  if (!parsed.answer?.trim() || !parsed.discoveryQuery?.trim()) throw new Error("Visual analysis returned an invalid response.");
  return { answer: parsed.answer.trim(), discoveryQuery: parsed.discoveryQuery.trim().slice(0, 180) };
}

export async function analyzeImage({ imageUrl, prompt }: { imageUrl: string; prompt: string }): Promise<VisualAnalysis> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are gvone, a calm and precise visual assistant. Describe only what is visibly supported by the image. Do not identify a person, guess identity, or infer sensitive traits, health, location, or private information. If the visitor asks for an identity, politely explain that you can describe visible details instead. Return a concise helpful answer plus a neutral, specific web-image discovery phrase.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt || "Identify the key visible objects, setting, and style in this image." },
          { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "gvone_visual_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            answer: { type: "string", description: "A concise, grounded visual identification response." },
            discoveryQuery: { type: "string", description: "A short neutral phrase for discovering related images and references." },
          },
          required: ["answer", "discoveryQuery"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = response.choices?.[0]?.message?.content;
  return parseVisualAnalysis(typeof content === "string" ? content : undefined);
}
