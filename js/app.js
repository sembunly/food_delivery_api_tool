import { API_BASE_URL } from './config.js';
import { api, NetworkError } from './api.js';

const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };
const ACCEPT_HEADER = { Accept: 'application/json' };
const EMPTY_OBJECT = '{}';

// Route list transcribed from the Spring controller mappings. PATCH remains available
// in the method selector for custom requests; no controller PATCH mapping was found.
const CONTROLLERS = [
  {
    name: 'Delivery partners', className: 'DeliveryPartnerRestController', icon: 'DP',
    endpoints: [
      endpoint('POST', '/v1/delivery-partner', 'Create delivery partner', 'DeliveryPartnerRequest', { first_name: '', last_name: '', username: '', password: '', gender: '', dob: '', phone_number: '', email: '', address: '', vehicle: '', available: false }),
      endpoint('PUT', '/v1/delivery-partner/{id}', 'Update delivery partner', 'DeliveryPartnerRequest', { first_name: '', last_name: '', username: '', password: '', gender: '', dob: '', phone_number: '', email: '', address: '', vehicle: '', available: false }),
      endpoint('DELETE', '/v1/delivery-partner/{id}', 'Delete delivery partner'),
      endpoint('GET', '/v1/delivery-partner/{id}', 'Find delivery partner by ID'),
      endpoint('GET', '/v1/delivery-partner', 'Find all delivery partners'),
    ],
  },
  {
    name: 'Menu item photos', className: 'MenuItemPhotoRestController', icon: 'PH',
    endpoints: [
      endpoint('POST', '/v1/menu-item/photo/upload', 'Upload menu item photos', 'Multipart file upload', null, {
        upload: true,
        hint: 'Mapping consumes multipart/form-data and expects one or more files in the files field. Other request fields can be supplied as query parameters.',
      }),
      endpoint('PUT', '/v1/menu-item/photo/{id}', 'Update menu item photo', 'MenuItemPhotoRequest', { id: null, file_type: '', file_format: '', file_size: 0, file_name: '', small_url: '', medium_url: '', large_url: '', uploaded_by: '', status: '' }),
      endpoint('DELETE', '/v1/menu-item/photo/{id}', 'Delete menu item photo'),
      endpoint('GET', '/v1/menu-item/photo/{id}', 'Find menu item photo by ID'),
      endpoint('GET', '/v1/menu-item/photo', 'Find all menu item photos'),
    ],
  },
  {
    name: 'Menu items', className: 'MenuItemRestController', icon: 'MI',
    endpoints: [
      endpoint('POST', '/v1/menu-item', 'Create menu item', 'MenuItemRequest', { code: '', name: '', description: '', price: 0, availability: 1, restaurant_id: null, menu_item_photo: [] }, 'Create verifies menu_item_photo IDs; upload a photo first and provide its returned ID.'),
      endpoint('PUT', '/v1/menu-item/{id}', 'Update menu item', 'MenuItemRequest', { code: '', name: '', description: '', price: 0, availability: 1, restaurant_id: null, menu_item_photo: [] }),
      endpoint('DELETE', '/v1/menu-item/{id}', 'Delete menu item'),
      endpoint('GET', '/v1/menu-item/{id}', 'Find menu item by ID'),
      endpoint('GET', '/v1/menu-item', 'Find all menu items'),
    ],
  },
  {
    name: 'Orders', className: 'OrderRestController', icon: 'OR',
    endpoints: [
      endpoint('POST', '/v1/orders', 'Create order', 'OrderRequest', {
        order_date: '', delivery_time: '', total_amount: 0, tax: 0, delivery_fee: 0, order_status: 'PENDING',
        user_id: null, user_phone_number: '', restaurant_id: null,
        order_items: [{ quantity: 1, price: 0, order_menu_item: [{ code: '', name: '', description: '', price: 0 }] }],
        payment: { amount: 0, payment_method: 'CASH', payment_description: '' },
      }, 'Requires an existing user, restaurant, non-empty order_items, and an available delivery partner. Payment method values: CASH, BANK, CARD.'),
      endpoint('PUT', '/v1/orders', 'Update order status', 'OrderStatusRequest', { id: null, order_id: '', order_status: 'PENDING' }, 'Status transitions handled by the service: PENDING, PREPARING, OUT_FOR_DELIVERY.'),
    ],
  },
  {
    name: 'Restaurants', className: 'RestaurantRestController', icon: 'RE',
    endpoints: [
      endpoint('POST', '/v1/restaurants', 'Create restaurant', 'RestaurantRequest', { code: '', name: '', category: '', description: '', rating: 0, address: '', phone_number: '', logo_url: '', open_time: '', close_time: '' }),
      endpoint('PUT', '/v1/restaurants/{id}', 'Update restaurant', 'RestaurantRequest', { code: '', name: '', category: '', description: '', rating: 0, address: '', phone_number: '', logo_url: '', open_time: '', close_time: '' }),
      endpoint('DELETE', '/v1/restaurants/{id}', 'Delete restaurant'),
      endpoint('GET', '/v1/restaurants/{id}', 'Find restaurant by ID'),
      endpoint('GET', '/v1/restaurants', 'Find all restaurants'),
    ],
  },
  {
    name: 'Users', className: 'UserRestController', icon: 'US',
    endpoints: [
      endpoint('POST', '/v1/users', 'Create user', 'UserRequest', { id: null, username: '', first_name: '', last_name: '', gender: '', dob: '', email: '', phone_number: '', address: '', user_type: 'REGULAR', status: 'ACTIVE', device_info: null }),
      endpoint('PUT', '/v1/users/{id}', 'Update user', 'UserRequest', { id: null, username: '', first_name: '', last_name: '', gender: '', dob: '', email: '', phone_number: '', address: '', user_type: 'REGULAR', status: 'ACTIVE', device_info: null }),
      endpoint('DELETE', '/v1/users/{id}', 'Delete user'),
      endpoint('GET', '/v1/users/{id}', 'Find user by ID'),
      endpoint('GET', '/v1/users', 'Find all users'),
    ],
  },
  {
    name: 'Todos', className: 'TodoRestController', icon: 'TD',
    endpoints: [
      endpoint('POST', '/v1/todos', 'Create todo', 'TodoRequest', { title: '', description: '', completed: false }),
      endpoint('PUT', '/v1/todos/{id}', 'Update todo', 'TodoRequest', { title: '', description: '', completed: false }),
      endpoint('DELETE', '/v1/todos/{id}', 'Delete todo'),
      endpoint('GET', '/v1/todos/{id}', 'Get todo by ID'),
      endpoint('GET', '/v1/todos', 'Get all todos'),
    ],
  },
];

