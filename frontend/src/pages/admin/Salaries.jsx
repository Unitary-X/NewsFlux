import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, Search, Wallet, X } from 'lucide-react';

export default function Salaries() {
    const { t } = useTranslation();
    const [salaries, setSalaries] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [form, setForm] = useState({ worker_id: '', month: now.getMonth() + 1, year: now.getFullYear(), base_salary: '', bonus: '0', deductions: '0', notes: '' });
    const [editData, setEditData] = useState({});

    const fetchAll = async () => {
        try {
            let url = '/admin/salaries';
            const params = [];
            if (filterMonth) params.push(`month=${filterMonth}`);
            if (filterYear) params.push(`year=${filterYear}`);
            if (params.length) url += '?' + params.join('&');
            const [salRes, workRes] = await Promise.all([api.get(url), api.get('/admin/workers')]);
            setSalaries(salRes.data);
            setWorkers(workRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [filterMonth, filterYear]);

    const filtered = salaries.filter(s => {
        const q = search.toLowerCase();
        return (s.worker_name || '').toLowerCase().includes(q);
    });

    const createSalary = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/salaries', {
                worker_id: form.worker_id,
                month: parseInt(form.month),
                year: parseInt(form.year),
                base_salary: parseFloat(form.base_salary) || 0,
                bonus: parseFloat(form.bonus) || 0,
                deductions: parseFloat(form.deductions) || 0,
                notes: form.notes || null,
            });
            setShowForm(false);
            setForm({ worker_id: '', month: now.getMonth() + 1, year: now.getFullYear(), base_salary: '', bonus: '0', deductions: '0', notes: '' });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || t('common.failed', 'Failed'));
        }
    };

    const startEdit = (s) => {
        setEditId(s.id);
        setEditData({ base_salary: s.base_salary, bonus: s.bonus, deductions: s.deductions, notes: s.notes || '' });
    };

    const saveEdit = async (id) => {
        try {
            await api.put(`/admin/salaries/${id}`, {
                base_salary: parseFloat(editData.base_salary) || 0,
                bonus: parseFloat(editData.bonus) || 0,
                deductions: parseFloat(editData.deductions) || 0,
                notes: editData.notes || null,
            });
            setEditId(null);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || t('common.failed', 'Failed'));
        }
    };

    const markPaid = async (id) => {
        try {
            await api.put(`/admin/salaries/${id}/pay`);
            fetchAll();
        } catch (err) { alert(t('common.failed', 'Failed')); }
    };

    const deleteSalary = async (id) => {
        if (!confirm(t('common.confirm', 'Are you sure?'))) return;
        try {
            await api.delete(`/admin/salaries/${id}`);
            fetchAll();
        } catch (err) { alert(t('common.failed', 'Failed')); }
    };

    const totalPending = filtered.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.total_amount, 0);
    const totalPaid = filtered.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.total_amount, 0);

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('salaries.title', 'Salary Management')}</h1>
                    <p className="text-slate-500 text-sm mt-1">{t('salaries.subtitle', 'Manage worker compensation and payroll')}</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> {t('salaries.add', 'Add Salary')}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 font-medium">{t('salaries.total_records', 'Total Records')}</p>
                    <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <p className="text-xs text-amber-600 font-medium">{t('salaries.pending_amount', 'Pending')}</p>
                    <p className="text-2xl font-bold text-amber-700">₹{totalPending.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                    <p className="text-xs text-green-600 font-medium">{t('salaries.paid_amount', 'Paid')}</p>
                    <p className="text-2xl font-bold text-green-700">₹{totalPaid.toLocaleString()}</p>
                </div>
            </div>

            {/* Create form */}
            {showForm && (
                <form onSubmit={createSalary} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700">{t('salaries.new', 'New Salary Record')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <select value={form.worker_id} onChange={e => setForm({ ...form, worker_id: e.target.value })} required className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                            <option value="">{t('salaries.select_worker', 'Select Worker')}</option>
                            {workers.map(w => <option key={w.id} value={w.id}>{w.username}</option>)}
                        </select>
                        <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
                        </select>
                        <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Year" />
                        <input type="number" step="0.01" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} required className="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder={t('salaries.base_salary', 'Base Salary')} />
                        <input type="number" step="0.01" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder={t('salaries.bonus', 'Bonus')} />
                        <input type="number" step="0.01" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder={t('salaries.deductions', 'Deductions')} />
                        <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder={t('salaries.notes', 'Notes')} />
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{t('common.save', 'Save')}</button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder', 'Search...')} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">{t('salaries.all_months', 'All Months')}</option>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">{t('salaries.all_years', 'All Years')}</option>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">{t('salaries.worker', 'Worker')}</th>
                            <th className="text-left px-4 py-3 font-medium">{t('salaries.period', 'Period')}</th>
                            <th className="text-right px-4 py-3 font-medium">{t('salaries.base', 'Base')}</th>
                            <th className="text-right px-4 py-3 font-medium">{t('salaries.bonus', 'Bonus')}</th>
                            <th className="text-right px-4 py-3 font-medium">{t('salaries.ded', 'Ded.')}</th>
                            <th className="text-right px-4 py-3 font-medium">{t('salaries.total', 'Total')}</th>
                            <th className="text-center px-4 py-3 font-medium">{t('salaries.status', 'Status')}</th>
                            <th className="text-center px-4 py-3 font-medium">{t('common.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="text-center py-8 text-slate-400">{t('salaries.no_data', 'No salary records found')}</td></tr>
                        )}
                        {filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{s.worker_name}</td>
                                <td className="px-4 py-3 text-slate-600">{new Date(s.year, s.month - 1).toLocaleString('default', { month: 'short' })} {s.year}</td>
                                {editId === s.id ? (
                                    <>
                                        <td className="px-4 py-2"><input type="number" step="0.01" value={editData.base_salary} onChange={e => setEditData({ ...editData, base_salary: e.target.value })} className="w-20 border rounded px-2 py-1 text-sm text-right" /></td>
                                        <td className="px-4 py-2"><input type="number" step="0.01" value={editData.bonus} onChange={e => setEditData({ ...editData, bonus: e.target.value })} className="w-16 border rounded px-2 py-1 text-sm text-right" /></td>
                                        <td className="px-4 py-2"><input type="number" step="0.01" value={editData.deductions} onChange={e => setEditData({ ...editData, deductions: e.target.value })} className="w-16 border rounded px-2 py-1 text-sm text-right" /></td>
                                        <td className="px-4 py-3 text-right font-bold">₹{((parseFloat(editData.base_salary) || 0) + (parseFloat(editData.bonus) || 0) - (parseFloat(editData.deductions) || 0)).toLocaleString()}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-3 text-right">₹{s.base_salary.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-green-600">+₹{s.bonus.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-red-600">-₹{s.deductions.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right font-bold">₹{s.total_amount.toLocaleString()}</td>
                                    </>
                                )}
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {s.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        {editId === s.id ? (
                                            <>
                                                <button onClick={() => saveEdit(s.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><CheckCircle2 className="w-4 h-4" /></button>
                                                <button onClick={() => setEditId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                                                {s.status === 'pending' && <button onClick={() => markPaid(s.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Mark Paid"><Wallet className="w-4 h-4" /></button>}
                                                <button onClick={() => deleteSalary(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
