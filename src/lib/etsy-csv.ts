import { supabase } from "@/integrations/supabase/client";

/** Parses a CSV string (RFC 4180-ish, quoted fields supported). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const money = (v: string | undefined) => {
  if (!v) return 0;
  const n = Number(v.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const isoDate = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
};

interface DayExpense {
  ad_spend: number;
  listing_fees: number;
  offsite_ad_fees: number;
  shipping_postage: number;
}

/**
 * Imports an Etsy monthly statement CSV (Payments → Monthly statements → Download CSV)
 * into a new shop, creating orders and daily expense rows.
 */
export async function importEtsyStatement(file: File, shopName: string) {
  const rows = parseCsv(await file.text());
  if (rows.length < 2) throw new Error("This file looks empty.");
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.findIndex((h) => h === name || h.startsWith(name));
  const iDate = col("date");
  const iType = col("type");
  const iTitle = col("title");
  const iInfo = col("info");
  const iAmount = col("amount");
  const iFees = col("fees");
  if (iDate < 0 || iType < 0 || (iAmount < 0 && iFees < 0)) {
    throw new Error("We couldn't recognise this as an Etsy statement CSV. Download it from Shop Manager → Finances → Monthly statements.");
  }

  const orders: { order_id: string; customer_name: string; gross_amount: number; etsy_fees: number; net_amount: number; date: string }[] = [];
  const looseFees = new Map<string, number>();
  const days = new Map<string, DayExpense>();
  const day = (d: string) => {
    let e = days.get(d);
    if (!e) {
      e = { ad_spend: 0, listing_fees: 0, offsite_ad_fees: 0, shipping_postage: 0 };
      days.set(d, e);
    }
    return e;
  };

  for (const r of rows.slice(1)) {
    const type = (r[iType] ?? "").trim().toLowerCase();
    const title = (r[iTitle] ?? "").toLowerCase();
    const date = isoDate(r[iDate] ?? "");
    const amount = money(r[iAmount]);
    const fees = Math.abs(money(r[iFees]));
    if (type === "sale") {
      orders.push({
        order_id: (r[iInfo] ?? "").trim() || `CSV-${orders.length + 1}`,
        customer_name: "Etsy buyer",
        gross_amount: Math.abs(amount),
        etsy_fees: 0,
        net_amount: Math.abs(amount),
        date,
      });
    } else if (type === "marketing") {
      const v = Math.abs(amount) || fees;
      if (title.includes("offsite")) day(date).offsite_ad_fees += v;
      else day(date).ad_spend += v;
    } else if (type.includes("shipping") || title.includes("postage") || title.includes("shipping label")) {
      day(date).shipping_postage += Math.abs(amount) || fees;
    } else if (type === "fee" || type === "tax") {
      const v = fees || Math.abs(amount);
      if (title.includes("listing")) day(date).listing_fees += v;
      else if (title.includes("offsite")) day(date).offsite_ad_fees += v;
      else looseFees.set(date, (looseFees.get(date) ?? 0) + v);
    }
  }

  // Attach transaction/processing fees to that day's sales.
  for (const [date, fee] of looseFees) {
    const same = orders.filter((o) => o.date === date);
    if (same.length === 0) {
      day(date).listing_fees += fee;
      continue;
    }
    const each = fee / same.length;
    for (const o of same) {
      o.etsy_fees = Math.round((o.etsy_fees + each) * 100) / 100;
      o.net_amount = Math.round((o.gross_amount - o.etsy_fees) * 100) / 100;
    }
  }

  if (orders.length === 0 && days.size === 0) throw new Error("No sales or fees were found in this statement.");

  const { data: shop, error } = await supabase
    .from("shops")
    .insert({ shop_name: shopName.trim() || "My Etsy Shop", sync_status: "synced" })
    .select("id")
    .single();
  if (error || !shop) throw new Error(error?.message ?? "Could not create the shop.");

  for (let i = 0; i < orders.length; i += 500) {
    const { error: e } = await supabase.from("orders").insert(orders.slice(i, i + 500).map((o) => ({ ...o, shop_id: shop.id })));
    if (e) throw new Error(e.message);
  }
  const expenseRows = [...days.entries()].map(([date, e]) => ({
    shop_id: shop.id,
    date,
    ad_spend: Math.round(e.ad_spend * 100) / 100,
    listing_fees: Math.round(e.listing_fees * 100) / 100,
    offsite_ad_fees: Math.round(e.offsite_ad_fees * 100) / 100,
    shipping_postage: Math.round(e.shipping_postage * 100) / 100,
  }));
  if (expenseRows.length) {
    const { error: e } = await supabase.from("expenses").insert(expenseRows);
    if (e) throw new Error(e.message);
  }
  return { orders: orders.length, days: expenseRows.length };
}
