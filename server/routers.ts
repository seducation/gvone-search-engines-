import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  assistant: router({
    chat: publicProcedure
      .input(z.object({ messages: z.array(chatMessageSchema).min(1).max(20) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are the character persona on an elegant, cinematic virtual assistant website. Speak warmly, naturally, and concisely. You are curious, reassuring, and gently playful without being childish. Never mention being an AI unless directly asked. Keep most answers to 1-3 short paragraphs. Ask a thoughtful follow-up when it helps the visitor. Avoid markdown headings and excessive formatting so your words feel like an intimate speech bubble.",
            },
            ...input.messages,
          ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          throw new Error("The assistant returned an empty response.");
        }
        return { content: content.trim() };
      }),
  }),
});

export type AppRouter = typeof appRouter;
