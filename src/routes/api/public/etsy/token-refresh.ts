import { createFileRoute } from "@tanstack/react-router";

// Called by the scheduled job every 50 minutes. Idempotent: only refreshes tokens about to expire.
export const Route = createFileRoute("/api/public/etsy/token-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!/^Bearer \S+$/.test(request.headers.get("authorization") ?? "")) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { refreshExpiringTokens } = await import("@/lib/etsy.server");
          return Response.json(await refreshExpiringTokens());
        } catch (e) {
          console.error("Token refresh job failed", e);
          return Response.json({ error: "refresh failed" }, { status: 500 });
        }
      },
    },
  },
});
