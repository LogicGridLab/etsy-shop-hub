import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

interface Receipt {
  receipt_id: number;
  name: string;
  create_timestamp: number;
  grandtotal: { amount: number; divisor: number };
}

/** Pulls the latest Etsy receipts for an OAuth-connected shop into orders. */
export const syncEtsyShop = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ shopRef: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const etsy = await import("@/lib/etsy.server");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: row } = await sb.from("connected_shops").select("*").eq("shop_ref", data.shopRef).maybeSingle();
    if (!row) throw new Error("This shop isn't connected to Etsy.");
    await sb.from("shops").update({ sync_status: "syncing" }).eq("id", data.shopRef);
    try {
      const token = await etsy.getAccessToken(row);
      const res = await etsy.etsyGet<{ results: Receipt[] }>(`/application/shops/${row.shop_id}/receipts?limit=100`, token);
      const ids = res.results.map((r) => `ETSY-${r.receipt_id}`);
      const { data: existing } = await sb.from("orders").select("order_id").eq("shop_id", data.shopRef).in("order_id", ids);
      const seen = new Set((existing ?? []).map((o) => o.order_id));
      const rows = res.results
        .filter((r) => !seen.has(`ETSY-${r.receipt_id}`))
        .map((r) => {
          const gross = Math.round((r.grandtotal.amount / r.grandtotal.divisor) * 100) / 100;
          const fees = Math.round((gross * 0.095 + 0.45) * 100) / 100; // estimated transaction + processing fees
          return {
            shop_id: data.shopRef,
            order_id: `ETSY-${r.receipt_id}`,
            customer_name: (r.name || "Etsy buyer").slice(0, 100),
            gross_amount: gross,
            etsy_fees: fees,
            net_amount: Math.round((gross - fees) * 100) / 100,
            date: new Date(r.create_timestamp * 1000).toISOString().slice(0, 10),
          };
        });
      if (rows.length) {
        const { error } = await sb.from("orders").insert(rows);
        if (error) throw new Error(error.message);
      }
      return { orders: rows.length };
    } finally {
      await sb.from("shops").update({ sync_status: "synced" }).eq("id", data.shopRef);
    }
  });
