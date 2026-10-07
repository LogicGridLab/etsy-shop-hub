import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  license_key: z.string().trim().min(8).max(200),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

interface LsValidate {
  valid: boolean;
  error?: string | null;
  license_key?: { status?: string };
  meta?: { variant_name?: string; customer_email?: string };
}

/** Validates a Lemon Squeezy license key server-side and records it. */
export const validateLicense = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: data.license_key }),
    });
    const body = (await res.json().catch(() => ({}))) as LsValidate;
    const valid = res.ok && body.valid === true;
    const status = valid ? "active" : (body.license_key?.status ?? "invalid");
    const email = data.email || body.meta?.customer_email || null;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("licenses").upsert(
        {
          license_key: data.license_key,
          email,
          status,
          variant: body.meta?.variant_name ?? null,
          validated_at: new Date().toISOString(),
        },
        { onConflict: "license_key" },
      );
    } catch (e) {
      console.error("License record failed", e);
    }

    return {
      valid,
      status,
      variant: body.meta?.variant_name ?? null,
      email,
      error: valid ? null : (body.error ?? "This license key isn't valid."),
    };
  });
