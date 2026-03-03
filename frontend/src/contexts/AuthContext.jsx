import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, TOKEN_CONFIG } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
    const refreshTimerRef = useRef(null);

    // Decode JWT and extract user info
    const decodeToken = useCallback((jwt) => {
        try {
            const payload = JSON.parse(atob(jwt.split('.')[1]));
            return {
                id: payload.sub,
                role: payload.role,
                tenant_id: payload.tenant_id,
                impersonating: payload.impersonating || false,
                original_user_id: payload.original_user_id || null,
                agencyName: localStorage.getItem('impersonating_agency') || null,
                exp: payload.exp
            };
        } catch (e) {
            return null;
        }
    }, []);

    // Refresh access token using refresh token
    const refreshAccessToken = useCallback(async () => {
        const currentRefreshToken = localStorage.getItem('refresh_token');
        if (!currentRefreshToken) {
            logout();
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: currentRefreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            // Update tokens
            localStorage.setItem('token', data.access_token);
            if (data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh_token);
                setRefreshToken(data.refresh_token);
            }
            setToken(data.access_token);

            console.log('[AuthContext] Access token refreshed successfully');
            return true;
        } catch (error) {
            console.error('[AuthContext] Token refresh failed:', error);
            logout();
            return false;
        }
    }, []);

    // Setup automatic token refresh
    useEffect(() => {
        if (token && refreshToken) {
            // Clear any existing timer
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }

            // Set up periodic refresh
            refreshTimerRef.current = setInterval(() => {
                console.log('[AuthContext] Auto-refreshing token...');
                refreshAccessToken();
            }, TOKEN_CONFIG.TOKEN_REFRESH_INTERVAL);

            // Cleanup on unmount
            return () => {
                if (refreshTimerRef.current) {
                    clearInterval(refreshTimerRef.current);
                }
            };
        }
    }, [token, refreshToken, refreshAccessToken]);

    // Update user state when token changes
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            const userData = decodeToken(token);
            if (userData) {
                setUser(userData);

                // Check if token is about to expire
                const now = Math.floor(Date.now() / 1000);
                const timeUntilExpiry = userData.exp - now;

                if (timeUntilExpiry < 60) {
                    // Token expires in less than 1 minute, refresh immediately
                    console.log('[AuthContext] Token expiring soon, refreshing...');
                    refreshAccessToken();
                }
            } else {
                // Invalid token
                setUser(null);
            }
        } else {
            localStorage.removeItem('token');
            setUser(null);
        }
    }, [token, decodeToken, refreshAccessToken]);

    const login = (newToken, newRefreshToken, userData) => {
        setToken(newToken);
        if (newRefreshToken) {
            setRefreshToken(newRefreshToken);
            localStorage.setItem('refresh_token', newRefreshToken);
        }
        if (userData) {
            setUser(userData);
        }
    };

    const logout = useCallback(() => {
        // Clear refresh timer
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('original_token');
        localStorage.removeItem('original_refresh_token');
        localStorage.removeItem('impersonating_agency');
        setToken(null);
        setRefreshToken(null);
        setUser(null);
    }, []);

    const impersonate = (impersonationToken, impersonationRefreshToken, agencyName) => {
        // Save original super admin tokens
        const currentToken = localStorage.getItem('token');
        const currentRefreshToken = localStorage.getItem('refresh_token');
        localStorage.setItem('original_token', currentToken);
        if (currentRefreshToken) {
            localStorage.setItem('original_refresh_token', currentRefreshToken);
        }
        localStorage.setItem('impersonating_agency', agencyName);
        
        // Switch to impersonation tokens
        setToken(impersonationToken);
        if (impersonationRefreshToken) {
            setRefreshToken(impersonationRefreshToken);
            localStorage.setItem('refresh_token', impersonationRefreshToken);
        }
        window.location.href = '/admin';
    };

    const exitImpersonation = () => {
        const originalToken = localStorage.getItem('original_token');
        const originalRefreshToken = localStorage.getItem('original_refresh_token');
        
        localStorage.removeItem('original_token');
        localStorage.removeItem('original_refresh_token');
        localStorage.removeItem('impersonating_agency');
        
        if (originalToken) {
            setToken(originalToken);
            if (originalRefreshToken) {
                setRefreshToken(originalRefreshToken);
                localStorage.setItem('refresh_token', originalRefreshToken);
            }
            window.location.href = '/superadmin';
        } else {
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{
            user, token, refreshToken, login, logout,
            impersonate, exitImpersonation,
            refreshAccessToken,  // Expose for manual refresh if needed
            isAuthenticated: !!token,
            isImpersonating: !!user?.impersonating,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
