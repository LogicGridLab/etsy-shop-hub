/** Etsy 1-click connect: the server handles PKCE and keeps Etsy secrets private. */
export function startEtsyOAuth() {
  window.location.assign("/api/etsy/start");
  return true;
}
