import { useState } from "react";
import { Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { aiOptimize, type AiOptimizeResult } from "@/lib/ai-optimize.functions";
import type { Product } from "@/lib/data";

export function AiPremiumButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiOptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setOpen(true);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await aiOptimize({ data: { title: product.title, tags: [product.category] } });
      if (r.ok) setResult(r.result);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const asText = (r: AiOptimizeResult) =>
    `Title:\n${r.optimized_title}\n\nTags:\n${r.tags.join(", ")}\n\nDescription:\n${r.description}\n\nMaterials:\n${r.materials.join(", ")}`;

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(asText(result));
    toast.success("Copied to clipboard");
  }

  async function push() {
    if (!result) return;
    await navigator.clipboard.writeText(asText(result));
    toast.success("Copied — paste it into your Etsy listing editor");
    window.open("https://www.etsy.com/your/shops/me/tools/listings", "_blank", "noopener");
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={run} className="h-8 gap-1 whitespace-nowrap">
        ✨ AI Premium
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Premium SEO</DialogTitle>
            <DialogDescription className="truncate">{product.title}</DialogDescription>
          </DialogHeader>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Optimizing your listing…
            </div>
          )}
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {result && (
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Optimized title ({result.optimized_title.length}/140)</h3>
                <p className="font-medium">{result.optimized_title}</p>
              </section>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Tags ({result.tags.length})</h3>
                <div className="flex flex-wrap gap-1.5">{result.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
              </section>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Description</h3>
                <p className="whitespace-pre-line text-muted-foreground">{result.description}</p>
              </section>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Materials</h3>
                <p>{result.materials.join(" · ")}</p>
              </section>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={copy}><Copy className="mr-1 h-4 w-4" /> Copy</Button>
                <Button onClick={push}><ExternalLink className="mr-1 h-4 w-4" /> Push to Etsy</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
