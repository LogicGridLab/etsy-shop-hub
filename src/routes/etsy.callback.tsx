import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exchangeEtsyCode } from "@/lib/etsy-oauth.functions";
import { ETSY_CLIENT_ID, etsyRedirectUri } from "@/lib/etsy-oauth";
import { useShops } from "@/lib/shop-context";

export const Route = createFileRoute("/etsy/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connecting your Etsy shop — EtsyOps" },
      { name: "description", content: "Finishing the secure Etsy connection for your EtsyOps dashboard." },
      { property: "og:title", content: "Connecting your Etsy shop — EtsyOps" },
      { property: "og:description", content: "Finishing the secure Etsy connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EtsyCallback,
});

function EtsyCallback() {
  const exchange = useServerFn(exchangeEtsyCode);
  const navigate = useNavigate();
  const { setMockMode, refresh, completeOnboarding } = useShops();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const verifier = sessionStorage.getItem("etsy-pkce-verifier");
    if (params.get("error")) { setError("Etsy connection was cancelled."); return; }
    if (!code || !verifier || state !== sessionStorage.getItem("etsy-pkce-state")) {
      setError("This connection link has expired. Please try again.");
      return;
    }
    exchange({ data: { code, verifier, redirectUri: etsyRedirectUri(), clientId: ETSY_CLIENT_ID } })
      .then(() => {
        sessionStorage.removeItem("etsy-pkce-verifier");
        sessionStorage.removeItem("etsy-pkce-state");
        setMockMode(false);
        completeOnboarding();
        refresh();
        navigate({ to: "/" });
      })
      .catch(() => setError("We couldn't finish connecting to Etsy. Please try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild>
            <Link to="/settings">Back to Settings</Link>
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting your Etsy shop…</p>
        </>
      )}
    </div>
  );
}
