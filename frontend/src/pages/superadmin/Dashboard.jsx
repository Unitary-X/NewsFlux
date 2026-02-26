import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { ShieldAlert, LogOut, CheckCircle, XCircle, Activity, Box, Users } from 'lucide-react';

export default function SuperAdminDashboard() {
    const { user, logout } = useAuth();
    const [agencies, setAgencies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAgencies = async () => {
        try {
            const res = await api.get('/superadmin/agencies');
            setAgencies(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAgencies();
    }, []);

    const toggleStatus = async (agencyId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await api.put(`/superadmin/agencies/${agencyId}/status`, { status: newStatus });
            // Direct local update for snappy UI
            setAgencies(agencies.map(a => a.id === agencyId ? { ...a, status: newStatus } : a));
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const activeCount = agencies.filter(a => a.status === 'active').length;

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-300 relative overflow-hidden flex flex-col items-center py-10 px-4">
            {/* Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] -z-10"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-red-600/20 rounded-full mix-blend-screen filter blur-[100px] -z-10"></div>

            <div className="w-full max-w-6xl z-10">
                {/* Header */}
                <header className="flex justify-between items-center mb-16 backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl ring-1 ring-indigo-500/50">
                            <ShieldAlert className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-widest uppercase">God Mode</h1>
                            <p className="text-indigo-300 text-sm font-mono tracking-widest uppercase mt-1">Platform Telemetry Systems</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full transition-colors text-sm font-semibold tracking-wider uppercase"
                    >
                        <LogOut className="w-4 h-4" /> Terminate Session
                    </button>
                </header>

                {/* Neon Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <MetricCard icon={<Box />} label="Total Nodes" value={agencies.length} color="indigo" />
                    <MetricCard icon={<Activity />} label="Active Tenants" value={activeCount} color="emerald" />
                    <MetricCard icon={<Users />} label="Suspended" value={agencies.length - activeCount} color="red" />
                </div>

                {/* Agency Datatable */}
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-slate-700/50 bg-slate-800/40">
                        <h2 className="text-xl font-bold text-white tracking-tight">Registered Tenants</h2>
                    </div>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 text-xs tracking-widest text-slate-400 uppercase font-bold">
                                <th className="px-6 py-4">Agency ID</th>
                                <th className="px-6 py-4">Name Configuration</th>
                                <th className="px-6 py-4">Network Status</th>
                                <th className="px-6 py-4 text-right">Overrides</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {isLoading ? (
                                <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-mono">Loading telemetry data...</td></tr>
                            ) : agencies.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-mono">No tenants registered on shard.</td></tr>
                            ) : (
                                agencies.map(agency => (
                                    <tr key={agency.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-5 font-mono text-xs text-indigo-300">{agency.id}</td>
                                        <td className="px-6 py-5 font-bold text-white">{agency.name}</td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${agency.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {agency.status === 'active' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                {agency.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right space-x-3">
                                            <button
                                                onClick={() => toggleStatus(agency.id, agency.status)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${agency.status === 'active'
                                                        ? 'bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10'
                                                        : 'bg-transparent border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                                                    }`}
                                            >
                                                {agency.status === 'active' ? 'Suspend' : 'Reactivate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }) {
    const colorMap = {
        indigo: 'from-indigo-500/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400',
        emerald: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
        red: 'from-red-500/20 to-red-900/10 border-red-500/30 text-red-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-colors`}></div>
            <div className={`mb-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/50 border border-${color}-500/20 text-${color}-400`}>
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
            </div>
            <div className="text-4xl font-black text-white mb-1.5 tracking-tight">{value}</div>
            <div className="text-xs uppercase tracking-widest font-bold opacity-70">{label}</div>
        </div>
    );
}
