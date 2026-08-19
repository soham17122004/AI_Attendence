import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'bypass-tunnel-reminder': 'true',
    'serveo-skip-browser-warning': 'true'
  }
});

// Intercept requests to dynamically update the baseURL from localStorage
api.interceptors.request.use((config) => {
  const dynamicUrl = localStorage.getItem('api_base_url');
  if (dynamicUrl) {
    config.baseURL = dynamicUrl;
  }
  return config;
});

export const attendanceService = {
  /**
   * Health check to test backend connection
   */
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data?.status === 'healthy';
    } catch (error) {
      return false;
    }
  },

  /**
   * Recognize employee face and mark check-in/check-out
   * @param {Blob} imageBlob - JPEG image blob captured from device camera
   * @returns {Promise<Object>} API response object
   */
  recognizeFace: async (imageBlob, terminalId) => {
    const formData = new FormData();
    formData.append('file', imageBlob, 'face.jpg');

    const url = terminalId ? `/attendance/recognize?terminal_id=${terminalId}` : '/attendance/recognize';
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  /**
   * Fetch all employees from the backend
   */
  getEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },

  /**
   * Fetch all registered face profiles
   */
  getFaceProfiles: async () => {
    const response = await api.get('/face-profiles');
    return response.data;
  },

  /**
   * Register a new face profile for an employee
   */
  registerFace: async (employeeId, imageBlob) => {
    const formData = new FormData();
    formData.append('employee_id', employeeId);
    formData.append('file', imageBlob, 'face.jpg');

    const response = await api.post('/face-profiles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },
  /**
   * Fetch all kiosk devices from the backend
   */
  getKiosks: async () => {
    const response = await api.get('/attendance/kiosks');
    return response.data;
  },
};

export default attendanceService;
