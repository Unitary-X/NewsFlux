import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Building2, Users, Newspaper, Activity, TrendingUp, TrendingDown, BarChart3, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DashboardSkeleton } from '../../components/Skeleton';

export default function SuperAdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [growth, setGrowth] = useState([]);
    const [topAgencies, setTopAgencies] = useState([]);
    const [trends, setTrends] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [analyticsRes, growthRes, topRes, trendsRes] = await Promise.all([
                    api.get('/superadmin/analytics'),
                    api.get('/superadmin/analytics/growth'),
                    api.get('/superadmin/analytics/top-agencies'),
                    api.get('/superadmin/analytics/trends'),
                ]);
                setAnalytics(analyticsRes.data);
                setGrowth(growthRes.data);
                setTopAgencies(topRes.data);
                setTrends(trendsRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) return <div className="p-8 px-12"><DashboardSkeleton /></div>;

    // Calculate real trend percentages from trends data
    const calcTrend = (key) => {
        if (trends.length < 2) return null;
        const latest = trends[trends.length - 1][key] || 0;
        const prev = trends[0][key] || 0;
        if (prev === 0) return latest > 0 ? '+∞' : null;
        const pct = ((latest - prev) / prev * 100).toFixed(1);
        return pct > 0 ? `+${pct}%` : `${pct}%`;
    };

    const kpis = [
        { label: "Total Agencies", value: analytics?.total_agencies ?? 0, icon: Building2, color: "indigo", trend: calcTrend("agencies"), sparkKey: "agencies" },
        { label: "Total Customers", value: analytics?.total_customers ?? 0, icon: Users, color: "cyan", trend: calcTrend("customers"), sparkKey: "customers" },
        { label: "Total Newspapers", value: analytics?.total_newspapers ?? 0, icon: Newspaper, color: "emerald", trend: calcTrend("newspapers"), sparkKey: "newspapers" },
    ];

    const pieData = [
        { name: 'Active', value: analytics?.active_agencies ?? 0 },
        { name: 'Suspended', value: analytics?.suspended_agencies ?? 0 },
    ];
    const PIE_COLORS = ['#34d399', '#f87171'];

    const maxCustomers = Math.max(...topAgencies.map(a => a.customer_count), 1);

    const sparkColors = { indigo: '#818cf8', cyan: '#22d3ee', emerald: '#34d399', amber: '#fbbf24' };

    return (
        <div className="p-8 text-slate-300 space-y-8">
            {/* Breadcrumb */}
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Dashboard &bull; Analytics
            </div>

            {/* KPI Cards with Sparklines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {kpis.map((kpi) => (
                    <KPICard key={kpi.label} {...kpi} trends={trends} sparkColor={sparkColors[kpi.color]} />
                ))}
            </div>

            {/* Row 2: Growth Chart + Side panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Agency Growth Bar Chart */}
                <div className="lg:col-span-2 backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-white font-bold text-lg">Agency Growth</h3>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span> New Agencies</span>
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={growth} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                                    cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                                />
                                <Bar dataKey="count" name="Agencies" fill="#818cf8" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right column: System Activity + Invoice */}
                <div className="flex flex-col gap-5">
                    {/* System Activity Donut */}
                    <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 flex-1">
                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" /> System Activity
                        </h3>
                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <div className="h-[160px] w-[160px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" strokeWidth={0}>
                                                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-white">
                                        {analytics?.total_agencies ? Math.round((analytics.active_agencies / analytics.total_agencies) * 100) : 0}%
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center gap-6 mt-3 text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 rounded-full"></span> Active ({analytics?.active_agencies})</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-400 rounded-full"></span> Suspended ({analytics?.suspended_agencies})</span>
                        </div>
                    </div>

                    {/* Invoice Summary */}
                    <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 flex-1">
                        <h3 className="text-white font-bold text-sm mb-4">Invoice Overview</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">Total Invoices</span>
                                <span className="text-sm font-bold text-white">{analytics?.total_invoices ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">Pending</span>
                                <span className="text-sm font-bold text-amber-400">{analytics?.pending_invoices ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500">Paid</span>
                                <span className="text-sm font-bold text-emerald-400">{analytics?.paid_invoices ?? 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Top Performing Agencies */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-white font-bold text-lg">Top Performing Agencies</h3>
                </div>
                {topAgencies.length === 0 ? (
                    <p className="text-slate-600 text-sm font-mono text-center py-8">No agency data available.</p>
                ) : (
                    <div className="space-y-4">
                        {topAgencies.map((agency, idx) => {
                            const pct = maxCustomers > 0 ? (agency.customer_count / maxCustomers) * 100 : 0;
                            const colors = ['bg-indigo-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
                                'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500'];
                            return (
                                <div key={agency.id} className="flex items-center gap-4">
                                    <span className="text-xs font-mono text-slate-600 w-5 text-right">#{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-sm font-semibold text-white truncate">{agency.name}</span>
                                            <span className="text-xs text-slate-500 ml-2 shrink-0">
                                                {agency.customer_count} customers &middot; {agency.newspaper_count} papers
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div className={`h-2 rounded-full ${colors[idx % colors.length]} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function KPICard({ label, value, icon: Icon, color, trend, trends, sparkKey, sparkColor }) {
    const colorMap = {
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', ring: 'ring-indigo-500/30' },
        cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', ring: 'ring-amber-500/30' },
    };
    const c = colorMap[color] || colorMap.indigo;

    const isPositive = trend && !trend.startsWith('-');

    return (
        <div className={`backdrop-blur-xl bg-slate-900/60 border ${c.border} rounded-2xl p-5`}>
            <div className="flex items-center gap-4 mb-3">
                <div className={`p-3 ${c.bg} rounded-xl ring-1 ${c.ring}`}>
                    <Icon className={`w-6 h-6 ${c.text}`} />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{value.toLocaleString()}</span>
                        {trend && (
                            <span className={`text-xs font-bold flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trend}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {/* Sparkline */}
            {trends && trends.length > 0 && (
                <div className="h-10 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends}>
                            <defs>
                                <linearGradient id={`spark-${sparkKey}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={sparkColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey={sparkKey} stroke={sparkColor} fill={`url(#spark-${sparkKey})`} strokeWidth={1.5} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
