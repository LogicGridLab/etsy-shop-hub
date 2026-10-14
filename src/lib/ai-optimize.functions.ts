import { createServerFn } from "@tanstack/react-start";

export interface AiOptimizeResult {
  optimized_title: string;
  tags: string[];
  description: string;
  materials: string[];
}

export const aiOptimize = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string; tags?: string[] }) => {
    const title = String(input?.title ?? "").trim().slice(0, 300);
    if (!title) throw new Error("Title is required.");
    const tags = (Array.isArray(input?.tags) ? input.tags : []).map((t) => String(t).slice(0, 40)).slice(0, 20);
    return { title, tags };
  })
  .handler(async ({ data }): Promise<{ ok: true; result: AiOptimizeResult } | { ok: false; error: string }> => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) return { ok: false, error: "AI Premium isn't set up yet — the Groq key is missing." };

    const prompt = `You are Etsy SEO expert, generate optimized_title (140 chars), 13 tags (<=20 chars each), description (150 words), materials (5 items) for title: ${data.title}.${
      data.tags.length ? ` Current tags: ${data.tags.join(", ")}.` : ""
    } Return JSON only with keys optimized_title, tags, description, materials.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      console.error("Groq error", res.status, await res.text());
      if (res.status === 401) return { ok: false, error: "The Groq key was rejected. Please check it." };
      if (res.status === 429) return { ok: false, error: "Too many requests — try again in a moment." };
      return { ok: false, error: "The AI couldn't optimize this listing. Try again later." };
    }
    try {
      const json = await res.json();
      const p = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
      return {
        ok: true,
        result: {
          optimized_title: String(p.optimized_title ?? "").slice(0, 140),
          tags: (Array.isArray(p.tags) ? p.tags : []).map((t: unknown) => String(t).slice(0, 20)).slice(0, 13),
          description: String(p.description ?? ""),
          materials: (Array.isArray(p.materials) ? p.materials : []).map(String).slice(0, 5),
        },
      };
    } catch {
      return { ok: false, error: "The AI returned an unreadable answer. Try again." };
    }
  });
