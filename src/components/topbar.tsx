import { useState } from "react";
import { Check, ChevronsUpDown, FlaskConical, Lock, RefreshCw, Sparkles, Store } from "lucide-react";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ALL_SHOPS, simulateSync } from "@/lib/data";
import { useShops } from "@/lib/shop-context";

export function Topbar() {
  const { data, selectedShop, setSelectedShop, mockMode, setMockMode, refresh, visibleShops, isDemo, plan, openUpgrade } =
    useShops();
  const [syncing, setSyncing] = useState(false);

  const lockedShops = (data?.shops.length ?? 0) - visibleShops.length;
  const selectedName =
    selectedShop === ALL_SHOPS ? "All Shops Consolidated" : data?.shops.find((s) => s.id === selectedShop)?.shop_name ?? "Select shop";

  async function handleSync() {
    if (mockMode) {
      toast.info("Mock mode is on — simulated data is generated locally.");
      return;
    }
    if (plan !== "pro") {
      openUpgrade();
      return;
    }
    if (!data) return;
    const targets = selectedShop === ALL_SHOPS ? data.shops : data.shops.filter((s) => s.id === selectedShop);
    if (targets.length === 0) return;
    setSyncing(true);
    try {
      let total = 0;
      for (const shop of targets) {
        if (!shop.api_key) {
          const res = await simulateSync(shop, data.products);
          total += res.orders;
        } else {
          toast.warning(`${shop.shop_name}: live Etsy sync requires OAuth — ran simulated sync instead.`);
          const res = await simulateSync(shop, data.products);
          total += res.orders;
        }
      }
      refresh();
      toast.success(`Sync complete — ${total} new order${total === 1 ? "" : "s"} imported.`);
    } catch (e) {
      toast.error("Sync failed: " + (e instanceof Error ? e.message : "unknown error"));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 gap-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="max-w-44 truncate font-medium">{selectedName}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Switch shop</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => (plan === "pro" || mockMode ? setSelectedShop(ALL_SHOPS) : openUpgrade())}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {plan !== "pro" && !mockMode && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              All Shops Consolidated
            </span>
            {selectedShop === ALL_SHOPS && <Check className="h-4 w-4 text-profit" />}
          </DropdownMenuItem>
          {visibleShops.map((s) => (
            <DropdownMenuItem key={s.id} onClick={() => setSelectedShop(s.id)} className="flex items-center justify-between">
              <span className="truncate">{s.shop_name}</span>
              {selectedShop === s.id && <Check className="h-4 w-4 text-profit" />}
            </DropdownMenuItem>
          ))}
          {lockedShops > 0 && (
            <DropdownMenuItem onClick={openUpgrade} className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {lockedShops} more shop{lockedShops === 1 ? "" : "s"} — upgrade to Pro
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {isDemo && (
        <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wide">
          <FlaskConical className="h-3 w-3" />
          Demo Data
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 sm:flex">
          <Switch id="mock-mode" checked={mockMode} onCheckedChange={setMockMode} />
          <Label htmlFor="mock-mode" className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" />
            Demo mode
          </Label>
        </div>
        {plan === "free" && (
          <Button variant="outline" size="sm" className="gap-2" onClick={openUpgrade}>
            <Sparkles className="h-4 w-4 text-primary" />
            Upgrade
          </Button>
        )}
        <Button onClick={handleSync} disabled={syncing} size="sm" className="gap-2">
          {plan === "pro" || mockMode ? <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> : <Lock className="h-4 w-4" />}
          {syncing ? "Syncing…" : "Sync Data Now"}
        </Button>
      </div>
    </header>
  );
}
