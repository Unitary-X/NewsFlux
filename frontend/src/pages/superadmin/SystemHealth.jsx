import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Activity, Server, Database, Clock, RefreshCw } from 'lucide-react';

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

    useEffect(() => { loadHealth(); }, []);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-indigo-400 font-mono text-sm animate-pulse">Checking system health...</div>
            </div>
        );
    }

    const dbOk = health?.database_status === 'healthy';

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
                <button onClick={loadHealth} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                    <RefreshCw className="w-3 h-3" /> Refresh
                </button>
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

                {/* Uptime */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <h3 className="text-white font-bold">Server Time</h3>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {health?.server_time ? new Date(health.server_time).toLocaleTimeString() : '—'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {health?.server_time ? new Date(health.server_time).toLocaleDateString() : ''}
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
