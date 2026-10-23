// Use the frontend origin; server.mjs forwards /v1 requests to Spring Boot.
globalThis.APP_CONFIG = {
  API_BASE_URL: window.location.origin,
};

// Keep the named export used by js/api.js.
export const API_BASE_URL = globalThis.APP_CONFIG.API_BASE_URL;
