import axios from 'axios';

const api = axios.create({
  // Local development uses the React server's proxy; deployments can set an API origin.
  baseURL: (process.env.REACT_APP_API_URL || '').replace(/\/+$/, ''),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403) && !error.config?.skipAuthRedirect) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
