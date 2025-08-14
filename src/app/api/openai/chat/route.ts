import { openai, createOpenAI } from "@ai-sdk/openai";
import { convertToCoreMessages, generateText } from "ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("OPENAI_API_KEY is missing on the server.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    // If using a project-scoped key, ensure OPENAI_PROJECT is provided
    if (process.env.OPENAI_API_KEY?.startsWith('sk-proj-') && !process.env.OPENAI_PROJECT) {
      return new Response("OPENAI_PROJECT is required when using a project-scoped key (sk-proj-...). Add OPENAI_PROJECT=<your_project_id> to Replit Secrets.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const { model: requestedModel, messages } = await req.json();
    // Map friendly/alias model names to supported OpenAI models
    const modelAliasMap: Record<string, string> = {
      'gpt-5': 'gpt-4o',
      'gpt-4.1': 'gpt-4o',
      'chatgpt-4o-latest': 'gpt-4o',
    };
    const resolvedModel = modelAliasMap[String(requestedModel || '')] || requestedModel || 'gpt-4o';

    function extractError(err: any): string {
      const parts: string[] = [];
      if (err?.message) parts.push(String(err.message));
      // Vercel AI SDK and axios-like shapes
      const body = err?.cause?.response?.data || err?.response?.data || err?.data;
      if (typeof body === 'string' && body.trim()) { parts.push(body.trim()); }
      else if (body) { try { parts.push(JSON.stringify(body)); } catch {} }
      const status = err?.status || err?.cause?.status || err?.response?.status;
      if (status) parts.push(`status=${status}`);
      return parts.filter(Boolean).join(' | ');
    }

    // Normalize env to avoid whitespace/quotes mismatches
    const openaiProject = process.env.OPENAI_PROJECT?.trim().replace(/^"|"$/g, '');
    const openaiOrg = (process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION)?.trim().replace(/^"|"$/g, '');

    // Build a provider instance when using project/org options
    const oai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      organization: openaiOrg,
      project: openaiProject,
    });

    async function tryModel(modelName: string) {
      try {
        const { text } = await generateText({
          model: oai(modelName),
          messages: convertToCoreMessages(messages),
          system: "You are a helpful AI assistant",
        });
        return text;
      } catch (err: any) {
        throw new Error(extractError(err));
      }
    }

    let text: string | undefined;
    const firstChoice = resolvedModel || "gpt-4o";
    const fallbackChoice = firstChoice === "gpt-4o-mini" ? "gpt-4o" : "gpt-4o-mini";
    try {
      text = await tryModel(firstChoice);
    } catch (e: any) {
      // quota or permission → fallback to smaller model
      const msg1 = e?.message || ''
      if (/mismatched_project|OpenAI-Project header should match project/i.test(msg1)) {
        const hint = `OpenAI project mismatch. Ensure OPENAI_PROJECT matches the project id of your API key (proj_...). Current header value: ${process.env.OPENAI_PROJECT || 'NONE'}.`;
        return new Response(hint, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      const shouldFallback = /quota|rate limit|insufficient_quota|insufficient_quota/i.test(msg1);
      if (shouldFallback) {
        try {
          text = await tryModel(fallbackChoice);
        } catch (e2: any) {
          const msg = e2?.message || msg1 || "Failed to generate AI response.";
          return new Response(msg, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      } else {
        const msg = msg1 || "Failed to generate AI response.";
        return new Response(msg, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    }

    return new Response(text || "", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err: any) {
    console.error("/api/openai/chat failed:", err);
    const message = err?.message || "Failed to generate AI response. Check API key and model access.";
    return new Response(message, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
