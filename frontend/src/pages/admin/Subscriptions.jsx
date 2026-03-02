import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2, Search, BookOpen } from 'lucide-react';
import useTableControls from '../../hooks/useTableControls';
import { SortHeader, Pagination, BulkBar, SelectCheckbox } from '../../components/admin/TableControls';

export default function Subscriptions() {
    const { t } = useTranslation();
    const [subs, setSubs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ customer_id: '', newspaper_id: '', quantity: 1, price: '', subscription_type: 'daily' });

    const fetchAll = async () => {
        try {
            const [subsRes, custRes, paperRes] = await Promise.all([
                api.get('/admin/subscriptions'),
                api.get('/admin/customers'),
                api.get('/admin/newspapers'),
            ]);
            setSubs(subsRes.data);
            setCustomers(custRes.data);
            setNewspapers(paperRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = subs.filter(s => {
        const q = search.toLowerCase();
        return (s.customer_name || '').toLowerCase().includes(q) || (s.newspaper_name || '').toLowerCase().includes(q);
    });

    const tc = useTableControls(filtered, { defaultSort: { key: 'customer_name', dir: 'asc' } });

    const createSub = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/subscriptions', {
                customer_id: form.customer_id,
                newspaper_id: form.newspaper_id,
                quantity: parseInt(form.quantity) || 1,
                price: form.price ? parseFloat(form.price) : null,
                subscription_type: form.subscription_type || 'daily',
            });
            setShowForm(false);
            setForm({ customer_id: '', newspaper_id: '', quantity: 1, price: '', subscription_type: 'daily' });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create subscription');
        }
    };

    const toggleStatus = async (sub) => {
        try {
            await api.put(`/admin/subscriptions/${sub.id}`, {
                status: sub.status === 1 ? 0 : 1,
            });
            fetchAll();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const deleteSub = async (id) => {
        if (!confirm(t('subscriptions.delete_confirm'))) return;
        try {
            await api.delete(`/admin/subscriptions/${id}`);
            fetchAll();
        } catch (err) {
            alert(t('subscriptions.delete_fail'));
        }
    };

    const bulkDelete = async () => {
        if (!confirm(`Delete ${tc.selected.size} subscription(s)?`)) return;
        try {
            await Promise.all([...tc.selected].map(id => api.delete(`/admin/subscriptions/${id}`)));
            tc.clearSelection();
            fetchAll();
        } catch (err) {
            alert(t('subscriptions.delete_fail'));
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('subscriptions.title')}</h1>
                    <p className="text-slate-500 mt-2">{t('subscriptions.subtitle')}</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> {t('subscriptions.add')}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> {t('subscriptions.add')}</h2>
                    <form onSubmit={createSub} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('subscriptions.customer')}</label>
                            <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">{t('common.search_placeholder')}</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('subscriptions.newspaper')}</label>
                            <select value={form.newspaper_id} onChange={e => setForm({ ...form, newspaper_id: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">{t('common.search_placeholder')}</option>
                                {newspapers.map(n => <option key={n.id} value={n.id}>{n.name} (₹{Number(n.base_price).toFixed(2)})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('subscriptions.type', 'Type')}</label>
                            <select value={form.subscription_type} onChange={e => setForm({ ...form, subscription_type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="daily">{t('subscriptions.daily', 'Daily')}</option>
                                <option value="weekly">{t('subscriptions.weekly', 'Weekly')}</option>
                                <option value="monthly">{t('subscriptions.monthly', 'Monthly')}</option>
                                <option value="yearly">{t('subscriptions.yearly', 'Yearly')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('subscriptions.quantity')}</label>
                            <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">{t('subscriptions.custom_price')}</label>
                            <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder={t('subscriptions.price')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors">{t('subscriptions.create')}</button>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder')} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <BulkBar count={tc.selected.size} onDelete={bulkDelete} onClear={tc.clearSelection} />
                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">{t('subscriptions.no_subs')}</div>
                ) : (
                    <>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                <th className="px-6 py-4 w-10"><SelectCheckbox checked={tc.selected.size === tc.paged.length && tc.paged.length > 0} onChange={tc.toggleSelectAll} /></th>
                                <SortHeader label={t('subscriptions.customer')} sortKey="customer_name" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} />
                                <SortHeader label={t('subscriptions.newspaper')} sortKey="newspaper_name" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} />
                                <SortHeader label={t('subscriptions.type', 'Type')} sortKey="subscription_type" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} className="text-center" />
                                <SortHeader label={t('subscriptions.quantity')} sortKey="quantity" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} className="text-center" />
                                <SortHeader label={t('subscriptions.price')} sortKey="price" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} className="text-right" />
                                <th className="px-6 py-4 font-semibold text-slate-600 text-center">{t('subscriptions.status')}</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tc.paged.map(sub => (
                                <tr key={sub.id} className={`hover:bg-slate-50 ${tc.selected.has(sub.id) ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-6 py-4"><SelectCheckbox checked={tc.selected.has(sub.id)} onChange={() => tc.toggleSelect(sub.id)} /></td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{sub.customer_name}</td>
                                    <td className="px-6 py-4 text-slate-600">{sub.newspaper_name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                            sub.subscription_type === 'daily' ? 'bg-blue-100 text-blue-700' :
                                            sub.subscription_type === 'weekly' ? 'bg-purple-100 text-purple-700' :
                                            sub.subscription_type === 'monthly' ? 'bg-amber-100 text-amber-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>{sub.subscription_type || 'daily'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-700">{sub.quantity}</td>
                                    <td className="px-6 py-4 text-right text-slate-700">{sub.price ? `₹${Number(sub.price).toFixed(2)}` : 'Base'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggleStatus(sub)} className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                            {sub.status === 1 ? t('billing.status_pending') : 'Paused'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteSub(sub.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination page={tc.page} totalPages={tc.totalPages} totalItems={tc.totalItems} pageSize={tc.pageSize} onPageChange={tc.setPage} onPageSizeChange={tc.changePageSize} pageSizeOptions={tc.PAGE_SIZE_OPTIONS} />
                    </>
                )}
            </div>
        </div>
    );
}
