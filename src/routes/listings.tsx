import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StockBadge } from "@/components/ui/badge-helpers";
import { useShops } from "@/lib/shop-context";
import { fmtCurrency, fmtNumber, fmtPct } from "@/lib/data";

export const Route = createFileRoute("/listings")({
  head: () => ({
    meta: [
      { title: "Listing Performance Center — EtsyOps" },
      { name: "description", content: "Track Etsy listing views, CTR, conversion scores, listing quality and stock status per product." },
      { property: "og:title", content: "Listing Performance Center — EtsyOps" },
      { property: "og:description", content: "Track Etsy listing views, CTR, conversion and stock status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListingsPage,
});

function qualityColor(score: number) {
  if (score >= 80) return "bg-profit";
  if (score >= 65) return "bg-warning";
  return "bg-expense";
}

function ListingsPage() {
  const { filtered, isLoading, data, selectedShop } = useShops();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const shopName = useMemo(() => new Map((data?.shops ?? []).map((s) => [s.id, s.shop_name])), [data]);

  const rows = useMemo(() => {
    if (!filtered) return [];
    let list = [...filtered.products].sort((a, b) => b.views - a.views);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    if (status !== "all") list = list.filter((p) => p.stock_status === status);
    return list;
  }, [filtered, search, status]);

  const showShop = selectedShop === "all";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Listing Performance Center</h1>
        <p className="text-sm text-muted-foreground">Views, CTR, conversion quality and stock per listing</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or SKU…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stock status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sold_out">Sold out</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              {showShop && <TableHead>Shop</TableHead>}
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Favorites</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Conv.</TableHead>
              <TableHead className="w-36">Quality</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={showShop ? 9 : 8}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showShop ? 9 : 8} className="py-10 text-center text-muted-foreground">
                  No listings match your filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const ctr = p.views > 0 ? (p.favorites / p.views) * 100 : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="max-w-64">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{p.sku} · {p.category}</p>
                      </div>
                    </TableCell>
                    {showShop && <TableCell className="text-muted-foreground">{shopName.get(p.shop_id)}</TableCell>}
                    <TableCell className="text-right">{fmtCurrency(Number(p.price))}</TableCell>
                    <TableCell className="text-right">{fmtNumber(p.views)}</TableCell>
                    <TableCell className="text-right">{fmtNumber(p.favorites)}</TableCell>
                    <TableCell className="text-right text-info">{fmtPct(ctr)}</TableCell>
                    <TableCell className="text-right text-profit">{fmtPct(Number(p.conversion_rate))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${qualityColor(p.listing_quality_score)}`} style={{ width: `${p.listing_quality_score}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{p.listing_quality_score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StockBadge status={p.stock_status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
