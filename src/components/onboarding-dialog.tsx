import { useState } from "react";
import { HelpCircle, KeyRound, Plug, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useShops } from "@/lib/shop-context";

export function OnboardingDialog() {
  const { onboarded, completeOnboarding, mockMode, setMockMode, refresh } = useShops();
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    const connectedShopName = shopName.trim() || "My Etsy Shop";
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .insert({ shop_name: connectedShopName, api_key: apiKey.trim() });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${connectedShopName} connected.`);
    setMockMode(false);
    refresh();
    completeOnboarding();
  }

  return (
    <Dialog open={!onboarded} onOpenChange={(open) => !open && completeOnboarding()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex justify-center">
          <img src="/favicon.png" alt="EtsyOps" className="h-8 w-8 rounded-lg object-contain" />
        </div>
        <DialogHeader className="text-center">
          <DialogTitle className="font-display text-xl">Welcome to EtsyOps — by LogicGridLab</DialogTitle>
          <DialogDescription className="mx-auto max-w-sm leading-6">
            Track all your Etsy shops in one dashboard — revenue, fees, profit &amp; top listings. No coding needed.
          </DialogDescription>
        </DialogHeader>

        {!showConnectionForm ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="h-auto w-full justify-start px-4 py-3 text-left"
              onClick={() => {
                setMockMode(true);
                completeOnboarding();
              }}
            >
              <Rocket className="h-5 w-5" />
              <span className="flex flex-col items-start">
                <span>Try Demo — See sample dashboard</span>
                <span className="text-xs font-normal text-primary-foreground/80">Explore with sample data, no setup</span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-auto w-full justify-start px-4 py-3 text-left"
              onClick={() => setShowConnectionForm(true)}
            >
              <Plug className="h-5 w-5 text-primary" />
              <span>I have my Etsy API key — Connect shop</span>
            </Button>

            <div className="flex justify-center pt-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="link" className="h-auto gap-1.5 p-0 text-xs">
                    <HelpCircle className="h-3.5 w-3.5" />
                    What is Etsy API key? Where to get it?
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="text-sm leading-5" side="bottom">
                  Optional: For real data, create free API key at etsy.com/developers. You can also try demo first and
                  connect later in Settings.
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <form onSubmit={connect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onb-shop">Shop name (optional)</Label>
              <Input
                id="onb-shop"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. My Shop"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onb-key" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                Etsy API key
              </Label>
              <Input
                id="onb-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Etsy API key"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={saving || !apiKey.trim()}>
              {saving ? "Connecting…" : "Connect shop"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setShowConnectionForm(false)}>
              Back
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
