import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — EtsyOps" },
      { name: "description", content: "Completing your EtsyOps sign-in." },
      { property: "og:title", content: "Signing you in — EtsyOps" },
      { property: "og:description", content: "Completing your EtsyOps sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/settings";
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setError(error.message); return; }
      }
      navigate({ to: target as "/settings", replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {error ? `Sign-in failed: ${error}` : "Signing you in…"}
      </p>
    </div>
  );
}
