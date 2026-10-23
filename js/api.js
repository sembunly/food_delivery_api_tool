import { API_BASE_URL } from './config.js';

export class ApiError extends Error {
  constructor(message, { status, statusText, data, headers, url }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.headers = headers;
    this.url = url;
  }
}

export class NetworkError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'NetworkError';
  }
}

async function readResponse(response) {
  if (response.status === 204 || response.status === 205) return null;

  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      // Keep the raw body so non-JSON error pages still report their HTTP status.
      return text;
    }
  }
  return text;
}

async function send(method, path, options = {}) {
  const requestUrl = /^https?:\/\//i.test(String(path))
    ? String(path)
    : `${API_BASE_URL.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
  const headers = new Headers(options.headers || {});
  const fetchOptions = {
    ...options,
    method,
    headers,
  };
  delete fetchOptions.body;
  delete fetchOptions.headers;

  if (options.body !== undefined && options.body !== null) {
    if (options.body instanceof FormData || typeof options.body === 'string' || options.body instanceof Blob) {
      fetchOptions.body = options.body;
    } else {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  headers.set('Accept', 'application/json');

  let response;
  try {
    response = await fetch(requestUrl, { ...fetchOptions, headers });
  } catch (cause) {
    throw new NetworkError(`Could not reach the API at ${requestUrl}.`, cause);
  }

  const data = await readResponse(response);
  return {
    data,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    url: response.url || requestUrl,
  };
}

async function request(method, path, options = {}) {
  const result = await send(method, path, options);
  if (!result.ok) {
    throw new ApiError(
      result.data && typeof result.data === 'object' && result.data.message
        ? result.data.message
        : `Request failed with ${result.status} ${result.statusText}.`,
      { status: result.status, statusText: result.statusText, data: result.data, headers: result.headers, url: result.url },
    );
  }
  return result.data;
}

export const api = {
  request,
  detailed: send,
  get: (path, options) => request('GET', path, options),
  post: (path, body, options = {}) => request('POST', path, { ...options, body }),
  put: (path, body, options = {}) => request('PUT', path, { ...options, body }),
  patch: (path, body, options = {}) => request('PATCH', path, { ...options, body }),
  delete: (path, options = {}) => request('DELETE', path, options),
};

// Usage (in another ES module):
// import { api } from './api.js';
// const users = await api.get('/v1/users');
// const user = await api.post('/v1/users', { name: 'Sam' });
// await api.put(`/v1/users/${id}`, { name: 'Sam' });
// await api.patch(`/v1/users/${id}`, { name: 'Sam' });
// await api.delete(`/v1/users/${id}`);
