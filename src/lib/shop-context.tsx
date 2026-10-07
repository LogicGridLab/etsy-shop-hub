import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { validateLicense } from "@/lib/license.functions";
import { ALL_SHOPS, fetchAllData, generateMockData, setActiveCurrency, type CurrencyCode, type Shop, type ShopData } from "@/lib/data";

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
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  /** Locally overrides product unit costs (used in demo mode). */
  setUnitCost: (productId: string, cost: number) => void;
  /** Lemon Squeezy license state. "checking" until validated on load. */
  licenseStatus: "none" | "checking" | "valid" | "invalid";
  activateLicense: (key: string, email?: string) => Promise<{ ok: boolean; error?: string | null }>;
}

const ShopCtx = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedShop, setSelectedShop] = useState<string>(ALL_SHOPS);
  const [mockMode, setMockMode] = useState(false);
  const [plan, setPlanState] = useState<Plan>("free");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<ShopContextValue["licenseStatus"]>("none");
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const [onboarded, setOnboarded] = useState(true); // assume true until hydrated to avoid SSR flash

  useEffect(() => {
    const saved = window.localStorage.getItem("etsy-ops-mock");
    const firstVisit = window.localStorage.getItem("etsy-ops-onboarded") !== "1";
    const shouldUseDemo = saved === "1" || (saved === null && firstVisit);
    setMockMode(shouldUseDemo);
    if (saved === null && firstVisit) window.localStorage.setItem("etsy-ops-mock", "1");
    const savedShop = window.localStorage.getItem("etsy-ops-shop");
    if (savedShop) setSelectedShop(savedShop);
    const savedKey = window.localStorage.getItem("etsy-ops-license");
    if (savedKey) {
      setLicenseStatus("checking");
      validateLicense({ data: { license_key: savedKey, email: window.localStorage.getItem("etsy-ops-license-email") ?? "" } })
        .then((r) => {
          setLicenseStatus(r.valid ? "valid" : "invalid");
          setPlanState(r.valid ? "pro" : "free");
        })
        .catch(() => setLicenseStatus("invalid"));
    }
    setOnboarded(window.localStorage.getItem("etsy-ops-onboarded") === "1");
    const savedCur = window.localStorage.getItem("etsy-ops-currency") as CurrencyCode | null;
    if (savedCur) {
      setActiveCurrency(savedCur);
      setCurrencyState(savedCur);
    }
    try {
      setCostOverrides(JSON.parse(window.localStorage.getItem("etsy-ops-costs") ?? "{}"));
    } catch {
      /* ignore */
    }
  }, []);

  const query = useQuery({
    queryKey: ["shop-data"],
    queryFn: fetchAllData,
    staleTime: 30_000,
  });

  const mock = useMemo(() => (mockMode ? generateMockData() : undefined), [mockMode]);
  const rawData = mockMode ? mock : query.data;
  const data = useMemo(() => {
    if (!rawData) return rawData;
    return {
      ...rawData,
      products: rawData.products.map((p) =>
        costOverrides[p.id] !== undefined ? { ...p, unit_cost: costOverrides[p.id]! } : p,
      ),
    };
  }, [rawData, costOverrides]);

  const connectedCount = (query.data?.shops ?? []).length;
  const hasConnectedShop = connectedCount > 0;
  const isDemo = mockMode;

  const visibleShops = useMemo(() => {
    const shops = data?.shops ?? [];
    // Demo data is never plan-locked: sellers can explore every sample shop.
    return plan === "free" && !mockMode ? shops.slice(0, FREE_SHOP_LIMIT) : shops;
  }, [data, plan, mockMode]);

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const allowedIds = new Set(visibleShops.map((s) => s.id));
    const cutoff =
      plan === "free" && !mockMode ? new Date(Date.now() - FREE_HISTORY_DAYS * 86400000).toISOString().slice(0, 10) : null;

    const inScope = (shopId: string) =>
      allowedIds.has(shopId) && (selectedShop === ALL_SHOPS || shopId === selectedShop);

    return {
      shops: visibleShops,
      products: data.products.filter((p) => inScope(p.shop_id)),
      orders: data.orders.filter((o) => inScope(o.shop_id) && (!cutoff || o.date >= cutoff)),
      expenses: data.expenses.filter((e) => inScope(e.shop_id) && (!cutoff || e.date >= cutoff)),
    };
  }, [data, selectedShop, visibleShops, plan, mockMode]);

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
    setPlan: (p) => setPlanState(p),
    licenseStatus,
    activateLicense: async (key, email) => {
      setLicenseStatus("checking");
      try {
        const r = await validateLicense({ data: { license_key: key.trim(), email: email?.trim() ?? "" } });
        if (r.valid) {
          window.localStorage.setItem("etsy-ops-license", key.trim());
          if (r.email) window.localStorage.setItem("etsy-ops-license-email", r.email);
          setPlanState("pro");
          setLicenseStatus("valid");
          setUpgradeOpen(false);
          return { ok: true };
        }
        setLicenseStatus("invalid");
        return { ok: false, error: r.error };
      } catch {
        setLicenseStatus("invalid");
        return { ok: false, error: "Couldn't reach the license server. Please try again." };
      }
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
    currency,
    setCurrency: (c) => {
      setActiveCurrency(c);
      setCurrencyState(c);
      window.localStorage.setItem("etsy-ops-currency", c);
    },
    setUnitCost: (productId, cost) => {
      setCostOverrides((prev) => {
        const next = { ...prev, [productId]: cost };
        window.localStorage.setItem("etsy-ops-costs", JSON.stringify(next));
        return next;
      });
    },
  };

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShops() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error("useShops must be used inside ShopProvider");
  return ctx;
}
