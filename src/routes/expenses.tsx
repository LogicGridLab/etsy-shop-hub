import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Megaphone, Receipt, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useShops } from "@/lib/shop-context";
import { NoShopEmptyState } from "@/components/no-shop-empty-state";
import { fmtCurrency, fmtPct } from "@/lib/data";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expense & Ad Spend Log — EtsyOps" },
      { name: "description", content: "Track daily Etsy Ads spend, offsite ad deductions, listing fees and operating expenses per shop." },
      { property: "og:title", content: "Expense & Ad Spend Log — EtsyOps" },
      { property: "og:description", content: "Track Etsy Ads spend, offsite ad fees and operating expenses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.024 264)",
  border: "1px solid oklch(0.32 0.024 264)",
  borderRadius: "0.625rem",
  fontSize: 12,
} as const;

function ExpensesPage() {
  const { filtered, isLoading, data, selectedShop, mockMode, hasConnectedShop } = useShops();

  const totals = useMemo(() => {
    if (!filtered) return null;
    const ads = filtered.expenses.reduce((s, e) => s + Number(e.ad_spend), 0);
    const listing = filtered.expenses.reduce((s, e) => s + Number(e.listing_fees), 0);
    const offsite = filtered.expenses.reduce((s, e) => s + Number(e.offsite_ad_fees), 0);
    const shipping = filtered.expenses.reduce((s, e) => s + Number(e.shipping_postage ?? 0), 0);
    return { ads, listing, offsite, shipping, total: ads + listing + offsite + shipping };
  }, [filtered]);

  const daily = useMemo(() => {
    if (!filtered) return [];
    const byDay = new Map<string, { date: string; ads: number; offsite: number }>();
    for (const e of filtered.expenses) {
      const cur = byDay.get(e.date) ?? { date: e.date, ads: 0, offsite: 0 };
      cur.ads += Number(e.ad_spend);
      cur.offsite += Number(e.offsite_ad_fees);
      byDay.set(e.date, cur);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([, v]) => ({ ...v, date: v.date.slice(5), ads: Math.round(v.ads * 100) / 100, offsite: Math.round(v.offsite * 100) / 100 }));
  }, [filtered]);

  const recent = useMemo(() => {
    if (!filtered) return [];
    return [...filtered.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [filtered]);

  const shopName = useMemo(() => new Map((data?.shops ?? []).map((s) => [s.id, s.shop_name])), [data]);
  const showShop = selectedShop === "all";

  if (!isLoading && !mockMode && (!filtered || !hasConnectedShop)) {
    return <NoShopEmptyState />;
  }

  if (isLoading || !filtered || !totals) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Expense & Ad Spend Log</h1>
        <p className="text-sm text-muted-foreground">Etsy Ads, offsite ad deductions and operating costs</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Expenses" value={fmtCurrency(totals.total)} subtitle="Tracked period" icon={Wallet} tone="expense" />
        <KpiCard title="Etsy Ads Spend" value={fmtCurrency(totals.ads)} subtitle={`${fmtPct(totals.total > 0 ? (totals.ads / totals.total) * 100 : 0)} of total`} icon={Megaphone} />
        <KpiCard title="Offsite Ad Fees" value={fmtCurrency(totals.offsite)} subtitle="12–15% of attributed sales" icon={Receipt} tone="info" />
        <KpiCard title="Listing Fees" value={fmtCurrency(totals.listing)} subtitle={`$0.20 per renewal · postage ${fmtCurrency(totals.shipping)}`} icon={Receipt} tone="profit" />
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily Ad Spend — Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.024 264)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="ads" name="Etsy Ads" stroke="oklch(0.7 0.18 25)" fill="oklch(0.7 0.18 25 / 0.25)" strokeWidth={2} />
              <Area type="monotone" dataKey="offsite" name="Offsite Ads" stroke="oklch(0.63 0.21 288)" fill="oklch(0.63 0.21 288 / 0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {showShop && <TableHead>Shop</TableHead>}
              <TableHead className="text-right">Ad Spend</TableHead>
              <TableHead className="text-right">Listing Fees</TableHead>
              <TableHead className="text-right">Offsite Ad Fees</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((e) => {
              const total = Number(e.ad_spend) + Number(e.listing_fees) + Number(e.offsite_ad_fees) + Number(e.shipping_postage ?? 0);
              return (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">{e.date}</TableCell>
                  {showShop && <TableCell>{shopName.get(e.shop_id)}</TableCell>}
                  <TableCell className="text-right text-expense">{fmtCurrency(Number(e.ad_spend))}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(Number(e.listing_fees))}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(Number(e.offsite_ad_fees))}</TableCell>
                  <TableCell className="text-right font-medium">{fmtCurrency(total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
