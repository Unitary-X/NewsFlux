import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { TrendingUp, Target, Calendar, BarChart3, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function MySales() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const res = await api.get('/worker/sales');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch sales data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="px-4 py-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link to="/worker" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{t('worker.my_sales', 'My Sales')}</h1>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{t('worker.performance_metrics', 'Performance Metrics')}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-semibold opacity-90">{t('reports.daily', 'Today')}</span>
                        </div>
                        <div className="text-3xl font-black mb-1">{data?.today?.delivered || 0}</div>
                        <div className="text-xs opacity-75">{t('worker.deliveries_made', 'Deliveries')} • {data?.today?.missed || 0} {t('worker.missed', 'Missed')}</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-semibold opacity-90">{t('reports.weekly', 'This Week')}</span>
                        </div>
                        <div className="text-3xl font-black mb-1">{data?.weekly?.delivered || 0}</div>
                        <div className="text-xs opacity-75">{t('worker.successful_deliveries', 'Successful')}</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-semibold opacity-90">{t('reports.monthly', 'This Month')}</span>
                        </div>
                        <div className="text-3xl font-black mb-1">{data?.monthly?.delivered || 0}</div>
                        <div className="text-xs opacity-75">{t('worker.total_deliveries', 'Total Deliveries')}</div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-semibold opacity-90">{t('worker.assigned', 'Assigned')}</span>
                        </div>
                        <div className="text-3xl font-black mb-1">{data?.assigned_customers || 0}</div>
                        <div className="text-xs opacity-75">{t('customers.title', 'Customers')}</div>
                    </div>
                </div>

                {/* Weekly Trend Chart */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">{t('worker.weekly_trend', 'Last 7 Days')}</h2>
                    {data?.daily_breakdown && data.daily_breakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.daily_breakdown}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => new Date(val).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="delivered" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <p>{t('common.no_data', 'No data available')}</p>
                        </div>
                    )}
                </div>

                {/* Performance Summary */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">{t('worker.performance_summary', 'Performance Summary')}</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-medium text-slate-700">{t('worker.success_rate', 'Success Rate')}</span>
                            <span className="text-lg font-bold text-emerald-600">
                                {data?.today?.delivered && (data.today.delivered + data.today.missed) > 0
                                    ? Math.round((data.today.delivered / (data.today.delivered + data.today.missed)) * 100)
                                    : 0}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-medium text-slate-700">{t('worker.avg_daily', 'Avg Daily (7d)')}</span>
                            <span className="text-lg font-bold text-blue-600">
                                {data?.daily_breakdown ? Math.round(data.daily_breakdown.reduce((sum, d) => sum + d.delivered, 0) / 7) : 0}
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
