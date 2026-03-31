import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

export default function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex bg-slate-50 min-h-screen relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-4 lg:p-8 container mx-auto">
                <div className="lg:hidden flex items-center mb-6">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 font-bold text-slate-800">NewsFlux</span>
                </div>
                <Outlet />
            </main>
        </div>
    );
}
