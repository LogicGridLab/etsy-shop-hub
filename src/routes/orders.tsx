import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { NoShopEmptyState } from "@/components/no-shop-empty-state";
import { useShops } from "@/lib/shop-context";
import { fmtCurrency } from "@/lib/data";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders & Revenue History — EtsyOps" },
      { name: "description", content: "Searchable Etsy order and revenue history with date filters and CSV export across all connected shops." },
      { property: "og:title", content: "Orders & Revenue History — EtsyOps" },
      { property: "og:description", content: "Searchable Etsy order history with CSV export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const PAGE_SIZE = 15;

function OrdersPage() {
  const { filtered, isLoading, mockMode, hasConnectedShop } = useShops();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("30");
  const [page, setPage] = useState(0);

  const productById = useMemo(() => new Map((filtered?.products ?? []).map((p) => [p.id, p.title])), [filtered]);

  const rows = useMemo(() => {
    if (!filtered) return [];
    let list = [...filtered.orders].sort((a, b) => b.date.localeCompare(a.date));
    if (range !== "all") {
      const cutoff = new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10);
      list = list.filter((o) => o.date >= cutoff);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.order_id.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          (o.product_id && (productById.get(o.product_id) ?? "").toLowerCase().includes(q)),
      );
    }
    return list;
  }, [filtered, search, range, productById]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function exportCsv() {
    const header = "Order ID,Date,Customer,Product,Gross,Etsy Fees,Net\n";
    const body = rows
      .map((o) =>
        [o.order_id, o.date, `"${o.customer_name}"`, `"${(o.product_id && productById.get(o.product_id)) || ""}"`, o.gross_amount, o.etsy_fees, o.net_amount].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `etsy-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} orders to CSV.`);
  }

  if (!isLoading && !mockMode && (!filtered || !hasConnectedShop)) {
    return <NoShopEmptyState />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Order & Revenue History</h1>
          <p className="text-sm text-muted-foreground">{rows.length} orders match your filters</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search order ID, customer or product…"
            className="pl-9"
          />
        </div>
        <Select
          value={range}
          onValueChange={(v) => {
            setRange(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Etsy Fees</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No orders found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.order_id}</TableCell>
                  <TableCell className="text-muted-foreground">{o.date}</TableCell>
                  <TableCell>{o.customer_name}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">
                    {(o.product_id && productById.get(o.product_id)) || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtCurrency(Number(o.gross_amount))}</TableCell>
                  <TableCell className="text-right text-expense">{fmtCurrency(Number(o.etsy_fees))}</TableCell>
                  <TableCell className="text-right font-medium text-profit">{fmtCurrency(Number(o.net_amount))}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
