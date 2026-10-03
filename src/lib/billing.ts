/** Lemon Squeezy checkout link, configured via VITE_LEMON_CHECKOUT_URL. */
export const LEMON_CHECKOUT_URL: string = import.meta.env["VITE_LEMON_CHECKOUT_URL"] ?? "";

export type BillingVariant = "monthly" | "annual" | "lifetime";

export const PLANS: Record<BillingVariant, { label: string; price: string; cadence: string; note: string }> = {
  monthly: { label: "Pro Monthly", price: "$24", cadence: "/month", note: "Billed monthly, cancel anytime" },
  annual: { label: "Pro Annual", price: "$19", cadence: "/month", note: "Billed annually at $228/yr — save 20%" },
  lifetime: { label: "Lifetime Launch Deal", price: "$149", cadence: "one-time", note: "Strictly limited to the first 100 sellers" },
};

export const isCheckoutConfigured = () => Boolean(LEMON_CHECKOUT_URL);

/** Opens checkout. Returns false when no checkout link is configured (caller shows the waitlist). */
export function openCheckout(variant: BillingVariant) {
  if (!LEMON_CHECKOUT_URL) return false;
  const url = new URL(LEMON_CHECKOUT_URL);
  url.searchParams.set("checkout[custom][plan]", variant);
  window.open(url.toString(), "_blank", "noopener");
  return true;
}
