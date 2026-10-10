/** Server-only Etsy OAuth helpers: token encryption, Etsy API calls, token storage. */
const ETSY_API = "https://api.etsy.com/v3";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server secret ${name}`);
  return v;
}

/** Etsy requires x-api-key as "keystring:shared_secret". */
export function etsyApiKeyHeader() {
  return `${env("ETSY_API_KEY")}:${env("ETSY_SHARED_SECRET")}`;
}
export const etsyClientId = () => env("ETSY_API_KEY");

async function aesKey() {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env("ETSY_TOKEN_ENCRYPTION_KEY")));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptToken(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain)));
  return `${b64(iv)}.${b64(ct)}`;
}
export async function decryptToken(enc: string) {
  const [iv, ct] = enc.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv!) }, await aesKey(), unb64(ct!));
  return new TextDecoder().decode(pt);
}

export function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface TokenResponse { access_token: string; refresh_token: string; expires_in: number }

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${ETSY_API}/public/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "x-api-key": etsyApiKeyHeader() },
    body: new URLSearchParams({ client_id: etsyClientId(), ...params }),
  });
  if (!res.ok) throw new Error(`Etsy token request failed [${res.status}]: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export const exchangeCode = (code: string, verifier: string, redirectUri: string) =>
  tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri });

export const refreshTokens = (refreshToken: string) =>
  tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

export async function etsyGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${ETSY_API}${path}`, {
    headers: { "x-api-key": etsyApiKeyHeader(), Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Etsy API ${path} failed [${res.status}]: ${await res.text()}`);
  return (await res.json()) as T;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Encrypts and stores fresh tokens for a connected shop. */
export async function storeTokens(connectedId: string, t: TokenResponse) {
  const sb = await admin();
  const { error } = await sb
    .from("connected_shops")
    .update({
      access_token_encrypted: await encryptToken(t.access_token),
      refresh_token_encrypted: await encryptToken(t.refresh_token),
      token_expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectedId);
  if (error) throw new Error(error.message);
}

/** Returns a valid access token for a connected shop, refreshing when near expiry. */
export async function getAccessToken(row: { id: string; access_token_encrypted: string; refresh_token_encrypted: string; token_expires_at: string }) {
  if (new Date(row.token_expires_at).getTime() - Date.now() > 5 * 60 * 1000) return decryptToken(row.access_token_encrypted);
  const t = await refreshTokens(await decryptToken(row.refresh_token_encrypted));
  await storeTokens(row.id, t);
  return t.access_token;
}

/** Refreshes every token that expires within the next 15 minutes. */
export async function refreshExpiringTokens() {
  const sb = await admin();
  const { data, error } = await sb
    .from("connected_shops")
    .select("id, refresh_token_encrypted")
    .lt("token_expires_at", new Date(Date.now() + 15 * 60 * 1000).toISOString());
  if (error) throw new Error(error.message);
  let refreshed = 0;
  for (const row of data ?? []) {
    try {
      await storeTokens(row.id, await refreshTokens(await decryptToken(row.refresh_token_encrypted)));
      refreshed++;
    } catch (e) {
      console.error("Etsy token refresh failed for", row.id, e);
    }
  }
  return { checked: data?.length ?? 0, refreshed };
}
