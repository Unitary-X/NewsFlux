import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p>Welcome, {user?.role}</p>
            <button onClick={logout} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">Logout</button>
        </div>
    );
}
