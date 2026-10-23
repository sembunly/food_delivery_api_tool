# Food Delivery API Console

API testing dashboard for the Food Delivery Spring Boot API.

**API Testing Tool:** https://toolfooddelivery.bunli-it.site  
**Food Delivery API:** https://apifooddelivery.bunli-it.site

## Run locally

Start the Spring Boot API on port `8080`, then from this folder run:

```bash
node server.mjs
```

Open http://localhost:5500. The local server hosts the dashboard and proxies `/v1` requests to `http://localhost:8080`.

## Deploy to Vercel

1. Import this frontend folder as a Vercel project. Choose **Other** and leave the build command empty.
2. Add the environment variable `BACKEND_URL` with the public API origin, for example `https://apifooddelivery.bunli-it.site` (no `/v1` suffix). Do not set it to localhost.
3. Deploy, then add `toolfooddelivery.bunli-it.site` under the project's **Domains** and apply the DNS records Vercel provides.
4. Redeploy after adding or changing the environment variable.

Vercel serves the static dashboard and forwards `/v1/*` through the included API function to `BACKEND_URL`. The API base URL field starts blank and can be set to a custom API origin; leaving it blank uses the proxy. The local `node server.mjs` setup continues to proxy to `http://localhost:8080`.
