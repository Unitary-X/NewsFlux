import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AdminLayout() {
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-8 container mx-auto">
                <Outlet />
            </main>
        </div>
    );
}
