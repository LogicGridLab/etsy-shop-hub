import { useState } from "react";
import { FlaskConical, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useShops } from "@/lib/shop-context";

export function OnboardingDialog() {
  const { onboarded, completeOnboarding, mockMode, setMockMode, refresh } = useShops();
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .insert({ shop_name: shopName.trim(), api_key: apiKey.trim() || null });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${shopName.trim()} connected.`);
    refresh();
    completeOnboarding();
  }

  return (
    <Dialog open={!onboarded} onOpenChange={(open) => !open && completeOnboarding()}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex justify-center pb-2">
          <img src="/favicon.png" alt="EtsyOps" className="h-12 w-12 rounded-lg object-contain" />
        </div>
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2 font-display text-xl">
            Connect your Etsy shop
          </DialogTitle>
          <DialogDescription className="mx-auto">
            Paste your Etsy Open API v3 keystring to start syncing real sales, fees and ad spend. No key yet? Explore
            everything with demo data first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={connect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="onb-shop">Shop name</Label>
            <Input
              id="onb-shop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="MyDigitalShop"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onb-key" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Etsy API keystring
            </Label>
            <Input
              id="onb-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. a1b2c3d4…"
            />
            <p className="text-xs text-muted-foreground">
              Create an app in the Etsy Developer Portal to get your keystring. You can add it later in Settings.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
            <Label htmlFor="onb-demo" className="flex cursor-pointer items-center gap-2 text-sm">
              <FlaskConical className="h-4 w-4 text-info" />
              Demo mode — browse with sample data
            </Label>
            <Switch id="onb-demo" checked={mockMode} onCheckedChange={setMockMode} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={saving || !shopName.trim()}>
              {saving ? "Connecting…" : "Connect shop"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setMockMode(true);
                completeOnboarding();
              }}
            >
              Skip — use demo data
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
