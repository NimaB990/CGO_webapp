import axios from 'axios';

// Backend එකේ URL එක මෙතන දෙනවා
const api = axios.create({
  baseURL: 'http://localhost:8080', 
});

// Request Interceptor - හැම Request එකක්ම යන්න කලින් මේක මැදින් පැනලා Token එක අලවනවා
api.interceptors.request.use(
  (config) => {
    // LocalStorage එකේ සේව් කරලා තියෙන Token එක ගන්නවා
    const token = localStorage.getItem('token');
    
    // Token එකක් තියෙනවා නම් ඒක Request Header එකට දානවා
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - (අත්‍යවශ්‍ය නෑ, ඒත් Token එක Expire වෙලා නම් ඔටෝම Logout කරන්න මේක උදව් වෙනවා)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403) && !error.config?.skipAuthRedirect) {
      // Token එක වැරදියි හෝ කල් ඉකුත් වෙලා නම් LocalStorage එකෙන් මකලා Login පිටුවට යවනවා
      localStorage.removeItem('token');
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

export default api;