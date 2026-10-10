import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useShops } from "@/lib/shop-context";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome to EtsyOps Pro" },
      { name: "description", content: "Activating your EtsyOps Pro license." },
      { property: "og:title", content: "Welcome to EtsyOps Pro" },
      { property: "og:description", content: "Activating your EtsyOps Pro license." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { activateLicense, completeOnboarding } = useShops();
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const key = p.get("license") ?? "";
    const email = p.get("email") ?? "";
    if (!key) {
      setState("error");
      setMsg("No license key was found in this link. You can paste it in Settings & API Setup.");
      return;
    }
    activateLicense(key, email).then((r) => {
      if (r.ok) {
        setState("ok");
        completeOnboarding();
        toast.success("EtsyOps Pro unlocked — thank you!");
        setTimeout(() => navigate({ to: "/" }), 1500);
      } else {
        setState("error");
        setMsg(r.error ?? "We couldn't activate this license.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center gap-4 p-6 text-center">
      {state === "working" && (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Activating your EtsyOps Pro license…</p>
        </>
      )}
      {state === "ok" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-profit" />
          <h1 className="font-display text-2xl font-bold">Welcome to EtsyOps Pro</h1>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
        </>
      )}
      {state === "error" && (
        <>
          <p className="max-w-md text-sm text-muted-foreground">{msg}</p>
          <Button asChild>
            <Link to="/settings">Enter license key</Link>
          </Button>
        </>
      )}
    </div>
  );
}
