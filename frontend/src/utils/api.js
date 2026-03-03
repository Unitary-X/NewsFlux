import axios from 'axios';
import { TIMEOUTS } from '../config';

/**
 * Axios instance configured for API communication with automatic token refresh
 * Base URL defaults to '/api/v1' and includes configurable request timeouts
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
    baseURL: '/api/v1',
    timeout: TIMEOUTS.MEDIUM,  // Default to medium timeout (15s)
});

let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh completion
 * @param {Function} cb - Callback to execute when token refresh completes
 * @returns {void}
 */
const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

/**
 * Notify all queued requests that token refresh is complete
 * @param {string} token - New access token
 * @returns {void}
 */
const onTokenRefreshed = (token) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

/**
 * Set request timeout for a specific call
 * Useful for uploads or long-running operations
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Object} Config object for request interceptor
 * 
 * @example
 * api.post(url, data, api.withTimeout(30000))
 */
export const withTimeout = (timeoutMs) => ({ timeout: timeoutMs });

/**
 * Request interceptor: Add JWT token to Authorization header if available
 * Apply timeout configuration from TIMEOUTS config
 */
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

/**
 * Response interceptor: Handle 401 errors with automatic token refresh
 * 
 * Behavior:
 * - If 401 with valid refresh token: attempt token refresh and retry request
 * - If authentication error (bad credentials): reject without retry
 * - If refresh fails: clear tokens and redirect to login
 * - Queues requests while token refresh is in progress
 */
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Check if this is an authentication error (bad credentials) vs. token expiry
            const errorDetail = error.response?.data?.detail || '';
            const isAuthenticationError = errorDetail.includes('Invalid credentials') || 
                                         errorDetail.includes('Incorrect') ||
                                         errorDetail.includes('Invalid username');
            
            // If it's an authentication error (bad credentials), don't try to refresh
            if (isAuthenticationError) {
                return Promise.reject(error);
            }

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
                isRefreshing = false;
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
