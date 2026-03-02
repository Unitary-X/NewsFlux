import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Loader2, MapPin, Phone, Pencil, Trash2, X, Search } from 'lucide-react';
import useTableControls from '../../hooks/useTableControls';
import { SortHeader, Pagination, BulkBar, SelectCheckbox } from '../../components/admin/TableControls';

export default function Customers() {
    const { t } = useTranslation();
    const [customers, setCustomers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({ name: '', address: '', phone: '' });
    const { register, handleSubmit, reset } = useForm();

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/admin/customers');
            setCustomers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCustomers(); }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)));
    }, [search, customers]);

    const tc = useTableControls(filtered, { defaultSort: { key: 'name', dir: 'asc' } });

    const onSubmit = async (data) => {
        setIsAdding(true);
        try {
            await api.post('/admin/customers', { name: data.name, address: data.address, phone: data.phone });
            reset();
            fetchCustomers();
        } catch (err) {
            alert('Failed to register customer to database.');
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (cust) => {
        setEditId(cust.id);
        setEditData({ name: cust.name, address: cust.address || '', phone: cust.phone || '' });
    };

    const saveEdit = async () => {
        try {
            await api.put(`/admin/customers/${editId}`, editData);
            setEditId(null);
            fetchCustomers();
        } catch (err) {
            alert('Failed to update customer');
        }
    };

    const deleteCustomer = async (id, name) => {
        if (!confirm(t('customers.delete_confirm', { name }))) return;
        try {
            await api.delete(`/admin/customers/${id}`);
            fetchCustomers();
        } catch (err) {
            alert(t('customers.delete_fail'));
        }
    };

    const bulkDelete = async () => {
        if (!confirm(`Delete ${tc.selected.size} customer(s)?`)) return;
        try {
            await Promise.all([...tc.selected].map(id => api.delete(`/admin/customers/${id}`)));
            tc.clearSelection();
            fetchCustomers();
        } catch (err) {
            alert(t('customers.delete_fail'));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('customers.title')}</h1>
                    <p className="text-slate-500 mt-2">{t('customers.bulk_route_processing')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <UserPlus className="w-5 h-5 text-emerald-500" />
                            {t('customers.register')}
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('customers.name')}</label>
                                <input {...register('name', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Acme Corp" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('customers.address')}</label>
                                <textarea {...register('address')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24" placeholder="123 Sector 4..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('customers.phone')}</label>
                                <input {...register('phone')} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="+91..." />
                            </div>
                            <button type="submit" disabled={isAdding} className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : t('customers.register')}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-3 border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder')} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                        <BulkBar count={tc.selected.size} onDelete={bulkDelete} onClear={tc.clearSelection} />
                        {isLoading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">{t('customers.no_customers')}</div>
                        ) : (
                            <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-4 w-10"><SelectCheckbox checked={tc.selected.size === tc.paged.length && tc.paged.length > 0} onChange={tc.toggleSelectAll} /></th>
                                        <SortHeader label={t('customers.name')} sortKey="name" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} />
                                        <SortHeader label={t('customers.phone')} sortKey="phone" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} />
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tc.paged.map(cust => (
                                        <tr key={cust.id} className={`hover:bg-slate-50 transition-colors ${tc.selected.has(cust.id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-6 py-4"><SelectCheckbox checked={tc.selected.has(cust.id)} onChange={() => tc.toggleSelect(cust.id)} /></td>
                                            <td className="px-6 py-4 flex items-start gap-4">
                                                <div className="p-2 bg-emerald-100 rounded-lg shrink-0 mt-1"><Users className="w-4 h-4 text-emerald-600" /></div>
                                                {editId === cust.id ? (
                                                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="border border-emerald-300 rounded px-2 py-1 text-sm w-40" />
                                                ) : (
                                                    <div>
                                                        <span className="font-bold text-slate-800 block text-lg">{cust.name}</span>
                                                        <span className="text-xs font-mono text-slate-400">ID: {cust.id.substring(0, 8)}...</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editId === cust.id ? (
                                                    <div className="space-y-1">
                                                        <input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} placeholder="Phone" className="border border-emerald-300 rounded px-2 py-1 text-sm w-36" />
                                                        <input value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} placeholder="Address" className="border border-emerald-300 rounded px-2 py-1 text-sm w-36" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 text-sm text-slate-600">
                                                        {cust.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {cust.phone}</div>}
                                                        {cust.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{cust.address}</span></div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editId === cust.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={saveEdit} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700">{t('common.save')}</button>
                                                        <button onClick={() => setEditId(null)} className="text-xs text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => startEdit(cust)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteCustomer(cust.id, cust.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
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
            </div>
        </div>
    );
}
