export const runtime = "nodejs";

interface CoreMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response("GROQ_API_KEY is missing on the server.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const body = await req.json().catch(() => ({}));
    const messages: CoreMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const model: string = body?.model || "llama-3.1-8b-instant";

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text().catch(() => "");
      return new Response(errTxt || `Groq request failed (${resp.status}).`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    const json = await resp.json();
    const text = json?.choices?.[0]?.message?.content || "";
    return new Response(text, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err: any) {
    const msg = err?.message || "Groq chat failed.";
    return new Response(msg, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}


