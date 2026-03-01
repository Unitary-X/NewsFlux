import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart3, TrendingUp, Users, Building2, Newspaper } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

export default function Analytics() {
    const [analytics, setAnalytics] = useState(null);
    const [growth, setGrowth] = useState([]);
    const [topAgencies, setTopAgencies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [aRes, gRes, tRes] = await Promise.all([
                    api.get('/superadmin/analytics'),
                    api.get('/superadmin/analytics/growth'),
                    api.get('/superadmin/analytics/top-agencies'),
                ]);
                setAnalytics(aRes.data);
                setGrowth(gRes.data);
                setTopAgencies(tRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-indigo-400 font-mono text-sm animate-pulse">Loading analytics...</div>
            </div>
        );
    }

    // Build cumulative growth data
    let cumulative = 0;
    const cumulativeGrowth = growth.map(g => {
        cumulative += g.count;
        return { month: g.month, total: cumulative, new: g.count };
    });

    return (
        <div className="p-8 text-slate-300 space-y-8">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Analytics
            </div>

            <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatBox label="Agencies" value={analytics?.total_agencies} icon={Building2} />
                <StatBox label="Workers" value={analytics?.total_workers} icon={Users} />
                <StatBox label="Customers" value={analytics?.total_customers} icon={Users} />
                <StatBox label="Newspapers" value={analytics?.total_newspapers} icon={Newspaper} />
                <StatBox label="Invoices" value={analytics?.total_invoices} icon={TrendingUp} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly New Agencies Bar Chart */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Monthly New Agencies</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={growth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                            <Bar dataKey="count" name="New Agencies" fill="#818cf8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Cumulative Growth Area Chart */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Cumulative Agency Growth</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={cumulativeGrowth}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                            <Area type="monotone" dataKey="total" stroke="#34d399" fill="url(#colorTotal)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Agencies Detail Table */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-700/40">
                    <h3 className="text-white font-bold">Agency Breakdown</h3>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50 text-[11px] tracking-widest text-slate-500 uppercase font-bold">
                            <th className="px-5 py-3">#</th>
                            <th className="px-5 py-3">Agency</th>
                            <th className="px-5 py-3 text-center">Customers</th>
                            <th className="px-5 py-3 text-center">Workers</th>
                            <th className="px-5 py-3 text-center">Newspapers</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {topAgencies.length === 0 ? (
                            <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-600 text-sm">No data yet.</td></tr>
                        ) : (
                            topAgencies.map((a, i) => (
                                <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-5 py-3 text-xs text-slate-600 font-mono">{i + 1}</td>
                                    <td className="px-5 py-3 font-semibold text-white">{a.name}</td>
                                    <td className="px-5 py-3 text-center text-cyan-400 font-bold">{a.customer_count}</td>
                                    <td className="px-5 py-3 text-center text-amber-400 font-bold">{a.worker_count}</td>
                                    <td className="px-5 py-3 text-center text-emerald-400 font-bold">{a.newspaper_count}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatBox({ label, value, icon: Icon }) {
    return (
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
            <Icon className="w-4 h-4 text-slate-500 mx-auto mb-2" />
            <div className="text-xl font-black text-white">{value ?? 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">{label}</div>
        </div>
    );
}
