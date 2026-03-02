import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
});

let isRefreshing = false;
let refreshSubscribers = [];

// Queue failed requests during token refresh
const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Wait for the ongoing refresh to complete
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                // No refresh token, logout
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Attempt to refresh the token
                const response = await axios.post('/api/v1/auth/refresh', {
                    refresh_token: refreshToken
                });

                const { access_token, refresh_token: new_refresh_token } = response.data;

                // Update stored tokens
                localStorage.setItem('token', access_token);
                if (new_refresh_token) {
                    localStorage.setItem('refresh_token', new_refresh_token);
                }

                // Update the failed request with new token
                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                // Notify all queued requests
                onTokenRefreshed(access_token);
                isRefreshing = false;

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout
                isRefreshing = false;
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
