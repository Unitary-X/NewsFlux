import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Newspaper, FileSpreadsheet, LogOut, Settings, Globe, Receipt, HardDrive, BarChart3, IndianRupee, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
    const { logout, user } = useAuth();
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ta' : 'en');
    };

    const links = [
        { to: "/admin", label: t('sidebar.overview'), icon: LayoutDashboard, end: true },
        { to: "/admin/stock", label: t('sidebar.daily_stock'), icon: FileSpreadsheet },
        { to: "/admin/newspapers", label: t('sidebar.newspapers'), icon: Newspaper },
        { to: "/admin/agency", label: t('sidebar.agency') || 'Agency', icon: Building2 },
        { to: "/admin/billing", label: t('sidebar.billing') || 'Billing', icon: Receipt },
        { to: "/admin/reports", label: t('sidebar.reports') || 'Reports', icon: BarChart3 },
        { to: "/admin/pricing", label: t('sidebar.pricing') || 'Pricing', icon: IndianRupee },
        { to: "/admin/backup", label: t('sidebar.backup') || 'Backup', icon: HardDrive },
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">{t('sidebar.agency_menu')}</p>
                <nav className="space-y-1">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end || false}
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
                <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                    <Globe className="w-4 h-4" />
                    {i18n.language === 'en' ? 'தமிழ்' : 'English'}
                </button>
                <div className="px-3 py-2 flex items-center gap-3 text-sm text-slate-500">
                    <Settings className="w-4 h-4" />
                    <span>{t('sidebar.agency_id')}: {user?.tenant_id ? user.tenant_id.substring(0, 8) : '...'}</span>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    {t('sidebar.sign_out')}
                </button>
            </div>
        </div>
    );
}
