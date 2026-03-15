import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Trash2, X, Loader2, RefreshCw,
    Calendar, Save, Package, IndianRupee, TrendingUp,
} from 'lucide-react';
import api from '../../utils/api';

export default function Workers() {
    const [workers, setWorkers] = useState([]);
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('workers');

    // Add worker form
    const [showAddForm, setShowAddForm] = useState(false);
    const [workerForm, setWorkerForm] = useState({ username: '', password: '' });
    const [submitting, setSubmitting] = useState(false);

    // Daily ledger
    const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().split('T')[0]);
    const [ledgerEntries, setLedgerEntries] = useState({});
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [savingRows, setSavingRows] = useState({});

    // Per-worker all-time summaries
    const [summaries, setSummaries] = useState({});

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (activeTab === 'ledger') loadLedger();
    }, [ledgerDate, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadData = async () => {
        setLoading(true);
        try {
            const [wRes, pRes] = await Promise.all([
                api.get('/admin/workers'),
                api.get('/admin/newspapers'),
            ]);
            setWorkers(wRes.data);
            setNewspapers(pRes.data);

            // Fetch per-worker summaries in parallel
            if (wRes.data.length > 0) {
                const rows = await Promise.all(
                    wRes.data.map(w =>
                        api.get(`/admin/workers/${w.id}/summary`)
                            .then(r => [w.id, r.data])
                            .catch(() => [w.id, null])
                    )
                );
                const map = {};
                rows.forEach(([id, data]) => { if (data) map[id] = data; });
                setSummaries(map);
            } else {
                setSummaries({});
            }
        } catch (err) {
            console.error('Failed to load workers data', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLedger = async () => {
        setLedgerLoading(true);
        try {
            const res = await api.get(`/admin/workers/stock?target_date=${ledgerDate}`);
            const saved = {};
            res.data.forEach(e => { saved[`${e.worker_id}_${e.newspaper_id}`] = e; });

            // Pre-populate all worker × newspaper combinations
            const full = {};
            workers.forEach(w => {
                newspapers.forEach(p => {
                    const key = `${w.id}_${p.id}`;
                    full[key] = saved[key] || {
                        worker_id: w.id, newspaper_id: p.id,
                        taken: 0, returned: 0, amount_given: 0, sold: 0,
                    };
                });
            });
            setLedgerEntries(full);
        } catch (err) {
            console.error('Failed to load ledger', err);
        } finally {
            setLedgerLoading(false);
        }
    };

    const addWorker = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/admin/workers', workerForm);
            setWorkerForm({ username: '', password: '' });
            setShowAddForm(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add worker');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteWorker = async (id, name) => {
        if (!confirm(`Delete worker "${name}"?\nAll their assignments and stock records will also be removed.`)) return;
        try {
            await api.delete(`/admin/workers/${id}`);
            loadData();
        } catch {
            alert('Failed to delete worker');
        }
    };

    const updateField = (workerId, paperId, field, raw) => {
        const key = `${workerId}_${paperId}`;
        const val = field === 'amount_given' ? parseFloat(raw) || 0 : parseInt(raw) || 0;
        setLedgerEntries(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: val },
        }));
    };

    const saveRow = async (workerId, paperId) => {
        const key = `${workerId}_${paperId}`;
        setSavingRows(prev => ({ ...prev, [key]: true }));
        const entry = ledgerEntries[key];
        try {
            await api.post('/admin/workers/stock', {
                worker_id: workerId,
                newspaper_id: paperId,
                date: ledgerDate,
                taken: entry.taken || 0,
                returned: entry.returned || 0,
                amount_given: entry.amount_given || 0,
            });
            // Update the computed 'sold' field locally
            setLedgerEntries(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    sold: Math.max(0, (entry.taken || 0) - (entry.returned || 0)),
                },
            }));
        } catch {
            alert('Failed to save entry');
        } finally {
            setSavingRows(prev => ({ ...prev, [key]: false }));
        }
    };

    const totalSold = Object.values(summaries).reduce((s, m) => s + (m?.total_sold || 0), 0);
    const totalAmount = Object.values(summaries).reduce((s, m) => s + (m?.total_amount_given || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Page header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Workers</h1>
                    <p className="text-slate-500 mt-2">Manage delivery workers and record their daily paper collections</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-sm text-slate-500">Total Workers</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{workers.length}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm text-slate-500">Total Sold (All Time)</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{totalSold}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <span className="text-sm text-slate-500">Total Collected (All Time)</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">₹{totalAmount.toFixed(2)}</p>
                </div>
            </div>

            {/* Tab panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">

                {/* Tab bar */}
                <div className="flex items-center justify-between border-b border-slate-200 px-2">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('workers')}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                activeTab === 'workers'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            Workers
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                activeTab === 'workers' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                            }`}>{workers.length}</span>
                        </button>

                        <button
                            onClick={() => { setActiveTab('ledger'); loadLedger(); }}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                activeTab === 'ledger'
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Package className="w-4 h-4" />
                            Daily Ledger
                        </button>
                    </div>

                    {/* Right-side controls */}
                    <div className="pr-2">
                        {activeTab === 'workers' ? (
                            <button
                                onClick={() => setShowAddForm(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    showAddForm
                                        ? 'bg-slate-200 text-slate-700'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                {showAddForm ? 'Cancel' : 'Add Worker'}
                            </button>
                        ) : (
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="date"
                                    value={ledgerDate}
                                    onChange={e => setLedgerDate(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Add Worker inline form ── */}
                {activeTab === 'workers' && showAddForm && (
                    <form
                        onSubmit={addWorker}
                        className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-end gap-4 flex-wrap"
                    >
                        <div className="flex-1 min-w-40">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                            <input
                                value={workerForm.username}
                                onChange={e => setWorkerForm(p => ({ ...p, username: e.target.value }))}
                                required
                                placeholder="e.g. worker_ravi"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex-1 min-w-40">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                            <input
                                type="password"
                                value={workerForm.password}
                                onChange={e => setWorkerForm(p => ({ ...p, password: e.target.value }))}
                                required
                                minLength={6}
                                placeholder="Min 6 characters"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Create Worker
                        </button>
                    </form>
                )}

                {/* ── Workers tab ── */}
                {activeTab === 'workers' && (
                    workers.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="font-medium">No workers yet</p>
                            <p className="text-sm mt-1">Click "Add Worker" to create the first delivery worker</p>
                        </div>
                    ) : (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workers.map(w => {
                                const s = summaries[w.id];
                                return (
                                    <div key={w.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                                        {/* Worker header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base uppercase flex-shrink-0">
                                                    {w.username[0]}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{w.username}</p>
                                                    <p className="text-xs text-slate-400">Delivery Worker</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteWorker(w.id, w.username)}
                                                title="Delete worker"
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                                                <p className="text-xs text-slate-400">Papers Taken</p>
                                                <p className="font-bold text-slate-700 mt-0.5 text-xl">{s?.total_taken ?? 0}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                                                <p className="text-xs text-slate-400">Papers Returned</p>
                                                <p className="font-bold text-slate-700 mt-0.5 text-xl">{s?.total_returned ?? 0}</p>
                                            </div>
                                            <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                                                <p className="text-xs text-emerald-600">Papers Sold</p>
                                                <p className="font-bold text-emerald-700 mt-0.5 text-xl">{s?.total_sold ?? 0}</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
                                                <p className="text-xs text-amber-600">Amount Given</p>
                                                <p className="font-bold text-amber-700 mt-0.5 text-xl">₹{(s?.total_amount_given ?? 0).toFixed(0)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* ── Daily Ledger tab ── */}
                {activeTab === 'ledger' && (
                    ledgerLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                    ) : workers.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="font-medium">No workers found</p>
                            <p className="text-sm">Add workers from the Workers tab first</p>
                        </div>
                    ) : newspapers.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="font-medium">No newspapers configured</p>
                            <p className="text-sm">Add newspapers from the Newspapers page first</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Worker</th>
                                        <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Newspaper</th>
                                        <th className="text-center px-3 py-3 font-semibold text-slate-600 whitespace-nowrap">Taken</th>
                                        <th className="text-center px-3 py-3 font-semibold text-slate-600 whitespace-nowrap">Returned</th>
                                        <th className="text-center px-3 py-3 font-semibold text-emerald-700 whitespace-nowrap">Sold</th>
                                        <th className="text-center px-3 py-3 font-semibold text-amber-700 whitespace-nowrap">Amount Given (₹)</th>
                                        <th className="text-center px-3 py-3 font-semibold text-slate-600 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {workers.flatMap(w =>
                                        newspapers.map(p => {
                                            const key = `${w.id}_${p.id}`;
                                            const entry = ledgerEntries[key] || { taken: 0, returned: 0, amount_given: 0, sold: 0 };
                                            const sold = Math.max(0, (entry.taken || 0) - (entry.returned || 0));
                                            const isSaving = savingRows[key];
                                            return (
                                                <tr key={key} className="hover:bg-slate-50 transition-colors">
                                                    {/* Worker */}
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                                                {w.username[0]}
                                                            </div>
                                                            <span className="font-medium text-slate-700">{w.username}</span>
                                                        </div>
                                                    </td>
                                                    {/* Newspaper */}
                                                    <td className="px-4 py-2.5 text-slate-600 font-medium">{p.name}</td>
                                                    {/* Taken */}
                                                    <td className="px-3 py-2.5">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={entry.taken || 0}
                                                            onChange={e => updateField(w.id, p.id, 'taken', e.target.value)}
                                                            className="w-20 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400 outline-none block mx-auto"
                                                        />
                                                    </td>
                                                    {/* Returned */}
                                                    <td className="px-3 py-2.5">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={entry.returned || 0}
                                                            onChange={e => updateField(w.id, p.id, 'returned', e.target.value)}
                                                            className="w-20 text-center bg-white border border-orange-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-400 outline-none block mx-auto"
                                                        />
                                                    </td>
                                                    {/* Sold (calculated) */}
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`text-base font-bold ${sold > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {sold}
                                                        </span>
                                                    </td>
                                                    {/* Amount given */}
                                                    <td className="px-3 py-2.5">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={entry.amount_given || 0}
                                                            onChange={e => updateField(w.id, p.id, 'amount_given', e.target.value)}
                                                            className="w-24 text-center bg-white border border-amber-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-none block mx-auto"
                                                        />
                                                    </td>
                                                    {/* Save */}
                                                    <td className="px-3 py-2.5 text-center">
                                                        <button
                                                            onClick={() => saveRow(w.id, p.id)}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                                                        >
                                                            {isSaving
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <Save className="w-3 h-3" />
                                                            }
                                                            Save
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
