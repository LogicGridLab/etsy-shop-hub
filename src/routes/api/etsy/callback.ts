import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/etsy/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const done = (ok: boolean, reason?: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `/settings?connected=${ok ? 1 : 0}${reason ? `&reason=${reason}` : ""}`,
              "Set-Cookie": "etsy_pkce=; Path=/api/etsy; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
              "Cache-Control": "no-store",
            },
          });

        if (url.searchParams.get("error")) return done(false, "cancelled");
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookie = /(?:^|;\s*)etsy_pkce=([^;]+)/.exec(request.headers.get("cookie") ?? "")?.[1] ?? "";
        const [savedState, verifier] = cookie.split(".");
        if (!code || !state || !verifier || state !== savedState || code.length > 2000) return done(false, "expired");

        try {
          const etsy = await import("@/lib/etsy.server");
          const redirectUri = process.env["ETSY_REDIRECT_URI"] || `${url.origin}/api/etsy/callback`;
          const tokens = await etsy.exchangeCode(code, verifier, redirectUri);
          const etsyUserId = tokens.access_token.split(".")[0]!;
          const shop = await etsy.etsyGet<{ shop_id: number; shop_name: string }>(
            `/application/users/${encodeURIComponent(etsyUserId)}/shops`,
            tokens.access_token,
          );
          if (!shop?.shop_id) return done(false, "noshop");

          const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
          const marker = `etsy-oauth:${shop.shop_id}`;
          const { data: existing } = await sb.from("shops").select("id").eq("api_key", marker).maybeSingle();
          let shopRef = existing?.id;
          if (!shopRef) {
            const { data: created, error } = await sb
              .from("shops")
              .insert({ shop_name: shop.shop_name, api_key: marker, sync_status: "synced" })
              .select("id")
              .single();
            if (error) throw new Error(error.message);
            shopRef = created.id;
          } else {
            await sb.from("shops").update({ shop_name: shop.shop_name, sync_status: "synced" }).eq("id", shopRef);
          }

          const { error } = await sb.from("connected_shops").upsert(
            {
              shop_ref: shopRef,
              shop_name: shop.shop_name,
              shop_id: shop.shop_id,
              access_token_encrypted: await etsy.encryptToken(tokens.access_token),
              refresh_token_encrypted: await etsy.encryptToken(tokens.refresh_token),
              token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "shop_id" },
          );
          if (error) throw new Error(error.message);
          return done(true);
        } catch (e) {
          console.error("Etsy OAuth callback failed", e);
          return done(false, "failed");
        }
      },
    },
  },
});
