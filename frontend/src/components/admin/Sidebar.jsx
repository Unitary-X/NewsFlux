import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserSquare2, Newspaper, FileSpreadsheet, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
    const { logout, user } = useAuth();

    const links = [
        { to: ".", label: "Overview", icon: LayoutDashboard },
        { to: "stock", label: "Daily Stock", icon: FileSpreadsheet },
        { to: "newspapers", label: "Newspapers", icon: Newspaper },
        { to: "workers", label: "Workers", icon: UserSquare2 },
        { to: "customers", label: "Customers", icon: Users },
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 h-screen flex flex-col text-slate-300">
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-blue-500" />
                    NewsFlux
                </h1>
            </div>

            <div className="p-4 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Agency Menu</p>
                <nav className="space-y-1">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === '.'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <link.icon className="w-4 h-4" />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-slate-800 space-y-2">
                <div className="px-3 py-2 flex items-center gap-3 text-sm text-slate-500">
                    <Settings className="w-4 h-4" />
                    <span>Agency ID: {user?.tenant_id ? user.tenant_id.substring(0, 8) : '...'}</span>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
