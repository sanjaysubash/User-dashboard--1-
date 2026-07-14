// Defaults to the real deployed dashboard so a packaged installer works out
// of the box on a pilot employee's machine (env vars set on your own dev
// machine don't carry over to theirs). Override with RIAURA_API_URL only
// for local testing against a dev server.
export const API_BASE_URL = process.env.RIAURA_API_URL || "https://riauramanagement.aaruchudar.in";

export const POLL_INTERVAL_MS = 20_000;
export const NETWORK_LIST_REFRESH_MS = 60 * 60 * 1000; // 1 hour
export const RESYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour, self-heals missed transitions
