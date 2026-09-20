import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ALL_SHOPS, fetchAllData, generateMockData, type Shop, type ShopData } from "@/lib/data";

export type Plan = "free" | "pro";

export const FREE_SHOP_LIMIT = 1;
export const FREE_HISTORY_DAYS = 30;

interface ShopContextValue {
  data: ShopData | undefined;
  isLoading: boolean;
  selectedShop: string; // shop id or ALL_SHOPS
  setSelectedShop: (id: string) => void;
  mockMode: boolean;
  setMockMode: (v: boolean) => void;
  filtered: ShopData | undefined;
  refresh: () => void;
  /** Shops visible under the current plan (free plan sees only the first shop). */
  visibleShops: Shop[];
  /** True when the dashboard is showing simulated data rather than a connected shop. */
  isDemo: boolean;
  /** True when at least one shop has live connection credentials. */
  hasConnectedShop: boolean;
  plan: Plan;
  setPlan: (p: Plan) => void;
  upgradeOpen: boolean;
  openUpgrade: () => void;
  setUpgradeOpen: (v: boolean) => void;
  onboarded: boolean;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
}

const ShopCtx = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedShop, setSelectedShop] = useState<string>(ALL_SHOPS);
  const [mockMode, setMockMode] = useState(false);
  const [plan, setPlanState] = useState<Plan>("free");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(true); // assume true until hydrated to avoid SSR flash

  useEffect(() => {
    const saved = window.localStorage.getItem("etsy-ops-mock");
    const firstVisit = window.localStorage.getItem("etsy-ops-onboarded") !== "1";
    const shouldUseDemo = saved === "1" || (saved === null && firstVisit);
    setMockMode(shouldUseDemo);
    if (saved === null && firstVisit) window.localStorage.setItem("etsy-ops-mock", "1");
    const savedShop = window.localStorage.getItem("etsy-ops-shop");
    if (savedShop) setSelectedShop(savedShop);
    const savedPlan = window.localStorage.getItem("etsy-ops-plan");
    if (savedPlan === "pro") setPlanState("pro");
    setOnboarded(window.localStorage.getItem("etsy-ops-onboarded") === "1");
  }, []);

  const query = useQuery({
    queryKey: ["shop-data"],
    queryFn: fetchAllData,
    staleTime: 30_000,
  });

  const mock = useMemo(() => (mockMode ? generateMockData() : undefined), [mockMode]);
  const data = mockMode ? mock : query.data;

  const connectedCount = (query.data?.shops ?? []).filter((s) => s.api_key).length;
  const hasConnectedShop = connectedCount > 0;
  const isDemo = mockMode;

  const visibleShops = useMemo(() => {
    const shops = data?.shops ?? [];
    return plan === "free" ? shops.slice(0, FREE_SHOP_LIMIT) : shops;
  }, [data, plan]);

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const allowedIds = new Set(visibleShops.map((s) => s.id));
    const cutoff =
      plan === "free" ? new Date(Date.now() - FREE_HISTORY_DAYS * 86400000).toISOString().slice(0, 10) : null;

    const inScope = (shopId: string) =>
      allowedIds.has(shopId) && (selectedShop === ALL_SHOPS || shopId === selectedShop);

    return {
      shops: visibleShops,
      products: data.products.filter((p) => inScope(p.shop_id)),
      orders: data.orders.filter((o) => inScope(o.shop_id) && (!cutoff || o.date >= cutoff)),
      expenses: data.expenses.filter((e) => inScope(e.shop_id) && (!cutoff || e.date >= cutoff)),
    };
  }, [data, selectedShop, visibleShops, plan]);

  const value: ShopContextValue = {
    data,
    isLoading: !mockMode && query.isLoading,
    selectedShop,
    setSelectedShop: (id) => {
      setSelectedShop(id);
      window.localStorage.setItem("etsy-ops-shop", id);
    },
    mockMode,
    setMockMode: (v) => {
      setMockMode(v);
      window.localStorage.setItem("etsy-ops-mock", v ? "1" : "0");
    },
    filtered,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["shop-data"] }),
    visibleShops,
    isDemo,
    hasConnectedShop,
    plan,
    setPlan: (p) => {
      setPlanState(p);
      window.localStorage.setItem("etsy-ops-plan", p);
    },
    upgradeOpen,
    openUpgrade: () => setUpgradeOpen(true),
    setUpgradeOpen,
    onboarded,
    completeOnboarding: () => {
      setOnboarded(true);
      window.localStorage.setItem("etsy-ops-onboarded", "1");
    },
    restartOnboarding: () => {
      setOnboarded(false);
      window.localStorage.removeItem("etsy-ops-onboarded");
    },
  };

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShops() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error("useShops must be used inside ShopProvider");
  return ctx;
}
