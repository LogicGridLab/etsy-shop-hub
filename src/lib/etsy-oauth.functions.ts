import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Exchanges an Etsy OAuth code for tokens and resolves the seller's shop name. */
export const exchangeEtsyCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        code: z.string().min(1).max(2000),
        verifier: z.string().min(20).max(200),
        redirectUri: z.string().url().max(500),
        clientId: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const res = await fetch("https://api.etsy.com/v3/public/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: data.clientId,
        redirect_uri: data.redirectUri,
        code: data.code,
        code_verifier: data.verifier,
      }),
    });
    if (!res.ok) throw new Error(`Etsy sign-in failed [${res.status}]: ${await res.text()}`);
    const token = (await res.json()) as { access_token: string; refresh_token: string };
    const userId = token.access_token.split(".")[0];
    let shopName = "My Etsy Shop";
    const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
      headers: { "x-api-key": data.clientId, Authorization: `Bearer ${token.access_token}` },
    });
    if (shopRes.ok) {
      const shop = (await shopRes.json()) as { shop_name?: string };
      if (shop.shop_name) shopName = shop.shop_name;
    }
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await sb.from("shops").insert({ shop_name: shopName, api_key: token.access_token, sync_status: "synced" });
    if (error) throw new Error(error.message);
    return { shopName };
  });
