import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEMON_CHECKOUT_URL, openCheckout } from "@/lib/billing";
import { FREE_HISTORY_DAYS, FREE_SHOP_LIMIT, useShops } from "@/lib/shop-context";

const FREE = [`${FREE_SHOP_LIMIT} connected shop`, `${FREE_HISTORY_DAYS} days of history`, "Demo data mode", "CSV export"];
const PRO = [
  "Unlimited shops",
  "Full order & expense history",
  "Consolidated multi-shop analytics",
  "Listing performance & ad spend tracking",
  "Priority support",
];

export function UpgradeModal() {
  const { upgradeOpen, setUpgradeOpen, plan } = useShops();

  function buy(variant: "monthly" | "lifetime") {
    if (!openCheckout(variant)) {
      toast.error("Checkout link isn't configured yet — add your Lemon Squeezy URL in Settings & API Setup.");
    }
  }

  return (
    <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade to EtsyOps Pro
          </DialogTitle>
          <DialogDescription>
            You're on the Free plan: {FREE_SHOP_LIMIT} shop and {FREE_HISTORY_DAYS} days of data. Pro unlocks every shop
            and your full history.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/40 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Free</h3>
              {plan === "free" && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
            </div>
            <p className="mt-1 font-display text-2xl font-bold">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {FREE.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary/50 bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pro</h3>
              <Badge className="text-[10px]">Launch offer</Badge>
            </div>
            <p className="mt-1 font-display text-2xl font-bold">
              $29<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-xs text-profit">or $19 one-time — lifetime launch deal</p>
            <ul className="mt-4 space-y-2 text-sm">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-profit" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-2">
              <Button className="w-full" onClick={() => buy("lifetime")}>
                Get lifetime access — $19
              </Button>
              <Button variant="outline" className="w-full" onClick={() => buy("monthly")}>
                Subscribe monthly — $29/mo
              </Button>
            </div>
            {!LEMON_CHECKOUT_URL && (
              <p className="mt-3 text-xs text-muted-foreground">
                Checkout opens once your Lemon Squeezy link is configured.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