function endpoint(method, path, title, dto = '', body = null, options = {}) {
  return { method, path, title, dto, body, ...options };
}

const byId = (id) => document.getElementById(id);
const controllerList = byId('controller-list');
const endpointWorkspace = byId('endpoint-workspace');
const endpointEmpty = byId('endpoint-empty');
const methodSelect = byId('request-method');
const urlInput = byId('request-url');
const bodyEditor = byId('body-editor');
const headerEditor = byId('headers-editor');
const queryEditor = byId('query-editor');
const uploadBlock = byId('upload-block');
const bodyEditorBlock = byId('body-editor-block');
const responseSummary = byId('response-summary');
const responseWaiting = byId('response-waiting');
const responseResult = byId('response-result');
const requestError = byId('request-error');
const connectionDialog = byId('connection-dialog');
const connectionRetry = byId('connection-retry');
const connectionMessage = byId('connection-message');
const connectionState = byId('connection-state');

let selectedEndpoint = null;
let requestPending = false;
let connectionPending = false;

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

function requestUrl(path) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

function renderSidebar() {
  controllerList.innerHTML = CONTROLLERS.map((controller, index) => `
    <details class="controller-group" ${index === 0 ? 'open' : ''}>
      <summary><span class="group-chevron" aria-hidden="true">›</span><span class="group-icon">${controller.icon}</span><span>${controller.name}</span><span class="group-count">${controller.endpoints.length}</span></summary>
      <div class="endpoint-list">
        ${controller.endpoints.map((route) => `
          <button class="endpoint-link" type="button" data-endpoint="${CONTROLLERS.indexOf(controller)}:${controller.endpoints.indexOf(route)}" title="${route.method} ${route.path}">
            <span class="method-mini ${route.method.toLowerCase()}">${route.method}</span><span class="endpoint-path">${route.path}</span>
          </button>`).join('')}
      </div>
    </details>`).join('');
}

function selectedController() {
  return CONTROLLERS.find((controller) => controller.endpoints.includes(selectedEndpoint));
}

