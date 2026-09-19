import { Link } from "@tanstack/react-router";
import { Plug, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShops } from "@/lib/shop-context";

export function NoShopEmptyState() {
  const { setMockMode } = useShops();

  return (
    <div className="flex min-h-[420px] items-center justify-center px-4 py-12">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card text-primary">
          <Plug className="h-7 w-7" />
        </div>
        <h2 className="mt-5 font-display text-xl font-bold">No shop connected</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Connect your Etsy shop in Settings &amp; API Setup to see your real sales, orders and revenue. Demo mode is
          off, so we are waiting for real API data.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild className="gap-2">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
              Go to Settings &amp; API Setup
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setMockMode(true)}>
            Turn on Demo mode to preview with sample data
          </Button>
        </div>
      </div>
    </div>
  );
}