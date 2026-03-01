import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            // Decode JWT to get user info
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser({
                    id: payload.sub,
                    role: payload.role,
                    tenant_id: payload.tenant_id,
                    impersonating: payload.impersonating || false,
                    original_user_id: payload.original_user_id || null,
                    agencyName: localStorage.getItem('impersonating_agency') || null,
                });
            } catch (e) {
                // If JWT decode fails, clear state
                setUser(null);
            }
        } else {
            localStorage.removeItem('token');
            setUser(null);
        }
    }, [token]);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('original_token');
        localStorage.removeItem('impersonating_agency');
        setToken(null);
        setUser(null);
    };

    const impersonate = (impersonationToken, agencyName) => {
        // Save original super admin token
        const currentToken = localStorage.getItem('token');
        localStorage.setItem('original_token', currentToken);
        localStorage.setItem('impersonating_agency', agencyName);
        // Switch to impersonation token
        setToken(impersonationToken);
        window.location.href = '/admin';
    };

    const exitImpersonation = () => {
        const originalToken = localStorage.getItem('original_token');
        localStorage.removeItem('original_token');
        localStorage.removeItem('impersonating_agency');
        if (originalToken) {
            setToken(originalToken);
            window.location.href = '/superadmin';
        } else {
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{
            user, token, login, logout,
            impersonate, exitImpersonation,
            isAuthenticated: !!token,
            isImpersonating: !!user?.impersonating,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
