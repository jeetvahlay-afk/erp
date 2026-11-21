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

// Unpack nested API envelopes safely (e.g., { success: true, data: { success: true, data: { ... } } })
const unwrapNestedEnvelopeData = (value) => {
  let current = value;
  const visited = new Set();
  while (
    current &&
    typeof current === 'object' &&
    !visited.has(current) &&
    typeof current.success === 'boolean' &&
    Object.prototype.hasOwnProperty.call(current, 'data')
  ) {
    visited.add(current);
    current = current.data;
  }
  return current;
};

// Response interceptor to ensure responses are cleanly unwrapped
apiClient.interceptors.response.use(
  (response) => {
    if (response && response.data !== undefined) {
      response.data = unwrapNestedEnvelopeData(response.data);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
