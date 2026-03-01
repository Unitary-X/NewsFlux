import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Activity, Server, Database, Clock, RefreshCw, Gauge, AlertTriangle, Zap, HardDrive } from 'lucide-react';

export default function SystemHealth() {
    const [health, setHealth] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadHealth = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/superadmin/system-health');
            setHealth(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHealth();
        const interval = setInterval(loadHealth, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (isLoading && !health) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-indigo-400 font-mono text-sm animate-pulse">Checking system health...</div>
            </div>
        );
    }

    const dbOk = health?.database_status === 'healthy';
    const apm = health?.apm || {};

    const latencyColor = (ms) => {
        if (ms < 100) return 'text-emerald-400';
        if (ms < 500) return 'text-amber-400';
        return 'text-red-400';
    };

    const errorRateColor = (rate) => {
        if (rate < 1) return 'text-emerald-400';
        if (rate < 5) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="p-8 text-slate-300 space-y-8">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; System Health
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-2xl font-bold text-white">System Health</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600 font-mono">Auto-refresh: 30s</span>
                    <button onClick={loadHealth} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Database */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className={`w-5 h-5 ${dbOk ? 'text-emerald-400' : 'text-red-400'}`} />
                        <h3 className="text-white font-bold">Database</h3>
                    </div>
                    <div className={`inline-flex items-center gap-2 text-sm font-bold ${dbOk ? 'text-emerald-400' : 'text-red-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${dbOk ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        {dbOk ? 'Healthy' : 'Unhealthy'}
                    </div>
                </div>

                {/* Server */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Server className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-white font-bold">Server</h3>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-mono">
                        {health?.server_time ? new Date(health.server_time).toLocaleString() : '—'}
                    </div>
                </div>

                {/* Memory */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <HardDrive className="w-5 h-5 text-amber-400" />
                        <h3 className="text-white font-bold">Memory</h3>
                    </div>
                    <div className="text-2xl font-black text-white">{health?.memory_mb ?? 0} MB</div>
                    <div className="text-xs text-slate-500 mt-1">Process RSS</div>
                </div>
            </div>

            {/* APM Metrics */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Gauge className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-white font-bold text-lg">APM Metrics</h3>
                    <span className="text-[10px] text-slate-600 font-mono ml-2">(Last 1 hour)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {/* P50 Latency */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">P50 Latency</p>
                        <div className={`text-2xl font-black ${latencyColor(apm.p50_latency_ms)}`}>
                            {apm.p50_latency_ms ?? 0}<span className="text-sm ml-1 opacity-70">ms</span>
                        </div>
                    </div>
                    {/* P95 Latency */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">P95 Latency</p>
                        <div className={`text-2xl font-black ${latencyColor(apm.p95_latency_ms)}`}>
                            {apm.p95_latency_ms ?? 0}<span className="text-sm ml-1 opacity-70">ms</span>
                        </div>
                    </div>
                    {/* P99 Latency */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">P99 Latency</p>
                        <div className={`text-2xl font-black ${latencyColor(apm.p99_latency_ms)}`}>
                            {apm.p99_latency_ms ?? 0}<span className="text-sm ml-1 opacity-70">ms</span>
                        </div>
                    </div>
                    {/* Error Rate */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Error Rate</p>
                        <div className={`text-2xl font-black ${errorRateColor(apm.error_rate)}`}>
                            {apm.error_rate ?? 0}<span className="text-sm ml-1 opacity-70">%</span>
                        </div>
                    </div>
                </div>

                {/* Additional metrics row */}
                <div className="grid grid-cols-3 gap-5 mt-5">
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Total Requests</p>
                        <div className="text-xl font-black text-white">{apm.total_requests ?? 0}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Errors</p>
                        <div className="text-xl font-black text-red-400">{apm.error_count ?? 0}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Requests/min</p>
                        <div className="text-xl font-black text-cyan-400">{apm.requests_per_minute ?? 0}</div>
                    </div>
                </div>

                {/* Latency Visual Bar */}
                <div className="mt-6">
                    <p className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-wider">Latency Distribution</p>
                    <div className="flex items-end gap-2 h-16">
                        {[
                            { label: 'P50', value: apm.p50_latency_ms || 0, color: 'bg-emerald-500' },
                            { label: 'Avg', value: apm.avg_latency_ms || 0, color: 'bg-cyan-500' },
                            { label: 'P95', value: apm.p95_latency_ms || 0, color: 'bg-amber-500' },
                            { label: 'P99', value: apm.p99_latency_ms || 0, color: 'bg-red-500' },
                        ].map(item => {
                            const maxVal = Math.max(apm.p99_latency_ms || 1, 1);
                            const pct = Math.min((item.value / maxVal) * 100, 100);
                            return (
                                <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full bg-slate-800 rounded-t-md relative" style={{ height: '48px' }}>
                                        <div
                                            className={`absolute bottom-0 w-full ${item.color} rounded-t-md transition-all duration-500`}
                                            style={{ height: `${Math.max(pct, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-mono">{item.label}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{item.value}ms</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Data Counts */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-5">Platform Data Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <CountCard label="Agencies" count={health?.counts?.agencies} />
                    <CountCard label="Users" count={health?.counts?.users} />
                    <CountCard label="Newspapers" count={health?.counts?.newspapers} />
                    <CountCard label="Customers" count={health?.counts?.customers} />
                    <CountCard label="Subscriptions" count={health?.counts?.subscriptions} />
                    <CountCard label="Daily Stocks" count={health?.counts?.daily_stocks} />
                    <CountCard label="Invoices" count={health?.counts?.invoices} />
                    <CountCard label="Audit Logs" count={health?.counts?.audit_logs} />
                </div>
            </div>
        </div>
    );
}

function CountCard({ label, count }) {
    return (
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-white">{count ?? 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">{label}</div>
        </div>
    );
}
