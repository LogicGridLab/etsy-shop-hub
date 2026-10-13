import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useShops } from "@/lib/shop-context";
import { explainSecurityFindings } from "@/lib/security-review.functions";

export const Route = createFileRoute("/security-advisor")({
  head: () => ({
    meta: [
      { title: "Security Advisor — EtsyOps" },
      { name: "description", content: "Admin-only AI explanations and prioritized fixes for database security findings." },
      { property: "og:title", content: "Security Advisor — EtsyOps" },
      { property: "og:description", content: "AI-powered risk explanations for database security scan findings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityAdvisor,
});

function SecurityAdvisor() {
  const { isAdmin, userEmail } = useShops();
  const explain = useServerFn(explainSecurityFindings);
  const [findings, setFindings] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" />Admins only</CardTitle>
            <CardDescription>
              {userEmail ? "Your account doesn't have admin access." : "Sign in with Google as an admin to use the Security Advisor."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link to="/settings">Go to Settings</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function run() {
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const r = await explain({ data: { findings } });
      if (r.ok) setAnswer(r.text);
      else setError(r.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Security Advisor</h1>
        <p className="text-sm text-muted-foreground">Paste database security scan findings and get AI-powered risk explanations with prioritized fixes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan findings</CardTitle>
          <CardDescription>Paste the findings text (titles, severity, descriptions). Max 20,000 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={10}
            maxLength={20000}
            placeholder="e.g. CRITICAL: Table 'orders' is publicly readable and writable…"
          />
          <Button onClick={run} disabled={loading || !findings.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing…" : "Explain & prioritize"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
      {answer && (
        <Card>
          <CardHeader><CardTitle className="text-base">Risk analysis & remediation plan</CardTitle></CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{answer}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
