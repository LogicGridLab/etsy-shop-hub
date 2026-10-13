import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const INSTRUCTIONS = `You are a senior database security engineer reviewing findings from a database security scan of a small SaaS app (Postgres with row-level security).
For the findings provided, respond in plain Markdown with:
1. **Summary** — 2-3 sentences on overall risk.
2. **Prioritized remediation** — a numbered list ordered by severity (Critical, High, Medium, Low). For each: the finding, why it is risky in plain language (what an attacker could do), and concrete fix steps (e.g. the RLS policy or SQL change).
3. **Quick wins** — short bullet list of the fastest fixes.
Be concise and practical. Do not invent findings that were not provided.`;

export const explainSecurityFindings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { findings: string }) => {
    const findings = String(input?.findings ?? "").trim();
    if (!findings) throw new Error("Please paste at least one finding.");
    if (findings.length > 20000) throw new Error("Findings are too long (max 20,000 characters).");
    return { findings };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_current_user_admin");
    if (isAdmin !== true) return { ok: false as const, error: "Only admins can use the security advisor." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI is not configured for this app." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    let failure: unknown = null;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: INSTRUCTIONS,
      messages: [{ role: "user", content: `Security scan findings:\n\n${data.findings}` }],
      maxRetries: 0,
      onError: ({ error }) => {
        failure = error;
      },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    try {
      const text = await result.text;
      if (failure) throw failure;
      if (!text.trim()) return { ok: false as const, error: "The AI returned no answer for these findings." };
      return { ok: true as const, text };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("Security advisor AI error", e);
      if (status === 429) return { ok: false as const, error: "Too many requests — please wait a moment and try again." };
      if (status === 402) return { ok: false as const, error: "AI credits are used up. Add credits in your workspace to continue." };
      if (status === 403) return { ok: false as const, error: "AI access is blocked for this workspace." };
      return { ok: false as const, error: "The AI couldn't analyze these findings. Please try again later." };
    }
  });
