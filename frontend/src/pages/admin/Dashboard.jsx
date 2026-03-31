import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Newspaper, Users, IndianRupee, TrendingUp, Loader2 } from 'lucide-react';
import { DashboardSkeleton } from '../../components/Skeleton';

function KPICard({ title, value, icon: Icon, color, sub }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
        violet: 'bg-violet-50 text-violet-600',
    };
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            <p className="text-sm text-slate-500 mt-1">{title}</p>
            {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
        </div>
    );
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [revenueData, setRevenueData] = useState([]);
    const [stockSummary, setStockSummary] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, revenueRes, stockRes] = await Promise.all([
                    api.get('/admin/dashboard/stats'),
                    api.get('/admin/dashboard/revenue-chart?days=14'),
                    api.get('/admin/dashboard/stock-summary'),
                ]);
                setStats(statsRes.data);
                setRevenueData(revenueRes.data.map(d => ({
                    ...d,
                    date: d.date.substring(5), // "MM-DD"
                })));
                setStockSummary(stockRes.data);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8"><DashboardSkeleton /></div>;
    }

    const s = stats || {};

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('admin.dashboard_title')}</h1>
                <p className="text-slate-500 mt-1">{t('admin.dashboard_subtitle')}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title={t('admin.newspapers_kpi')} value={s.total_newspapers} icon={Newspaper} color="blue" />
                <KPICard title={t('admin.customers_kpi')} value={s.total_customers} icon={Users} color="emerald" />
                <KPICard title={t('admin.revenue_kpi')} value={`₹${s.today_revenue?.toLocaleString() || 0}`} icon={IndianRupee} color="amber" sub={`${t('stock.sold')}: ${s.today_sold || 0}`} />
                <KPICard title={t('admin.monthly_revenue')} value={`₹${s.monthly_revenue?.toLocaleString() || 0}`} icon={TrendingUp} color="violet" sub={`${t('billing.total_invoices')}: ${s.pending_invoices || 0}`} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">{t('admin.revenue_trend')}</h2>
                    {revenueData.length > 0 ? (
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                    <Tooltip formatter={(v) => [`₹${v}`, t('admin.daily_revenue')]} />
                                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400">{t('common.no_data')}</div>
                    )}
                </div>

                {/* Today's Stock Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">{t('admin.stock_summary')}</h2>
                    {stockSummary.length > 0 ? (
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stockSummary}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="newspaper_name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                    <Tooltip />
                                    <Bar dataKey="taken" fill="#3b82f6" name={t('stock.taken')} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="returned" fill="#f59e0b" name={t('stock.returned')} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="sold" fill="#10b981" name={t('stock.sold')} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400">{t('stock.no_data')}</div>
                    )}
                </div>
            </div>

            {/* Stock Details Table */}
            {stockSummary.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800">{t('admin.daily_revenue')}</h2>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                <th className="px-6 py-3 font-semibold text-slate-600">{t('newspapers.title')}</th>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-right">{t('newspapers.base_price')}</th>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-right">{t('stock.taken')}</th>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-right">{t('stock.returned')}</th>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-right">{t('stock.sold')}</th>
                                <th className="px-6 py-3 font-semibold text-slate-600 text-right">{t('admin.revenue_kpi')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stockSummary.map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-800">{s.newspaper_name}</td>
                                    <td className="px-6 py-3 text-right text-slate-600">₹{s.base_price}</td>
                                    <td className="px-6 py-3 text-right text-blue-600 font-medium">{s.taken}</td>
                                    <td className="px-6 py-3 text-right text-amber-600 font-medium">{s.returned}</td>
                                    <td className="px-6 py-3 text-right text-emerald-600 font-bold">{s.sold}</td>
                                    <td className="px-6 py-3 text-right text-slate-800 font-bold">₹{s.revenue}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold">
                                <td className="px-6 py-3 text-slate-800">{t('admin.total')}</td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3 text-right text-blue-600">{stockSummary.reduce((a, s) => a + s.taken, 0)}</td>
                                <td className="px-6 py-3 text-right text-amber-600">{stockSummary.reduce((a, s) => a + s.returned, 0)}</td>
                                <td className="px-6 py-3 text-right text-emerald-600">{stockSummary.reduce((a, s) => a + s.sold, 0)}</td>
                                <td className="px-6 py-3 text-right text-slate-800">₹{stockSummary.reduce((a, s) => a + s.revenue, 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
