const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('api_base_url');
    if (savedUrl) {
      return savedUrl;
    }
    const hostname = window.location.hostname;
    if (hostname.includes('trycloudflare.com')) {
      return window.location.origin + '/api';
    }
    return `http://${hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();
