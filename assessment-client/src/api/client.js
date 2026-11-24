import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const apiKey = import.meta.env.VITE_ASSESSMENT_API_KEY || '';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'x-assessment-api-key': apiKey,
  },
});

// Request interceptor to ensure API key header is always attached
apiClient.interceptors.request.use((config) => {
  if (apiKey) {
    config.headers['x-assessment-api-key'] = apiKey;
  }
  return config;
});

// Response interceptor to ensure double-nested envelopes are unwrapped once,
// while preserving top-level { success, message, data } intact for callers.
apiClient.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data === 'object') {
      const payload = response.data;
      // If double nested: { success: true, data: { success: true, data: ... } }
      if (
        payload.success !== undefined &&
        payload.data &&
        typeof payload.data === 'object' &&
        payload.data.success !== undefined &&
        Object.prototype.hasOwnProperty.call(payload.data, 'data')
      ) {
        response.data = payload.data;
      }
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
