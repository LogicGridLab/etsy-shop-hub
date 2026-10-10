import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/etsy/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { base64Url, etsyClientId } = await import("@/lib/etsy.server");
        let clientId: string;
        try {
          clientId = etsyClientId();
        } catch {
          return Response.redirect(new URL("/settings?connected=0&reason=config", request.url).toString(), 302);
        }
        const origin = new URL(request.url).origin;
        const redirectUri = process.env["ETSY_REDIRECT_URI"] || `${origin}/api/etsy/callback`;
        const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
        const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
        const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));

        const url = new URL("https://www.etsy.com/oauth/connect");
        url.searchParams.set("response_type", "code");
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("scope", "shops_r listings_r transactions_r transactions_w profile_r");
        url.searchParams.set("state", state);
        url.searchParams.set("code_challenge", challenge);
        url.searchParams.set("code_challenge_method", "S256");

        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
            "Set-Cookie": `etsy_pkce=${state}.${verifier}; Path=/api/etsy; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
