import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 5500);
const API_HOST = 'localhost';
const API_PORT = 8080;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendText(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function proxyApiRequest(request, response) {
  const headers = { ...request.headers, host: `${API_HOST}:${API_PORT}` };
  const upstream = http.request({
    hostname: API_HOST,
    port: API_PORT,
    method: request.method,
    path: request.url,
    headers,
  }, (apiResponse) => {
    response.writeHead(apiResponse.statusCode || 502, apiResponse.headers);
    apiResponse.pipe(response);
  });

  upstream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Dev-Proxy-Error': 'spring-boot-unavailable',
      });
    }
    response.end(JSON.stringify({ message: 'Spring Boot API is unavailable.' }));
  });
  request.pipe(upstream);
}

function serveFile(request, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    return sendText(response, 400, 'Invalid URL');
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = resolve(ROOT, `.${pathname}`);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) {
    return sendText(response, 403, 'Forbidden');
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return sendText(response, 404, 'Not found');
  }

  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(filePath).pipe(response);
}

http.createServer((request, response) => {
  if (request.url.startsWith('/v1/')) return proxyApiRequest(request, response);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return sendText(response, 405, 'Method not allowed');
  }
  serveFile(request, response);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Proxying /v1/* to http://${API_HOST}:${API_PORT}`);
});
