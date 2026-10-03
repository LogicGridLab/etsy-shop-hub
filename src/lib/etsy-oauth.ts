/** Etsy Open API v3 — OAuth 2.0 authorization code flow with PKCE (browser side). */
export const ETSY_CLIENT_ID: string = import.meta.env["VITE_ETSY_CLIENT_ID"] ?? "";
export const ETSY_SCOPES = "transactions_r listings_r shops_r profile_r";

export const isEtsyOAuthReady = () => Boolean(ETSY_CLIENT_ID);

export const etsyRedirectUri = () => `${window.location.origin}/etsy/callback`;

function base64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function startEtsyOAuth() {
  if (!ETSY_CLIENT_ID) return false;
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem("etsy-pkce-verifier", verifier);
  sessionStorage.setItem("etsy-pkce-state", state);
  const url = new URL("https://www.etsy.com/oauth/connect");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", ETSY_CLIENT_ID);
  url.searchParams.set("redirect_uri", etsyRedirectUri());
  url.searchParams.set("scope", ETSY_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  window.location.assign(url.toString());
  return true;
}
