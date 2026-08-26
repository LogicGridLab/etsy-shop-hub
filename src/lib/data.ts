import { supabase } from "@/integrations/supabase/client";

export interface Shop {
  id: string;
  shop_name: string;
  api_key: string | null;
  sync_status: "idle" | "syncing" | "synced" | "error";
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  title: string;
  sku: string;
  price: number;
  conversion_rate: number;
  views: number;
  favorites: number;
  listing_quality_score: number;
  category: string;
  stock_status: "active" | "draft" | "sold_out" | "inactive";
}

export interface Order {
  id: string;
  shop_id: string;
  order_id: string;
  customer_name: string;
  product_id: string | null;
  gross_amount: number;
  net_amount: number;
  etsy_fees: number;
  date: string;
}

export interface Expense {
  id: string;
  shop_id: string;
  ad_spend: number;
  listing_fees: number;
  offsite_ad_fees: number;
  date: string;
}

export interface ShopData {
  shops: Shop[];
  products: Product[];
  orders: Order[];
  expenses: Expense[];
}

export const ALL_SHOPS = "all";

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 }).format(n);

export const fmtNumber = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));

export const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export async function fetchAllData(): Promise<ShopData> {
  const [shops, products, orders, expenses] = await Promise.all([
    supabase.from("shops").select("*").order("created_at"),
    supabase.from("products").select("*").range(0, 9999),
    supabase.from("orders").select("*").order("date", { ascending: false }).range(0, 19999),
    supabase.from("expenses").select("*").order("date", { ascending: false }).range(0, 9999),
  ]);
  if (shops.error) throw shops.error;
  if (products.error) throw products.error;
  if (orders.error) throw orders.error;
  if (expenses.error) throw expenses.error;
  return {
    shops: (shops.data ?? []) as Shop[],
    products: (products.data ?? []) as Product[],
    orders: (orders.data ?? []) as Order[],
    expenses: (expenses.data ?? []) as Expense[],
  };
}

/** Simulated sync: pulls a fresh batch of "Etsy" activity into the DB. */
export async function simulateSync(shop: Shop, products: Product[]) {
  const shopProducts = products.filter((p) => p.shop_id === shop.id);
  if (shopProducts.length === 0) return { orders: 0 };

  await supabase.from("shops").update({ sync_status: "syncing" }).eq("id", shop.id);

  const customers = ["Emma Wilson", "Liam Carter", "Sophia Reyes", "Noah Bennett", "Ava Thompson", "Mia Kowalski", "Ethan Novak", "Olivia Laurent", "Amelia Sato", "Harper Lin"];
  const today = new Date().toISOString().slice(0, 10);
  const count = 1 + Math.floor(Math.random() * 4);
  const rows = Array.from({ length: count }, (_, i) => {
    const p = shopProducts[Math.floor(Math.random() * shopProducts.length)]!;
    const gross = Math.round(p.price * (0.9 + Math.random() * 0.25) * 100) / 100;
    const fees = Math.round((gross * 0.095 + 0.45) * 100) / 100;
    return {
      shop_id: shop.id,
      order_id: `ETSY-${today.slice(2).replaceAll("-", "")}-${String(Math.floor(Math.random() * 997)).padStart(3, "0")}${i}`,
      customer_name: customers[Math.floor(Math.random() * customers.length)]!,
      product_id: p.id,
      gross_amount: gross,
      etsy_fees: fees,
      net_amount: Math.round((gross - fees) * 100) / 100,
      date: today,
    };
  });
  await supabase.from("orders").insert(rows);
  await supabase.from("expenses").insert({
    shop_id: shop.id,
    ad_spend: Math.round((8 + Math.random() * 18) * 100) / 100,
    listing_fees: Math.round(0.2 * (1 + Math.floor(Math.random() * 5)) * 100) / 100,
    offsite_ad_fees: Math.random() < 0.35 ? Math.round((2 + Math.random() * 9) * 100) / 100 : 0,
    date: today,
  });
  // Bump listing traffic
  for (const p of shopProducts.slice(0, 4)) {
    await supabase
      .from("products")
      .update({ views: p.views + 40 + Math.floor(Math.random() * 200), favorites: p.favorites + Math.floor(Math.random() * 8) })
      .eq("id", p.id);
  }
  await supabase.from("shops").update({ sync_status: "synced" }).eq("id", shop.id);
  return { orders: count };
}

/** Deterministic pseudo-random mock dataset (used by Mock Data mode). */
export function generateMockData(): ShopData {
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const shops: Shop[] = [
    { id: "mock-shop-1", shop_name: "LogicGridStore", api_key: null, sync_status: "synced", created_at: new Date().toISOString() },
    { id: "mock-shop-2", shop_name: "DigitalHubStudio", api_key: null, sync_status: "synced", created_at: new Date().toISOString() },
  ];
  const cats = ["Templates", "Printables", "Graphics", "Spreadsheets", "Photography", "Guides"];
  const products: Product[] = [];
  shops.forEach((s, si) => {
    for (let i = 0; i < 8; i++) {
      products.push({
        id: `mock-p-${si}-${i}`,
        shop_id: s.id,
        title: `Mock Digital Product ${si + 1}.${i + 1}`,
        sku: `MK-${si}${i}0`,
        price: Math.round((9 + rand() * 45) * 100) / 100,
        conversion_rate: Math.round((2 + rand() * 5) * 100) / 100,
        views: Math.floor(3000 + rand() * 18000),
        favorites: Math.floor(200 + rand() * 1800),
        listing_quality_score: 55 + Math.floor(rand() * 40),
        category: cats[Math.floor(rand() * cats.length)]!,
        stock_status: rand() > 0.15 ? "active" : "sold_out",
      });
    }
  });
  const orders: Order[] = [];
  const expenses: Expense[] = [];
  for (let d = 119; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
    for (const p of products) {
      const n = rand() < p.conversion_rate / 12 ? 1 + Math.floor(rand() * 2) : 0;
      for (let k = 0; k < n; k++) {
        const gross = Math.round(p.price * (0.9 + rand() * 0.25) * 100) / 100;
        const fees = Math.round((gross * 0.095 + 0.45) * 100) / 100;
        orders.push({
          id: `mock-o-${orders.length}`,
          shop_id: p.shop_id,
          order_id: `MOCK-${orders.length}`,
          customer_name: "Mock Customer",
          product_id: p.id,
          gross_amount: gross,
          etsy_fees: fees,
          net_amount: Math.round((gross - fees) * 100) / 100,
          date,
        });
      }
    }
    for (const s of shops) {
      expenses.push({
        id: `mock-e-${s.id}-${d}`,
        shop_id: s.id,
        ad_spend: Math.round((8 + rand() * 18) * 100) / 100,
        listing_fees: Math.round(rand() * 1.4 * 100) / 100,
        offsite_ad_fees: rand() < 0.35 ? Math.round((2 + rand() * 9) * 100) / 100 : 0,
        date,
      });
    }
  }
  return { shops, products, orders, expenses };
}
