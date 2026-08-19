import axios from 'axios';

// ============================================================
// API CONFIGURATION
// ============================================================

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
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('smartattend_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error(
      'API ERROR:',
      error.response?.status,
      error.response?.data || error.message
    );

    if (error.response?.status === 401) {
      localStorage.removeItem('smartattend_token');
      localStorage.removeItem('smartattend_user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/kiosk')) {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// AUTH SERVICE
// ============================================================

export const authService = {

  login: async (username, password) => {
    const formData = new URLSearchParams();

    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post(
      '/auth/login',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data?.access_token) {
      localStorage.setItem(
        'smartattend_token',
        response.data.access_token
      );
    }

    return response.data;
  },

  register: async (userData) => {
    const response = await api.post(
      '/auth/register',
      userData
    );

    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');

    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');

    return response.data;
  },

  logout: () => {
    localStorage.removeItem('smartattend_token');
  },

};

// ============================================================
// EMPLOYEE SERVICE
// ============================================================

export const employeeService = {

  // GET ALL EMPLOYEES
  getAll: async () => {

    const response = await api.get('/employees');

    console.log('EMPLOYEES API RESPONSE:', response.data);

    return response.data;
  },

  // GET EMPLOYEE BY ID
  getById: async (id) => {

    const response = await api.get(
      `/employees/${id}`
    );

    return response.data;
  },

  // CREATE EMPLOYEE
  create: async (employeeData) => {

    const response = await api.post(
      '/employees',
      employeeData
    );

    console.log(
      'EMPLOYEE CREATED:',
      response.data
    );

    return response.data;
  },

  // UPDATE EMPLOYEE
  update: async (id, employeeData) => {

    const response = await api.put(
      `/employees/${id}`,
      employeeData
    );

    return response.data;
  },

  // DELETE EMPLOYEE
  delete: async (id) => {

    const response = await api.delete(
      `/employees/${id}`
    );

    return response.data;
  },

  // GET EMPLOYEE USER ACCOUNT
  getUserAccount: async (employeeId) => {
    const response = await api.get(`/employees/${employeeId}/user`);
    return response.data;
  },

  // SET EMPLOYEE USER ACCOUNT
  setUserAccount: async (employeeId, credentials) => {
    const response = await api.post(`/employees/${employeeId}/user`, credentials);
    return response.data;
  },

  // DELETE EMPLOYEE USER ACCOUNT
  deleteUserAccount: async (employeeId) => {
    const response = await api.delete(`/employees/${employeeId}/user`);
    return response.data;
  },

};

// ============================================================
// DEPARTMENT SERVICE
// ============================================================

export const departmentService = {

  // GET ALL DEPARTMENTS
  getAll: async () => {

    try {

      const response = await api.get(
        '/departments'
      );

      console.log(
        'DEPARTMENTS API RESPONSE:',
        response.data
      );

      // Make sure response is an array
      if (Array.isArray(response.data)) {
        return response.data;
      }

      console.error(
        'Departments API did not return an array:',
        response.data
      );

      return [];

    } catch (error) {

      console.error(
        'FAILED TO LOAD DEPARTMENTS:',
        error.response?.data || error.message
      );

      throw error;
    }
  },

  // GET DEPARTMENT BY ID
  getById: async (id) => {

    const response = await api.get(
      `/departments/${id}`
    );

    return response.data;
  },

  // CREATE DEPARTMENT
  create: async (departmentData) => {

    const response = await api.post(
      '/departments',
      departmentData
    );

    return response.data;
  },

  // UPDATE DEPARTMENT
  update: async (id, departmentData) => {

    const response = await api.put(
      `/departments/${id}`,
      departmentData
    );

    return response.data;
  },

  // DELETE DEPARTMENT
  delete: async (id) => {

    const response = await api.delete(
      `/departments/${id}`
    );

    return response.data;
  },

};

// ============================================================
// FACE RECOGNITION SERVICE
// ============================================================

export const recognitionService = {

  // ----------------------------------------------------------
  // REGISTER EMPLOYEE FACE
  // ----------------------------------------------------------

  registerFaceProfile: async (
    employeeId,
    imageBlob
  ) => {

    const formData = new FormData();

    formData.append(
      'employee_id',
      employeeId
    );

    formData.append(
      'file',
      imageBlob,
      'face.jpg'
    );

    const response = await api.post(
      '/face-profiles',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  // ----------------------------------------------------------
  // RECOGNIZE FACE + ATTENDANCE
  // ----------------------------------------------------------

  recognizeFace: async (imageBlob, terminalId = 1) => {
    const formData = new FormData();
    formData.append(
      'file',
      imageBlob,
      'face.jpg'
    );

    const url = terminalId ? `/attendance/recognize?terminal_id=${terminalId}` : '/attendance/recognize';
    const response = await api.post(
      url,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  // ----------------------------------------------------------
  // GET ALL FACE PROFILES
  // ----------------------------------------------------------

  getAllProfiles: async () => {

    const response = await api.get(
      '/face-profiles'
    );

    return response.data;
  },

  // ----------------------------------------------------------
  // GET FACE PROFILE BY EMPLOYEE
  // ----------------------------------------------------------

  getEmployeeFaceProfile: async (
    employeeId
  ) => {

    const response = await api.get(
      `/face-profiles/employee/${employeeId}`
    );

    return response.data;
  },

  // ----------------------------------------------------------
  // DELETE FACE PROFILE
  // ----------------------------------------------------------

  deleteFaceProfile: async (
    employeeId
  ) => {

    const response = await api.delete(
      `/face-profiles/employee/${employeeId}`
    );

    return response.data;
  },

};

// ============================================================
// ATTENDANCE SERVICE
// ============================================================

export const attendanceService = {

  // GET ALL ATTENDANCE
  getAll: async () => {

    const response = await api.get(
      '/attendance'
    );

    return response.data;
  },

  getLogs: async () => {
    const response = await api.get('/attendance');
    return response.data;
  },

  // GET TODAY ATTENDANCE
  getToday: async () => {

    const response = await api.get(
      '/attendance/today'
    );

    return response.data;
  },

  // GET ATTENDANCE BY EMPLOYEE
  getByEmployee: async (
    employeeId
  ) => {

    const response = await api.get(
      `/attendance/employee/${employeeId}`
    );

    return response.data;
  },

  // RECOGNIZE FACE
  recognize: async (imageBlob) => {

    return recognitionService.recognizeFace(
      imageBlob
    );
  },

  // MANUAL CHECK-IN
  manualCheckIn: async (employeeId, notes = '') => {
    const response = await api.post('/attendance/manual-checkin', {
      employee_id: employeeId,
      notes: notes
    });
    return response.data;
  },

  // MANUAL CHECK-OUT
  manualCheckOut: async (employeeId, notes = '') => {
    const response = await api.post('/attendance/manual-checkout', {
      employee_id: employeeId,
      notes: notes
    });
    return response.data;
  },

  // MANUAL ATTENDANCE RECORD (FOR NEW EMPLOYEES / CUSTOM DATES / BULK OVERRIDES)
  manualRecord: async (recordData) => {
    const response = await api.post('/attendance/manual-record', recordData);
    return response.data;
  },

};

// ============================================================
// LEAVE SERVICE
// ============================================================

export const leaveService = {

  // GET ALL LEAVE REQUESTS
  getAll: async (employeeId = null) => {
    const url = employeeId ? `/leaves?employee_id=${employeeId}` : '/leaves';
    const response = await api.get(url);

    return response.data;
  },

  // GET LEAVE BY ID
  getById: async (id) => {

    const response = await api.get(
      `/leaves/${id}`
    );

    return response.data;
  },

  // CREATE LEAVE
  create: async (leaveData) => {

    const response = await api.post(
      '/leaves',
      leaveData
    );

    return response.data;
  },

  // UPDATE LEAVE
  update: async (id, leaveData) => {

    const response = await api.put(
      `/leaves/${id}`,
      leaveData
    );

    return response.data;
  },

  // DELETE LEAVE
  delete: async (id) => {

    const response = await api.delete(
      `/leaves/${id}`
    );

    return response.data;
  },

};

// ============================================================
// DASHBOARD SERVICE
// ============================================================

export const dashboardService = {

  getDashboard: async () => {

    const response = await api.get(
      '/dashboard'
    );

    return response.data;
  },

};

// ============================================================
// KIOSK SERVICE
// ============================================================

export const kioskService = {
  getAll: async () => {
    const response = await api.get('/attendance/kiosks');
    return response.data;
  },

  create: async (kioskData) => {
    const response = await api.post('/attendance/kiosks', kioskData);
    return response.data;
  },

  update: async (id, kioskData) => {
    const response = await api.put(`/attendance/kiosks/${id}`, kioskData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/attendance/kiosks/${id}`);
    return response.data;
  }
};

// ============================================================
// PAYROLL & SALARY SERVICE
// ============================================================

export const payrollService = {
  calculate: async (month, year) => {
    let url = '/payroll/calculate';
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    
    const response = await api.get(url);
    return response.data;
  },

  updateSalary: async (employeeId, salaryData) => {
    const response = await api.put(`/payroll/employee/${employeeId}/salary`, salaryData);
    return response.data;
  }
};

// ============================================================
// API HEALTH
// ============================================================

export const healthService = {

  check: async () => {

    const response = await api.get(
      '/health'
    );

    return response.data;
  },

  databaseTest: async () => {

    const response = await api.get(
      '/database-test'
    );

    return response.data;
  },

};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default api;