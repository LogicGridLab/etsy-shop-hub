import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Code2, Database, FileSpreadsheet, KeyRound, Link2, Plus, RefreshCw, ShoppingBag, Sparkles, Trash2, Upload, Webhook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FREE_HISTORY_DAYS, FREE_SHOP_LIMIT, useShops } from "@/lib/shop-context";
import { CURRENCIES, simulateSync, type CurrencyCode } from "@/lib/data";
import { importEtsyStatement } from "@/lib/etsy-csv";
import { isEtsyOAuthReady, startEtsyOAuth } from "@/lib/etsy-oauth";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Shop Settings & API Setup — EtsyOps" },
      { name: "description", content: "Connect Etsy shops with one click, import Etsy statement CSVs, set your currency and manage plan & billing." },
      { property: "og:title", content: "Shop Settings & API Setup — EtsyOps" },
      { property: "og:description", content: "Manage Etsy shop connections, statement imports and sync settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, refresh, mockMode, setMockMode, plan, setUpgradeOpen, restartOnboarding, currency, setCurrency } = useShops();
  const [addOpen, setAddOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [webhooksEnabled, setWebhooksEnabled] = useState(true);

  function guardLimit() {
    if (!mockMode && plan === "free" && (data?.shops.length ?? 0) >= FREE_SHOP_LIMIT) {
      setUpgradeOpen(true);
      toast.info(`The Free plan covers ${FREE_SHOP_LIMIT} shop — upgrade to Pro for unlimited shops.`);
      return false;
    }
    return true;
  }

  async function removeShop(id: string, name: string) {
    if (mockMode) {
      toast.info("Sample shops can't be removed — turn off Demo mode to manage your real shops.");
      return;
    }
    const { error } = await supabase.from("shops").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} removed.`);
    refresh();
  }

  async function syncShop(id: string) {
    const shop = data?.shops.find((s) => s.id === id);
    if (!shop || !data) return;
    if (mockMode) { toast.info("Demo shops refresh automatically."); return; }
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Shop Settings & API Setup</h1>
        <p className="text-sm text-muted-foreground">Connections, currency, plan and developer tools</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="developer" className="gap-1.5">
            <Code2 className="h-3.5 w-3.5" />
            Developer Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" />
                  Connected Shops
                </CardTitle>
                <CardDescription>
                  {mockMode ? "Demo mode — showing sample shops" : `${data?.shops.length ?? 0} shops linked to this workspace`}
                </CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => guardLimit() && setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Connect Etsy Shop
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch id="mock-toggle" checked={mockMode} onCheckedChange={setMockMode} />
                <Label htmlFor="mock-toggle" className="text-sm text-muted-foreground">
                  Demo mode (sample data)
                </Label>
              </div>
              {(data?.shops ?? []).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{s.shop_name}</p>
                      <Badge variant={s.sync_status === "synced" ? "default" : "secondary"} className="text-[10px]">
                        {mockMode ? "demo" : s.sync_status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {mockMode ? "Sample data" : s.api_key ? "Connected to Etsy" : "Imported from statement"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2" disabled={syncingId === s.id} onClick={() => syncShop(s.id)}>
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingId === s.id ? "animate-spin" : ""}`} />
                    Sync
                  </Button>
                  <Button size="sm" variant="ghost" className="text-expense hover:text-expense" aria-label={`Remove ${s.shop_name}`} onClick={() => removeShop(s.id, s.shop_name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Currency</CardTitle>
              <CardDescription>All amounts across the dashboard display in this currency.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                <SelectTrigger className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Plan & Billing
              </CardTitle>
              <CardDescription>
                Free includes {FREE_SHOP_LIMIT} shop and {FREE_HISTORY_DAYS} days of history. Pro from $19/mo billed annually,
                $24 monthly, or $149 lifetime for the first 100 sellers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LicenseForm />
              <div className="flex flex-wrap items-center gap-3">
              <Badge variant={plan === "pro" ? "default" : "secondary"} className="text-[10px] uppercase">
                {plan} plan
              </Badge>
              <Button size="sm" className="gap-2" onClick={() => setUpgradeOpen(true)}>
                <ShoppingBag className="h-4 w-4" />
                See Pro plans
              </Button>
              <Button size="sm" variant="ghost" onClick={restartOnboarding}>
                Re-run setup wizard
              </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="developer" className="mt-6 space-y-6">
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
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Endpoint (configure in the Etsy Developer Portal)</p>
                <code className="block break-all rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {typeof window !== "undefined" ? window.location.origin : ""}/api/public/hooks/etsy-order
                </code>
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
        </TabsContent>
      </Tabs>

      <ConnectShopDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function ConnectShopDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { refresh, setMockMode } = useShops();
  const fileRef = useRef<HTMLInputElement>(null);
  const [shopName, setShopName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);

  async function oauth() {
    if (!(await startEtsyOAuth())) {
      toast.info("1-click Etsy connect is rolling out soon — import your statement CSV to get started today.");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("That file is too large (max 10 MB)."); return; }
    setBusy(true);
    try {
      const res = await importEtsyStatement(file, shopName);
      toast.success(`Imported ${res.orders} sales from your statement.`);
      setMockMode(false);
      refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function manual(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey.trim()) return;
    const name = shopName.trim() || "My Etsy Shop";
    setBusy(true);
    const { error } = await supabase.from("shops").insert({ shop_name: name.slice(0, 100), api_key: apiKey.trim().slice(0, 500) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} connected.`);
    setApiKey("");
    setMockMode(false);
    refresh();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Connect an Etsy shop</DialogTitle>
          <DialogDescription>Pick the easiest way for you — no coding needed.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="shop-name">Shop name (optional)</Label>
          <Input id="shop-name" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. My Shop" maxLength={100} />
        </div>

        <div className="space-y-3">
          <Button size="lg" className="h-auto w-full justify-start gap-3 px-4 py-3 text-left" onClick={oauth} disabled={busy}>
            <Link2 className="h-5 w-5" />
            <span className="flex flex-col items-start">
              <span>Connect with Etsy</span>
              <span className="text-xs font-normal text-primary-foreground/80">
                {isEtsyOAuthReady() ? "Secure 1-click sign-in" : "Secure 1-click sign-in — coming soon"}
              </span>
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Upload className="h-5 w-5 animate-pulse text-primary" /> : <FileSpreadsheet className="h-5 w-5 text-primary" />}
            <span className="flex flex-col items-start">
              <span>{busy ? "Importing…" : "Import Etsy Statement CSV"}</span>
              <span className="text-xs font-normal text-muted-foreground">Shop Manager → Finances → Monthly statements</span>
            </span>
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border-b-0">
            <AccordionTrigger className="text-sm text-muted-foreground">Advanced / Developer Options</AccordionTrigger>
            <AccordionContent>
              <form onSubmit={manual} className="space-y-3 px-1">
                <Label htmlFor="api-key" className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Etsy API keystring
                </Label>
                <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your keystring" />
                <Button type="submit" variant="secondary" className="w-full" disabled={busy || !apiKey.trim()}>
                  Connect with API key
                </Button>
              </form>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}

function LicenseForm() {
  const { activateLicense, licenseStatus } = useShops();
  const [key, setKey] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (key.trim().length < 8) {
      toast.error("Please paste your full license key.");
      return;
    }
    const r = await activateLicense(key);
    if (r.ok) {
      toast.success("License activated — EtsyOps Pro unlocked.");
      setKey("");
    } else toast.error(r.error ?? "This license key isn't valid.");
  }

  if (licenseStatus === "valid") {
    return <p className="text-sm text-profit">Pro license active on this device.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="license-key">Enter License Key</Label>
        <Input id="license-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" maxLength={200} />
      </div>
      <Button type="submit" disabled={licenseStatus === "checking"}>
        {licenseStatus === "checking" ? "Checking…" : "Activate"}
      </Button>
    </form>
  );
}
