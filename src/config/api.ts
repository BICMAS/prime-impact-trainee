/**
 * Single source for API base URL and auth refresh contract.
 * Override via Vite env at build time (see .env.example).
 */

const DEV_API_V1 = "http://localhost:5000/api/v1";

/** Set `VITE_API_BASE_URL` in production when the backend is deployed. */
const PRODUCTION_API_V1_PENDING =
  "https://your-production-backend.example.com/api/v1";

function normalizeApiV1BaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
}

export function getApiV1BaseUrl(): string {
  const v = import.meta.env.VITE_API_BASE_URL?.trim();
  if (v) return normalizeApiV1BaseUrl(v);
  if (import.meta.env.DEV) return DEV_API_V1;
  return PRODUCTION_API_V1_PENDING;
}

/**
 * Full URL for refresh. Set VITE_AUTH_REFRESH_PATH to a path under VITE_API_BASE_URL
 * (e.g. /auth/refresh, /auth/refresh-token) or a full https URL if refresh lives elsewhere.
 */
export function getAuthRefreshUrl(): string {
  const path = import.meta.env.VITE_AUTH_REFRESH_PATH?.trim() || "/auth/refresh";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = getApiV1BaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * JSON body field name for the refresh token (default: refreshToken).
 * Set VITE_AUTH_REFRESH_TOKEN_FIELD to e.g. refresh_token if your API expects that.
 */
export function buildRefreshTokenRequestBody(refreshToken: string): string {
  const field =
    import.meta.env.VITE_AUTH_REFRESH_TOKEN_FIELD?.trim() || "refreshToken";
  return JSON.stringify({ [field]: refreshToken });
}
