import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stockStyles: Record<string, string> = {
  active: "border-profit/40 bg-profit/10 text-profit",
  draft: "border-warning/40 bg-warning/10 text-warning",
  sold_out: "border-expense/40 bg-expense/10 text-expense",
  inactive: "border-muted-foreground/40 bg-muted text-muted-foreground",
};

const stockLabels: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  sold_out: "Sold out",
  inactive: "Inactive",
};

export function StockBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", stockStyles[status] ?? stockStyles["inactive"])}>
      {stockLabels[status] ?? status}
    </Badge>
  );
}
