import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ALL_SHOPS, fetchAllData, generateMockData, type ShopData } from "@/lib/data";

interface ShopContextValue {
  data: ShopData | undefined;
  isLoading: boolean;
  selectedShop: string; // shop id or ALL_SHOPS
  setSelectedShop: (id: string) => void;
  mockMode: boolean;
  setMockMode: (v: boolean) => void;
  filtered: ShopData | undefined;
  refresh: () => void;
}

const ShopCtx = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedShop, setSelectedShop] = useState<string>(ALL_SHOPS);
  const [mockMode, setMockMode] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("etsy-ops-mock");
    if (saved === "1") setMockMode(true);
    const savedShop = window.localStorage.getItem("etsy-ops-shop");
    if (savedShop) setSelectedShop(savedShop);
  }, []);

  const query = useQuery({
    queryKey: ["shop-data"],
    queryFn: fetchAllData,
    staleTime: 30_000,
  });

  const mock = useMemo(() => (mockMode ? generateMockData() : undefined), [mockMode]);
  const data = mockMode ? mock : query.data;

  const filtered = useMemo(() => {
    if (!data) return undefined;
    if (selectedShop === ALL_SHOPS) return data;
    return {
      shops: data.shops,
      products: data.products.filter((p) => p.shop_id === selectedShop),
      orders: data.orders.filter((o) => o.shop_id === selectedShop),
      expenses: data.expenses.filter((e) => e.shop_id === selectedShop),
    };
  }, [data, selectedShop]);

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
  };

  return <ShopCtx.Provider value={value}>{children}</ShopCtx.Provider>;
}

export function useShops() {
  const ctx = useContext(ShopCtx);
  if (!ctx) throw new Error("useShops must be used inside ShopProvider");
  return ctx;
}
