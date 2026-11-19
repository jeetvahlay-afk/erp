import axios from 'axios';

export const SESSION_KEY = 'teamhub.session';

export const getStoredSession = () => {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const storeSession = (session, remember = false) => {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  // Clean up the legacy key from previous releases.
  localStorage.removeItem('userInfo');
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 20000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

const readCookie = (name) => {
  const encodedName = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(encodedName));
  return match ? decodeURIComponent(match.slice(encodedName.length)) : null;
};

const isJwt = (value) => typeof value === 'string' && value.split('.').length === 3;
const isUnsafeMethod = (method = 'get') => !['get', 'head', 'options'].includes(method.toLowerCase());
const unwrapNestedEnvelopeData = (value) => {
  let current = value;
  const visited = new Set();
  while (
    current
    && typeof current === 'object'
    && !visited.has(current)
    && typeof current.success === 'boolean'
    && Object.prototype.hasOwnProperty.call(current, 'data')
  ) {
    visited.add(current);
    current = current.data;
  }
  return current;
};

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // Remove obsolete Authorization values emitted by pages from pre-cookie releases.
  const authorization = config.headers.Authorization || config.headers.authorization;
  if (authorization && /Bearer\s+(?:undefined|null|cookie-session)$/i.test(String(authorization))) {
    delete config.headers.Authorization;
    delete config.headers.authorization;
  }

  // Keep standards-based bearer support for API clients and seamless upgrades,
  // while browser sessions use the HTTP-only cookie by default.
  const session = getStoredSession();
  if (isJwt(session?.token) && !config.headers.Authorization && !config.headers.authorization) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  if (isUnsafeMethod(config.method)) {
    const csrfToken = readCookie(import.meta.env.VITE_CSRF_COOKIE_NAME || 'teamhub.csrf');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

export const unwrapApiEnvelope = (response) => {
  const envelope = response.data;
  if (!envelope || typeof envelope !== 'object' || typeof envelope.success !== 'boolean') return response;

  response.envelope = envelope;
  const extraMeta = Object.fromEntries(
    Object.entries(envelope.meta || {}).filter(([key]) => key !== 'requestId'),
  );
  let legacy = unwrapNestedEnvelopeData(envelope.data);

  if (Array.isArray(legacy)) {
    if (envelope.pagination || Object.keys(extraMeta).length) {
      legacy = { items: legacy, ...extraMeta };
      if (envelope.pagination) legacy.pagination = envelope.pagination;
    }
  } else if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
    legacy = { ...legacy, ...extraMeta };
    if (envelope.pagination) legacy.pagination = envelope.pagination;
    if (envelope.message && !legacy.message) legacy.message = envelope.message;
  } else if (envelope.message) {
    legacy = { message: envelope.message };
  }

  response.data = legacy;
  return response;
};

api.interceptors.response.use(
  unwrapApiEnvelope,
  (error) => {
    const isAuthRequest = error.config?.url?.includes('/api/auth/login');
    if (error.response?.status === 401 && !isAuthRequest) {
      clearSession();
      window.dispatchEvent(new CustomEvent('teamhub:session-expired'));
    }
    return Promise.reject(error);
  },
);

export const getApiError = (error, fallback = 'Something went wrong. Please try again.') => (
  error?.response?.data?.message
  || error?.response?.data?.errors?.[0]?.message
  || error?.message
  || fallback
);

export const asArray = (data) => {
  let current = data;
  const visited = new Set();
  while (current && typeof current === 'object' && !visited.has(current)) {
    if (Array.isArray(current)) return current;
    visited.add(current);
    if (current.items !== undefined) {
      current = current.items;
      continue;
    }
    if (current.data !== undefined) {
      current = current.data;
      continue;
    }
    if (current.envelope !== undefined) {
      current = current.envelope;
      continue;
    }
    break;
  }
  return [];
};

export const downloadProtectedFile = async (url, filename = 'download') => {
  const response = await api.get(url, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

export default api;
