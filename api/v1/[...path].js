const http = require('node:http');
const https = require('node:https');

const HOP_BY_HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function sendError(response, status, message) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ message }));
}

module.exports = function proxyApiRequest(request, response) {
  let backend;
  try {
    if (!process.env.BACKEND_URL) throw new Error('BACKEND_URL is not configured.');
    backend = new URL(process.env.BACKEND_URL);
    if (!['http:', 'https:'].includes(backend.protocol)) throw new Error('BACKEND_URL must use HTTP or HTTPS.');
    if (['localhost', '127.0.0.1', '::1'].includes(backend.hostname)) {
      throw new Error('BACKEND_URL must point to a publicly reachable server.');
    }
  } catch (error) {
    return sendError(response, 500, error.message);
  }

  const incoming = new URL(request.url, 'http://vercel.local');
  const apiPath = incoming.pathname.replace(/^\/api\/v1(?=\/|$)/, '') || '/';
  const target = new URL(`${backend.pathname.replace(/\/$/, '')}/v1${apiPath}${incoming.search}`, backend);
  const transport = target.protocol === 'https:' ? https : http;
  const headers = { ...request.headers };
  for (const name of HOP_BY_HOP_HEADERS) delete headers[name];
  delete headers.host;
  headers.host = target.host;

  const upstream = transport.request(target, { method: request.method, headers }, (upstreamResponse) => {
    const responseHeaders = { ...upstreamResponse.headers };
    for (const name of HOP_BY_HOP_HEADERS) delete responseHeaders[name];
    response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
    upstreamResponse.pipe(response);
  });

  upstream.on('error', () => {
    if (!response.headersSent) sendError(response, 502, 'Unable to reach the configured API server.');
    else response.destroy();
  });
  request.pipe(upstream);
};

module.exports.config = { api: { bodyParser: false } };
