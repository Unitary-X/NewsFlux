import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, BarChart3, ScrollText, Activity, Settings, LogOut, ShieldAlert, Globe, Megaphone, HardDrive } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function SuperAdminSidebar() {
    const { logout } = useAuth();
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ta' : 'en');
    };

    const links = [
        { to: "/superadmin", label: t('superadmin.dashboard'), icon: LayoutDashboard, end: true },
        { to: "/superadmin/agencies", label: t('superadmin.agencies'), icon: Building2 },
        { to: "/superadmin/analytics", label: t('superadmin.analytics'), icon: BarChart3 },
        { to: "/superadmin/announcements", label: "Announcements", icon: Megaphone },
        { to: "/superadmin/audit-logs", label: t('superadmin.audit_logs'), icon: ScrollText },
        { to: "/superadmin/system", label: t('superadmin.system_health'), icon: Activity },
        { to: "/superadmin/backup", label: t('superadmin.backup'), icon: HardDrive },
        { to: "/superadmin/settings", label: t('superadmin.settings'), icon: Settings },
    ];

    return (
        <div className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 h-screen flex flex-col text-slate-400 sticky top-0">
            {/* Brand */}
            <div className="h-16 flex items-center px-5 border-b border-slate-800/50 gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl ring-1 ring-indigo-500/40">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-base font-bold text-white tracking-tight">NewsFlux</h1>
                    <p className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">{t('superadmin.god_mode')}</p>
                </div>
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
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                >
                    <Globe className="w-4 h-4" />
                    {i18n.language === 'en' ? 'தமிழ்' : 'English'}
                </button>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    {t('superadmin.terminate_session')}
                </button>
            </div>
        </div>
    );
}
