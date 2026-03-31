import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from './SuperAdminSidebar';
import { Menu } from 'lucide-react';

export default function SuperAdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex bg-slate-950 min-h-screen relative text-slate-300">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[40] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <SuperAdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <main className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="lg:hidden flex items-center p-4 border-b border-slate-900 bg-slate-950 sticky top-0 z-[30]">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-bold text-white tracking-tight">System Admin</span>
                </div>
                <Outlet />
            </main>
        </div>
    );
}
