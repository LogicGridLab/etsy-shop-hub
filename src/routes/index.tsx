import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { DollarSign, FlaskConical, Percent, PiggyBank, ShoppingCart, Sparkles, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { CategoryDonutChart, MonthlyRevenueChart, TrafficConversionChart } from "@/components/dashboard-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoShopEmptyState } from "@/components/no-shop-empty-state";
import { FREE_HISTORY_DAYS, useShops } from "@/lib/shop-context";
import { fmtCurrency, fmtNumber, fmtPct } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — EtsyOps Multi-Shop Analytics" },
      { name: "description", content: "Consolidated Etsy multi-shop financial metrics: gross revenue, net profit, tax reserves, orders, AOV and conversion rate across all connected stores." },
      { property: "og:title", content: "Executive Dashboard — EtsyOps" },
      { property: "og:description", content: "Consolidated Etsy multi-shop financial metrics and profit analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { filtered, isLoading, isDemo, mockMode, hasConnectedShop, plan, openUpgrade, restartOnboarding, licenseStatus, onboarded } = useShops();

  useEffect(() => {
    if (!onboarded || licenseStatus === "checking" || licenseStatus === "valid") return;
    if (sessionStorage.getItem("etsy-ops-upsell-shown") === "1") return;
    sessionStorage.setItem("etsy-ops-upsell-shown", "1");
    openUpgrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded, licenseStatus]);

  const kpis = useMemo(() => {
    if (!filtered) return null;
    const gross = filtered.orders.reduce((s, o) => s + Number(o.gross_amount), 0);
    const fees = filtered.orders.reduce((s, o) => s + Number(o.etsy_fees), 0);
    const adSpend = filtered.expenses.reduce((s, e) => s + Number(e.ad_spend) + Number(e.listing_fees) + Number(e.offsite_ad_fees), 0);
    const shipping = filtered.expenses.reduce((s, e) => s + Number(e.shipping_postage ?? 0), 0);
    const costById = new Map(filtered.products.map((p) => [p.id, Number(p.unit_cost ?? 0)]));
    const cogs = filtered.orders.reduce((s, o) => s + (o.product_id ? (costById.get(o.product_id) ?? 0) : 0), 0);
    const expenses = adSpend + shipping;
    // Net Profit = Gross Revenue - Etsy Fees - Ad Spend - Total COGS - Shipping Postage
    const profit = gross - fees - adSpend - cogs - shipping;
    const orders = filtered.orders.length;
    const views = filtered.products.reduce((s, p) => s + p.views, 0);
    return {
      gross,
      profit,
      taxReserve: profit * 0.3,
      orders,
      aov: orders > 0 ? gross / orders : 0,
      conv: views > 0 ? (orders / views) * 100 : 0,
      fees,
      expenses,
      cogs,
      margin: gross > 0 ? (profit / gross) * 100 : 0,
    };
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!mockMode && (!filtered || !hasConnectedShop)) {
    return <NoShopEmptyState />;
  }

  if (!filtered || !kpis) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Consolidated financial performance across your Etsy stores</p>
        </div>
        {plan === "free" && (
          <Button variant="outline" size="sm" className="gap-2" onClick={openUpgrade}>
            <Sparkles className="h-4 w-4 text-primary" />
            Free plan · last {FREE_HISTORY_DAYS} days
          </Button>
        )}
      </div>

      {isDemo && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-info/40 bg-info/5 p-4 text-sm">
          <Badge variant="secondary" className="gap-1 text-[10px] uppercase tracking-wide">
            <FlaskConical className="h-3 w-3" />
            Demo Data
          </Badge>
          <span className="text-muted-foreground">
            No Etsy shop is connected yet — these numbers are sample data so you can explore every report.
          </span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={restartOnboarding}>
            Connect your shop
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Gross Revenue" value={fmtCurrency(kpis.gross)} subtitle={`${fmtCurrency(kpis.fees)} Etsy fees`} icon={DollarSign} />
        <KpiCard
          title="Net Profit"
          value={fmtCurrency(kpis.profit)}
          subtitle={`Tax reserve (30%): ${fmtCurrency(kpis.taxReserve)} · margin ${fmtPct(kpis.margin)} · COGS ${fmtCurrency(kpis.cogs)}`}
          icon={PiggyBank}
          tone="profit"
        />
        <KpiCard title="Total Orders" value={fmtNumber(kpis.orders)} subtitle={`AOV ${fmtCurrency(kpis.aov)}`} icon={ShoppingCart} tone="info" />
        <KpiCard title="Conversion Rate" value={fmtPct(kpis.conv)} subtitle="Orders per listing view" icon={Percent} tone="expense" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MonthlyRevenueChart data={filtered} />
        <TrafficConversionChart data={filtered} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <CategoryDonutChart data={filtered} />
        <div className="xl:col-span-2">
          <TopProducts />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-4 text-sm text-muted-foreground">
        <TrendingUp className="h-4 w-4 shrink-0 text-profit" />
        Operating expenses total {fmtCurrency(kpis.expenses)} over the tracked period — keep ad spend below 20% of gross for healthy margins.
      </div>
    </div>
  );
}

function TopProducts() {
  const { filtered } = useShops();
  const rows = useMemo(() => {
    if (!filtered) return [];
    const revenue = new Map<string, number>();
    for (const o of filtered.orders) {
      if (o.product_id) revenue.set(o.product_id, (revenue.get(o.product_id) ?? 0) + Number(o.gross_amount));
    }
    return filtered.products
      .map((p) => ({ ...p, revenue: revenue.get(p.id) ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filtered]);

  const max = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <div className="h-full rounded-xl border border-border/60 bg-card p-5">
      <h3 className="text-sm font-semibold">Top Listings by Revenue</h3>
      <p className="mb-4 text-xs text-muted-foreground">Best performing digital products</p>
      <div className="space-y-3">
        {rows.map((p) => (
          <div key={p.id} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{p.title}</span>
              <span className="shrink-0 font-medium text-profit">{fmtCurrency(p.revenue)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(p.revenue / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
