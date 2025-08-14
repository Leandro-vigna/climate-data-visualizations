import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, generateText } from "ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return a helpful message so the client can surface it without HTML noise
      return new Response("ANTHROPIC_API_KEY is missing on the server.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    const { messages } = await req.json();
    const { text } = await generateText({
      model: anthropic("claude-3-5-sonnet-20240620"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });
    return new Response(text, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err: any) {
    console.error("/api/anthropic/chat failed:", err);
    return new Response(err?.message || "Anthropic request failed", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
