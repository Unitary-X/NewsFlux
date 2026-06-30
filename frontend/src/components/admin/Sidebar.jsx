import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Newspaper, FileSpreadsheet, LogOut, Settings, Globe, Receipt, HardDrive, BarChart3, IndianRupee, Building2, X, ChevronDown, ChevronRight, Package, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ isOpen, setIsOpen }) {
    const { logout, user } = useAuth();
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ta' : 'en');
    };

    const location = useLocation();
    const isStockRoute = location.pathname.startsWith('/admin/stock');
    const [isStockOpen, setIsStockOpen] = useState(isStockRoute);

    const links = [
        { to: "/admin", label: t('sidebar.overview'), icon: LayoutDashboard, end: true },
        { to: "/admin/newspapers", label: t('sidebar.newspapers'), icon: Newspaper },
        { to: "/admin/agency", label: t('sidebar.agency') || 'Agency', icon: Building2 },
        { to: "/admin/billing", label: t('sidebar.billing') || 'Billing', icon: Receipt },
        { to: "/admin/reports", label: t('sidebar.reports') || 'Reports', icon: BarChart3 },
        { to: "/admin/pricing", label: t('sidebar.pricing') || 'Pricing', icon: IndianRupee },
        { to: "/admin/backup", label: t('sidebar.backup') || 'Backup', icon: HardDrive },
    ];

    return (
        <div className={`fixed inset-y-0 left-0 z-[50] w-64 bg-slate-900 border-r border-slate-800 flex flex-col text-slate-300 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-blue-500" />
                    NewsFlux
                </h1>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 lg:hidden text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">{t('sidebar.agency_menu')}</p>
                <nav className="space-y-1">
                    <NavLink
                        to="/admin"
                        end={true}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`
                        }
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        {t('sidebar.overview')}
                    </NavLink>

                    {/* Collapsible Daily Stock Menu */}
                    <div>
                        <button
                            onClick={() => setIsStockOpen(!isStockOpen)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isStockRoute ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="w-4 h-4" />
                                Daily Stock
                            </div>
                            {isStockOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        {isStockOpen && (
                            <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-3">
                                <NavLink
                                    to="/admin/stock/daily"
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                                    }
                                >
                                    <Building2 className="w-3.5 h-3.5" />
                                    Daily Stock Ledger
                                </NavLink>
                                <NavLink
                                    to="/admin/stock/worker"
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                                    }
                                >
                                    <User className="w-3.5 h-3.5" />
                                    Worker Daily Ledger
                                </NavLink>
                                <NavLink
                                    to="/admin/stock/expense"
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${isActive ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                                    }
                                >
                                    <Package className="w-3.5 h-3.5" />
                                    Extra Expense
                                </NavLink>
                            </div>
                        )}
                    </div>

                    {links.slice(1).map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end || false}
                            onClick={() => setIsOpen(false)}
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
