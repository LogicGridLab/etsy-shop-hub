import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PLANS, openCheckout, type BillingVariant } from "@/lib/billing";
import { FREE_HISTORY_DAYS, FREE_SHOP_LIMIT, useShops } from "@/lib/shop-context";

const PRO = [
  "Unlimited shops",
  "Full order & expense history",
  "Consolidated multi-shop analytics",
  "True net profit with COGS",
  "Priority support",
];

const ORDER: BillingVariant[] = ["monthly", "annual", "lifetime"];

export function UpgradeModal() {
  const { upgradeOpen, setUpgradeOpen, plan } = useShops();
  const [waitlistFor, setWaitlistFor] = useState<BillingVariant | null>(null);

  function buy(variant: BillingVariant) {
    if (!openCheckout(variant)) setWaitlistFor(variant);
  }

  return (
    <>
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Upgrade to EtsyOps Pro
            </DialogTitle>
            <DialogDescription>
              {plan === "free"
                ? `You're on the Free plan: ${FREE_SHOP_LIMIT} shop and ${FREE_HISTORY_DAYS} days of data.`
                : "You're on Pro."}{" "}
              Pro unlocks every shop and your full history.
            </DialogDescription>
          </DialogHeader>

          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {PRO.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" />
                {f}
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-cols-3">
            {ORDER.map((v) => {
              const p = PLANS[v];
              const featured = v === "annual";
              return (
                <div
                  key={v}
                  className={`flex flex-col rounded-xl border p-4 ${featured ? "border-primary/60 bg-primary/5" : "border-border/60 bg-background/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{p.label}</h3>
                    {featured && <Badge className="text-[10px]">Best value</Badge>}
                    {v === "lifetime" && <Badge variant="secondary" className="text-[10px]">First 100</Badge>}
                  </div>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {p.price}
                    <span className="text-sm font-normal text-muted-foreground"> {p.cadence}</span>
                  </p>
                  <p className="mt-1 flex-1 text-xs leading-5 text-muted-foreground">{p.note}</p>
                  <Button className="mt-4 w-full" variant={featured ? "default" : "outline"} onClick={() => buy(v)}>
                    {v === "lifetime" ? "Claim lifetime deal" : "Choose plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <WaitlistDialog variant={waitlistFor} onClose={() => setWaitlistFor(null)} />
    </>
  );
}

function WaitlistDialog({ variant, onClose }: { variant: BillingVariant | null; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 255) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("waitlist").insert({ email: clean, plan: variant });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your spot — please try again.");
      return;
    }
    toast.success("You're on the list — we'll email your checkout link shortly.");
    setEmail("");
    onClose();
  }

  return (
    <Dialog open={variant !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Reserve your {variant ? PLANS[variant].label : "Pro"} spot</DialogTitle>
          <DialogDescription>
            Leave your email and we'll send your secure checkout link and lock in today's price.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wl-email">Email</Label>
            <Input id="wl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@shop.com" required maxLength={255} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Reserve my spot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
