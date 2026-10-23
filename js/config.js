globalThis.APP_CONFIG = {
  API_BASE_URL: null,
};

// A blank value uses the same-origin proxy; the dashboard can set a custom URL.
export function getApiBaseUrl() {
  return globalThis.APP_CONFIG.API_BASE_URL;
}
