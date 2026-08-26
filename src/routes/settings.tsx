import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Database, KeyRound, Link2, Plus, RefreshCw, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useShops } from "@/lib/shop-context";
import { simulateSync } from "@/lib/data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Shop Settings & API Setup — EtsyOps" },
      { name: "description", content: "Connect Etsy shops via the Open API v3, manage API keys, webhooks, sync settings and database tools." },
      { property: "og:title", content: "Shop Settings & API Setup — EtsyOps" },
      { property: "og:description", content: "Manage Etsy shop connections, API keys and sync settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, refresh, mockMode, setMockMode } = useShops();
  const [addOpen, setAddOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [webhooksEnabled, setWebhooksEnabled] = useState(true);

  async function addShop(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim()) return;
    const { error } = await supabase.from("shops").insert({ shop_name: shopName.trim(), api_key: apiKey.trim() || null });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${shopName} connected.`);
    setAddOpen(false);
    setShopName("");
    setApiKey("");
    refresh();
  }

  async function removeShop(id: string, name: string) {
    const { error } = await supabase.from("shops").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name} removed.`);
    refresh();
  }

  async function syncShop(id: string) {
    const shop = data?.shops.find((s) => s.id === id);
    if (!shop || !data) return;
    setSyncingId(id);
    try {
      const res = await simulateSync(shop, data.products);
      toast.success(`${shop.shop_name}: sync complete — ${res.orders} new orders.`);
      refresh();
    } catch (err) {
      toast.error("Sync failed: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setSyncingId(null);
    }
  }

  function connectEtsy() {
    window.open("https://developers.etsy.com/documentation/essentials/authentication", "_blank", "noopener");
    toast.info("Register an app in the Etsy Developer Portal, then paste the API keystring on your shop below.");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Shop Settings & API Setup</h1>
        <p className="text-sm text-muted-foreground">Connection manager, sync engine and database tools</p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            Etsy Open API v3
          </CardTitle>
          <CardDescription>
            Authorize shops via OAuth 2.0 (authorization code flow with PKCE) or paste an API keystring per shop.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button onClick={connectEtsy} className="gap-2">
            <KeyRound className="h-4 w-4" />
            Integrate Etsy Account
          </Button>
          <div className="flex items-center gap-2">
            <Switch id="mock-toggle" checked={mockMode} onCheckedChange={setMockMode} />
            <Label htmlFor="mock-toggle" className="text-sm text-muted-foreground">
              Mock data fallback (no API keys required)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Connected Shops</CardTitle>
            <CardDescription>{data?.shops.length ?? 0} shops linked to this workspace</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Shop
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect a new Etsy shop</DialogTitle>
                <DialogDescription>Paste your Etsy Open API v3 keystring, or leave it blank to use simulated sync.</DialogDescription>
              </DialogHeader>
              <form onSubmit={addShop} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shop-name">Shop name</Label>
                  <Input id="shop-name" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="MyDigitalShop" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key">Etsy API keystring (optional)</Label>
                  <Input id="api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="e.g. a1b2c3d4…" type="password" />
                </div>
                <Button type="submit" className="w-full">
                  Connect Shop
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.shops ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{s.shop_name}</p>
                  <Badge variant={s.sync_status === "synced" ? "default" : "secondary"} className="text-[10px]">
                    {s.sync_status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.api_key ? "API key configured — live sync ready" : "No API key — simulated sync active"}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-2" disabled={syncingId === s.id} onClick={() => syncShop(s.id)}>
                <RefreshCw className={`h-3.5 w-3.5 ${syncingId === s.id ? "animate-spin" : ""}`} />
                Sync
              </Button>
              <Button size="sm" variant="ghost" className="text-expense hover:text-expense" onClick={() => removeShop(s.id, s.shop_name)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4 text-info" />
            Webhooks
          </CardTitle>
          <CardDescription>Receive order events in real time instead of polling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="webhooks" className="text-sm">
              Order created / paid webhooks
            </Label>
            <Switch id="webhooks" checked={webhooksEnabled} onCheckedChange={setWebhooksEnabled} />
          </div>
          <Separator />
          <div className="rounded-md bg-muted/50 p-3 font-mono text-xs text-muted-foreground">
            POST /api/public/hooks/etsy-order — configure this URL in the Etsy Developer Portal once your app is approved for webhooks.
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-profit" />
            Database
          </CardTitle>
          <CardDescription>Storage usage across synced entities.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Shops", value: data?.shops.length ?? 0 },
              { label: "Listings", value: data?.products.length ?? 0 },
              { label: "Orders", value: data?.orders.length ?? 0 },
              { label: "Expense rows", value: data?.expenses.length ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/60 bg-background/40 p-3 text-center">
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
