/** Lemon Squeezy checkout link, configured via VITE_LEMON_CHECKOUT_URL. */
export const LEMON_CHECKOUT_URL: string = import.meta.env['VITE_LEMON_CHECKOUT_URL'] ?? "";

export const PRICING = {
  monthly: "$29/mo",
  lifetime: "$19 lifetime launch",
} as const;

export function openCheckout(variant: "monthly" | "lifetime") {
  if (!LEMON_CHECKOUT_URL) return false;
  const url = new URL(LEMON_CHECKOUT_URL);
  url.searchParams.set("checkout[custom][plan]", variant);
  window.open(url.toString(), "_blank", "noopener");
  return true;
}