function renderPathParams() {
  const params = [...selectedEndpoint.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const container = byId('path-params');
  container.innerHTML = params.map((name) => `
    <label class="path-param">${name}<input type="text" data-path-param="${name}" placeholder="Enter ${name}" autocomplete="off"></label>`).join('');
  container.querySelectorAll('[data-path-param]').forEach((input) => input.addEventListener('input', updatePathUrl));
}

function updatePathUrl() {
  if (!selectedEndpoint) return;
  let path = selectedEndpoint.path;
  byId('path-params').querySelectorAll('[data-path-param]').forEach((input) => {
    const value = input.value.trim();
    if (value) path = path.replace(`{${input.dataset.pathParam}}`, encodeURIComponent(value));
  });
  urlInput.value = requestUrl(path);
}

function selectEndpoint(controllerIndex, endpointIndex) {
  selectedEndpoint = CONTROLLERS[controllerIndex]?.endpoints[endpointIndex];
  if (!selectedEndpoint) return;

  document.querySelectorAll('.endpoint-link').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.endpoint === `${controllerIndex}:${endpointIndex}`);
  });
  const controller = CONTROLLERS[controllerIndex];
  endpointEmpty.hidden = true;
  endpointWorkspace.hidden = false;
  byId('endpoint-controller').textContent = `${controller.className} · ${selectedEndpoint.dto || 'No request DTO'}`;
  byId('endpoint-title').textContent = selectedEndpoint.title;
  byId('endpoint-description').textContent = `${selectedEndpoint.method} ${selectedEndpoint.path}${selectedEndpoint.hint ? ` — ${selectedEndpoint.hint}` : ''}`;
  methodSelect.value = selectedEndpoint.method;
  renderPathParams();
  updatePathUrl();
  queryEditor.value = EMPTY_OBJECT;
  headerEditor.value = jsonText(selectedEndpoint.upload ? ACCEPT_HEADER : selectedEndpoint.body ? JSON_HEADERS : ACCEPT_HEADER);
  bodyEditor.value = selectedEndpoint.body ? jsonText(selectedEndpoint.body) : '';
  bodyEditor.disabled = !selectedEndpoint.body || selectedEndpoint.upload || ['GET', 'DELETE'].includes(selectedEndpoint.method);
  bodyEditorBlock.hidden = selectedEndpoint.upload;
  uploadBlock.hidden = !selectedEndpoint.upload;
  byId('body-content-type').textContent = selectedEndpoint.upload ? 'multipart/form-data' : 'application/json';
  byId('body-hint').textContent = selectedEndpoint.hint || '';
  byId('upload-files').value = '';
  byId('request-error').hidden = true;
  resetResponse();
  updateMethodStyle();
  byId('sidebar').classList.remove('is-open');
  byId('mobile-menu').setAttribute('aria-expanded', 'false');
}

function updateMethodStyle() {
  methodSelect.className = `method-text ${methodSelect.value.toLowerCase()}`;
  if (!selectedEndpoint) return;
  bodyEditor.disabled = selectedEndpoint.upload || ['GET', 'DELETE'].includes(methodSelect.value);
}

function resetResponse() {
  responseSummary.hidden = true;
  responseResult.hidden = true;
  responseWaiting.hidden = false;
  byId('response-caption').textContent = 'Waiting for request';
}

function setConnectionStatus(online, label) {
  connectionState.classList.toggle('is-online', online);
  connectionState.classList.toggle('is-offline', !online);
  connectionState.lastElementChild.textContent = label;
}

async function checkConnection() {
  if (connectionPending) return;
  connectionPending = true;
  connectionDialog.setAttribute('aria-busy', 'true');
  connectionMessage.textContent = 'Checking the Food Delivery API…';
  connectionRetry.disabled = true;
  connectionRetry.textContent = 'Checking…';
  if (!connectionDialog.open) connectionDialog.showModal();
  setConnectionStatus(false, 'Checking API…');

  try {
    // Use an existing controller route for the check; no health endpoint is assumed.
    const result = await api.detailed('GET', requestUrl('/v1/restaurants'), { headers: ACCEPT_HEADER });
    if (result.headers['x-dev-proxy-error'] === 'spring-boot-unavailable') {
      throw new NetworkError('Spring Boot API is unavailable.');
    }
    connectionDialog.close();
    setConnectionStatus(true, 'API connected');
  } catch (error) {
    if (error instanceof NetworkError) {
      setConnectionStatus(false, 'API unavailable');
      connectionDialog.setAttribute('aria-busy', 'false');
      connectionMessage.textContent = 'Unable to connect to the API server. Check that Spring Boot is running, then retry.';
      connectionRetry.disabled = false;
      connectionRetry.textContent = 'Retry connection';
    } else {
      // Any HTTP response confirms that the API server can be reached.
      connectionDialog.close();
      setConnectionStatus(true, 'API connected');
    }
  } finally {
    connectionPending = false;
  }
}

function parseJsonObject(text, label) {
  let value;
  try {
    value = JSON.parse(text || '{}');
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

function applyQueryParams(url, params) {
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value)) value.forEach((entry) => url.searchParams.append(key, String(entry)));
    else url.searchParams.set(key, String(value));
  });
}

