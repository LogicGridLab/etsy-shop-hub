import { Link } from "@tanstack/react-router";
import { FlaskConical, Plug, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShops } from "@/lib/shop-context";

export function NoShopEmptyState() {
  const { setMockMode } = useShops();

  return (
    <div className="flex min-h-[460px] items-center justify-center px-4 py-12">
      <div className="max-w-lg text-center">
        <div className="relative mx-auto h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-primary/10" />
          <div className="absolute inset-3 flex items-center justify-center rounded-full border border-border bg-card text-primary">
            <Store className="h-8 w-8" />
          </div>
          <div className="absolute -right-1 bottom-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-expense">
            <Plug className="h-4 w-4" />
          </div>
        </div>
        <h2 className="mt-6 font-display text-xl font-bold">No Etsy Shop Connected</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Connect your Etsy shop or import a monthly statement to see your real sales, fees and profit.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild className="gap-2">
            <Link to="/settings">
              <Plug className="h-4 w-4" />
              Connect Etsy Shop
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setMockMode(true)}>
            <FlaskConical className="h-4 w-4" />
            Restore Demo Data
          </Button>
        </div>
      </div>
    </div>
  );
}
