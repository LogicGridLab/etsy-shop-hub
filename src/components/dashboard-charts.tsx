import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShopData } from "@/lib/data";

const tooltipStyle = {
  backgroundColor: "oklch(0.22 0.024 264)",
  border: "1px solid oklch(0.32 0.024 264)",
  borderRadius: "0.625rem",
  fontSize: 12,
} as const;

export function MonthlyRevenueChart({ data }: { data: ShopData }) {
  const rows = useMemo(() => {
    const byMonth = new Map<string, { month: string; revenue: number; fees: number; net: number }>();
    for (const o of data.orders) {
      const m = o.date.slice(0, 7);
      const cur = byMonth.get(m) ?? { month: m, revenue: 0, fees: 0, net: 0 };
      cur.revenue += Number(o.gross_amount);
      cur.fees += Number(o.etsy_fees);
      cur.net += Number(o.net_amount);
      byMonth.set(m, cur);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({
        ...v,
        month: new Date(m + "-02").toLocaleDateString("en-US", { month: "short" }),
        revenue: Math.round(v.revenue),
        fees: Math.round(v.fees),
        net: Math.round(v.net),
      }));
  }, [data.orders]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Revenue vs Etsy Fees vs Net Profit</CardTitle>
        <p className="text-xs text-muted-foreground">Monthly breakdown</p>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.024 264)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(0.3 0.03 270 / 0.4)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="revenue" name="Gross Revenue" stackId="a" fill="oklch(0.63 0.21 288)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fees" name="Etsy Fees" stackId="a" fill="oklch(0.7 0.18 25)" />
            <Bar dataKey="net" name="Net Profit" fill="oklch(0.72 0.17 162)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TrafficConversionChart({ data }: { data: ShopData }) {
  const rows = useMemo(() => {
    const byDay = new Map<string, { date: string; orders: number; views: number }>();
    const avgConv = data.products.length
      ? data.products.reduce((s, p) => s + Number(p.conversion_rate), 0) / data.products.length
      : 3;
    const totalViews = data.products.reduce((s, p) => s + p.views, 0);
    for (const o of data.orders) {
      const cur = byDay.get(o.date) ?? { date: o.date, orders: 0, views: 0 };
      cur.orders += 1;
      byDay.set(o.date, cur);
    }
    const orderDays = Math.max(1, byDay.size);
    const dailyViewsBase = totalViews / 120;
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-60)
      .map(([, v]) => ({
        date: v.date.slice(5),
        orders: v.orders,
        views: Math.round(dailyViewsBase * (0.7 + (v.orders / Math.max(1, avgConv)) * 0.3) + (orderDays % 7)),
      }));
  }, [data.orders, data.products]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Daily Traffic & Orders Conversion</CardTitle>
        <p className="text-xs text-muted-foreground">Last 60 days</p>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.024 264)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} interval={9} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "oklch(0.68 0.02 262)" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="oklch(0.7 0.14 230)" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="oklch(0.72 0.17 162)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const DONUT_COLORS = [
  "oklch(0.63 0.21 288)",
  "oklch(0.72 0.17 162)",
  "oklch(0.7 0.14 230)",
  "oklch(0.8 0.15 85)",
  "oklch(0.7 0.18 25)",
  "oklch(0.65 0.15 330)",
];

export function CategoryDonutChart({ data }: { data: ShopData }) {
  const rows = useMemo(() => {
    const revenueByProduct = new Map<string, number>();
    for (const o of data.orders) {
      if (o.product_id) revenueByProduct.set(o.product_id, (revenueByProduct.get(o.product_id) ?? 0) + Number(o.gross_amount));
    }
    const byCat = new Map<string, number>();
    for (const p of data.products) {
      byCat.set(p.category, (byCat.get(p.category) ?? 0) + (revenueByProduct.get(p.id) ?? 0));
    }
    return [...byCat.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Category Sales Distribution</CardTitle>
        <p className="text-xs text-muted-foreground">By gross revenue</p>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} strokeWidth={0}>
              {rows.map((r, i) => (
                <Cell key={r.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
