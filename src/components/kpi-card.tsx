import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "default" | "profit" | "expense" | "info";
}

const toneStyles: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-primary/15 text-primary",
  profit: "bg-profit/15 text-profit",
  expense: "bg-expense/15 text-expense",
  info: "bg-info/15 text-info",
};

export function KpiCard({ title, value, subtitle, icon: Icon, tone = "default" }: KpiCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1.5 font-display text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
