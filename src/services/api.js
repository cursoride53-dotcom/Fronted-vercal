
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach the current Firebase ID token to protected API requests.
api.interceptors.request.use(
  async (config) => {
    const requiresAuth = config.requiresAuth !== false;

    // Custom Axios option; do not send it as an HTTP header.
    delete config.requiresAuth;

    if (requiresAuth) {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const idToken = await user.getIdToken();

        config.headers.Authorization = `Bearer ${idToken}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize backend errors for the UI.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message =
        error.response.data?.message ||
        'The server could not complete your request.';

      return Promise.reject(
        Object.assign(new Error(message), {
          status: error.response.status,
          data: error.response.data,
        })
      );
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        new Error('Request timed out. Please try again.')
      );
    }

    if (!error.response) {
      return Promise.reject(
        new Error(
          'Unable to connect to the HRMS server. Check that the backend is running.'
        )
      );
    }

    return Promise.reject(error);
  }
);

// Your actual backend authentication endpoints.
export const authApi = {
  sendOtp(email) {
    return api.post(
      '/super-admin/auth/send-otp',
      { email },
      { requiresAuth: false }
    );
  },

  verifyOtp(email, otp) {
    return api.post(
      '/super-admin/auth/verify-otp',
      { email, otp },
      { requiresAuth: false }
    );
  },

  getMe() {
    return api.get('/super-admin/auth/me');
  },

  logout() {
    return api.post('/super-admin/auth/logout');
  },
};

// Health check for testing backend connectivity.
export const checkApiHealth = () =>
  api.get('/health', { requiresAuth: false });

export default api;
