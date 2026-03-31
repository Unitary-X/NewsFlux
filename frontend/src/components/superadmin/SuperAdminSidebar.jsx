import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, BarChart3, ScrollText, Activity, Settings, LogOut, ShieldAlert, Megaphone, HardDrive, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SuperAdminSidebar({ isOpen, setIsOpen }) {
    const { logout } = useAuth();

    const links = [
        { to: "/superadmin", label: "Dashboard", icon: LayoutDashboard, end: true },
        { to: "/superadmin/agencies", label: "Agencies", icon: Building2 },
        { to: "/superadmin/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/superadmin/announcements", label: "Announcements", icon: Megaphone },
        { to: "/superadmin/audit-logs", label: "Audit Logs", icon: ScrollText },
        { to: "/superadmin/system", label: "System Health", icon: Activity },
        { to: "/superadmin/backup", label: "Backup", icon: HardDrive },
        { to: "/superadmin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className={`fixed inset-y-0 left-0 z-[50] w-64 bg-slate-900 border-r border-slate-800/50 flex flex-col text-slate-400 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Brand */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-xl ring-1 ring-indigo-500/40">
                        <ShieldAlert className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white tracking-tight">NewsFlux</h1>
                        <p className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">God Mode</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 lg:hidden text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Nav */}
            <div className="p-3 flex-1">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-3">Platform</p>
                <nav className="space-y-1">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end || false}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${isActive
                                    ? 'bg-indigo-500/15 text-indigo-300 shadow-lg shadow-indigo-500/5'
                                    : 'hover:bg-slate-800/50 hover:text-slate-200'
                                }`
                            }
                        >
                            <link.icon className="w-4 h-4" />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800/50 space-y-1">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Terminate Session
                </button>
            </div>
        </div>
    );
}
