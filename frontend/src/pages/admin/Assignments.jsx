import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2, Search, Route } from 'lucide-react';

export default function Assignments() {
    const { t } = useTranslation();
    const [assignments, setAssignments] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ worker_id: '', customer_id: '', route_order: 0 });

    const fetchAll = async () => {
        try {
            const [assignRes, workerRes, custRes] = await Promise.all([
                api.get('/admin/assignments'),
                api.get('/admin/workers'),
                api.get('/admin/customers'),
            ]);
            setAssignments(assignRes.data);
            setWorkers(workerRes.data);
            setCustomers(custRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = assignments.filter(a => {
        const q = search.toLowerCase();
        return (a.worker_name || '').toLowerCase().includes(q) || (a.customer_name || '').toLowerCase().includes(q);
    });

    // Group by worker for display
    const grouped = {};
    filtered.forEach(a => {
        if (!grouped[a.worker_id]) {
            grouped[a.worker_id] = { name: a.worker_name, assignments: [] };
        }
        grouped[a.worker_id].assignments.push(a);
    });

    const createAssignment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/assignments', {
                worker_id: form.worker_id,
                customer_id: form.customer_id,
                route_order: parseInt(form.route_order) || 0,
            });
            setShowForm(false);
            setForm({ worker_id: '', customer_id: '', route_order: 0 });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create assignment');
        }
    };

    const deleteAssignment = async (id) => {
        if (!confirm(t('assignments.delete_confirm'))) return;
        try {
            await api.delete(`/admin/assignments/${id}`);
            fetchAll();
        } catch (err) {
            alert(t('assignments.delete_fail'));
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('assignments.title')}</h1>
                    <p className="text-slate-500 mt-2">{t('assignments.subtitle')}</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> {t('assignments.add')}
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Route className="w-5 h-5 text-indigo-500" /> {t('assignments.form_title')}</h2>
                    <form onSubmit={createAssignment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('assignments.worker')}</label>
                            <select value={form.worker_id} onChange={e => setForm({ ...form, worker_id: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">{t('common.search_placeholder')}</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.username}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('assignments.customer')}</label>
                            <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">{t('common.search_placeholder')}</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('assignments.route_order')}</label>
                            <input type="number" min="0" value={form.route_order} onChange={e => setForm({ ...form, route_order: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors">{t('assignments.assign')}</button>
                    </form>
                </div>
            )}

            <div className="mb-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder')} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                    {t('assignments.no_assignments')}
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([workerId, group]) => (
                        <div key={workerId} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg"><Route className="w-4 h-4 text-indigo-600" /></div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{group.name}</h3>
                                    <p className="text-xs text-slate-500">{group.assignments.length} {group.assignments.length !== 1 ? t('assignments.customer_assigned') : t('assignments.customer_assigned_singular')}</p>
                                </div>
                            </div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-3 font-semibold text-slate-600 w-16">#</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">{t('assignments.customer')}</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {group.assignments.sort((a, b) => a.route_order - b.route_order).map((a, idx) => (
                                        <tr key={a.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3">
                                                <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{a.route_order}</span>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-800">{a.customer_name}</td>
                                            <td className="px-6 py-3 text-right">
                                                <button onClick={() => deleteAssignment(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
