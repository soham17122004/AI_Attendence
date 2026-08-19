import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin + '/api';
    }
    return `http://${hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('smartattend_token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API ERROR:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      // If token expired, purge local storage and reload so user can re-authenticate cleanly
      localStorage.removeItem('smartattend_token');
      localStorage.removeItem('smartattend_user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/kiosk')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;