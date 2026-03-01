import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const pageSize = 20;

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const params = { skip: (page - 1) * pageSize, limit: pageSize };
                if (search.trim()) params.search = search.trim();
                const res = await api.get('/superadmin/audit-logs', { params });
                setLogs(res.data.items || res.data);
                setTotal(res.data.total ?? (res.data.items || res.data).length);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [page, search]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const actionColor = (action) => {
        if (!action) return 'text-slate-400';
        const a = action.toLowerCase();
        if (a.includes('create') || a.includes('add')) return 'text-emerald-400';
        if (a.includes('delete') || a.includes('remove') || a.includes('suspend')) return 'text-red-400';
        if (a.includes('update') || a.includes('edit')) return 'text-amber-400';
        if (a.includes('login') || a.includes('auth')) return 'text-cyan-400';
        return 'text-indigo-400';
    };

    return (
        <div className="p-8 text-slate-300 space-y-6">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Audit Logs
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search by action, user, entity..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm text-slate-200 py-2 pl-9 pr-4 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 outline-none"
                />
            </div>

            {/* Table */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-900/50 text-[11px] tracking-widest text-slate-500 uppercase font-bold">
                            <th className="px-5 py-3">Timestamp</th>
                            <th className="px-5 py-3">User</th>
                            <th className="px-5 py-3">Action</th>
                            <th className="px-5 py-3">Entity</th>
                            <th className="px-5 py-3">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {isLoading ? (
                            <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-600 text-sm animate-pulse">Loading...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-600 text-sm">No audit logs found.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-5 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-slate-300">
                                        {log.user_email || log.user_id || '—'}
                                    </td>
                                    <td className={`px-5 py-3 font-semibold ${actionColor(log.action)}`}>
                                        {log.action || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-slate-400">
                                        {log.entity_type || '—'}
                                        {log.entity_id ? <span className="text-slate-600 text-xs ml-1">#{log.entity_id}</span> : null}
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500 max-w-xs truncate">
                                        {log.details || '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{total} total log{total !== 1 && 's'}</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