function renderResponse(result, elapsedMs) {
  const bodyText = result.data === null || result.data === undefined
    ? 'No response body.'
    : typeof result.data === 'string' ? result.data : jsonText(result.data);
  const headersText = Object.entries(result.headers || {}).map(([key, value]) => `${key}: ${value}`).join('\n') || 'No response headers.';
  const size = new TextEncoder().encode(bodyText).length;

  responseWaiting.hidden = true;
  responseSummary.hidden = false;
  responseResult.hidden = false;
  byId('response-caption').textContent = result.ok ? 'Request completed' : 'Request returned an error';
  const status = byId('response-status');
  status.textContent = `${result.status} ${result.statusText || ''}`.trim();
  status.classList.toggle('is-error', !result.ok);
  byId('response-time').textContent = `${Math.round(elapsedMs)} ms`;
  byId('response-size').textContent = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
  byId('response-headers').textContent = headersText;
  byId('response-body').textContent = bodyText;
  if (!result.ok) setConnectionStatus(true, 'API connected');
}

async function sendRequest() {
  if (!selectedEndpoint || requestPending) return;
  requestPending = true;
  requestError.hidden = true;
  const sendButton = byId('send-request');
  sendButton.disabled = true;
  sendButton.innerHTML = '<span>Sending…</span><span class="loader-small" aria-hidden="true"></span>';
  byId('response-caption').textContent = 'Request in progress';
  responseWaiting.hidden = false;
  responseWaiting.querySelector('p').textContent = 'Waiting for the API response…';
  responseSummary.hidden = true;
  responseResult.hidden = true;
  const start = performance.now();

  try {
    const method = methodSelect.value;
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) throw new Error('Enter a request URL.');
    if (/\{[^}]+\}/.test(rawUrl)) throw new Error('Fill in all path parameters before sending.');
    const url = new URL(rawUrl, window.location.href);
    const query = parseJsonObject(queryEditor.value, 'Query parameters');
    applyQueryParams(url, query);
    const headerValues = parseJsonObject(headerEditor.value, 'Headers');
    const headers = Object.fromEntries(Object.entries(headerValues).map(([key, value]) => [key, String(value)]));
    let body;

    if (selectedEndpoint.upload) {
      const files = byId('upload-files').files;
      if (!files.length) throw new Error('Choose at least one file to upload.');
      body = new FormData();
      Array.from(files).forEach((file) => body.append('files', file, file.name));
    } else if (!['GET', 'DELETE'].includes(method) && bodyEditor.value.trim()) {
      try {
        body = JSON.parse(bodyEditor.value);
      } catch {
        throw new Error('Request body must contain valid JSON.');
      }
    }

    const result = await api.detailed(method, url.href, { headers, body });
    renderResponse(result, performance.now() - start);
    const upstreamUnavailable = result.headers['x-dev-proxy-error'] === 'spring-boot-unavailable';
    setConnectionStatus(!upstreamUnavailable, upstreamUnavailable ? 'API unavailable' : 'API connected');
  } catch (error) {
    if (error instanceof NetworkError) {
      setConnectionStatus(false, 'API unavailable');
      renderResponse({ ok: false, status: 'Network', statusText: 'Error', data: { message: error.message }, headers: {} }, performance.now() - start);
    } else {
      requestError.textContent = error.message || 'Unable to send this request.';
      requestError.hidden = false;
      if (!responseSummary.hidden) byId('response-caption').textContent = 'Request not sent';
    }
  } finally {
    requestPending = false;
    sendButton.disabled = false;
    sendButton.innerHTML = '<span>Send</span><span aria-hidden="true">↗</span>';
  }
}

function resetRequest() {
  if (!selectedEndpoint) return;
  selectEndpoint(CONTROLLERS.indexOf(selectedController()), selectedController().endpoints.indexOf(selectedEndpoint));
}

function copyText(elementId, button) {
  navigator.clipboard?.writeText(byId(elementId).textContent).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied';
    window.setTimeout(() => { button.textContent = original; }, 1200);
  }).catch(() => {});
}

renderSidebar();
byId('api-origin').textContent = API_BASE_URL;
controllerList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-endpoint]');
  if (!button) return;
  const [controllerIndex, endpointIndex] = button.dataset.endpoint.split(':').map(Number);
  selectEndpoint(controllerIndex, endpointIndex);
});
methodSelect.addEventListener('change', updateMethodStyle);
byId('send-request').addEventListener('click', sendRequest);
byId('reset-request').addEventListener('click', resetRequest);
byId('copy-headers').addEventListener('click', (event) => copyText('response-headers', event.currentTarget));
byId('copy-response').addEventListener('click', (event) => copyText('response-body', event.currentTarget));
connectionRetry.addEventListener('click', checkConnection);
connectionDialog.addEventListener('cancel', (event) => event.preventDefault());
byId('mobile-menu').addEventListener('click', (event) => {
  const sidebar = byId('sidebar');
  const open = sidebar.classList.toggle('is-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') sendRequest();
});

selectEndpoint(0, 0);
checkConnection();
