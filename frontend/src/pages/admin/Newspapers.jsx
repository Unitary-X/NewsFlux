import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Plus, Newspaper as NewsIcon, Loader2, Pencil, Trash2, X, Search } from 'lucide-react';
import useTableControls from '../../hooks/useTableControls';
import { SortHeader, Pagination, BulkBar, SelectCheckbox } from '../../components/admin/TableControls';

export default function Newspapers() {
    const { t } = useTranslation();
    const [newspapers, setNewspapers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({ name: '', base_price: '' });
    const { register, handleSubmit, reset } = useForm();

    const fetchNewspapers = async () => {
        try {
            const res = await api.get('/admin/newspapers');
            setNewspapers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchNewspapers(); }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(newspapers.filter(p => p.name.toLowerCase().includes(q)));
    }, [search, newspapers]);

    const tc = useTableControls(filtered, { defaultSort: { key: 'name', dir: 'asc' } });

    const onSubmit = async (data) => {
        setIsAdding(true);
        try {
            await api.post('/admin/newspapers', { 
                name: data.name, 
                base_price: parseFloat(data.base_price)
            });
            reset();
            fetchNewspapers();
        } catch (err) {
            alert('Failed to add newspaper');
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (paper) => {
        setEditId(paper.id);
        setEditData({ name: paper.name, base_price: paper.base_price });
    };

    const saveEdit = async () => {
        try {
            await api.put(`/admin/newspapers/${editId}`, {
                name: editData.name,
                base_price: parseFloat(editData.base_price)
            });
            setEditId(null);
            fetchNewspapers();
        } catch (err) {
            alert('Failed to update newspaper');
        }
    };

    const deletePaper = async (id, name) => {
        if (!confirm(t('newspapers.delete_confirm', { name }))) return;
        try {
            await api.delete(`/admin/newspapers/${id}`);
            fetchNewspapers();
        } catch (err) {
            alert(t('newspapers.delete_fail'));
        }
    };

    const bulkDelete = async () => {
        if (!confirm(`Delete ${tc.selected.size} newspaper(s)?`)) return;
        try {
            await Promise.all([...tc.selected].map(id => api.delete(`/admin/newspapers/${id}`)));
            tc.clearSelection();
            fetchNewspapers();
        } catch (err) {
            alert(t('newspapers.delete_fail'));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('newspapers.title')}</h1>
                    <p className="text-slate-500 mt-2">{t('newspapers.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <Plus className="w-5 h-5 text-blue-500" />
                            {t('newspapers.add')}
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('newspapers.name')}</label>
                                <input {...register('name', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Daily Bugle" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('newspapers.base_price')}</label>
                                <input type="number" step="0.01" {...register('base_price', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                            </div>
                            <button type="submit" disabled={isAdding} className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : t('newspapers.add')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-3 border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder')} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <BulkBar count={tc.selected.size} onDelete={bulkDelete} onClear={tc.clearSelection} />
                        {isLoading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">{t('newspapers.no_newspapers')}</div>
                        ) : (
                            <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-4 w-10"><SelectCheckbox checked={tc.selected.size === tc.paged.length && tc.paged.length > 0} onChange={tc.toggleSelectAll} /></th>
                                        <SortHeader label={t('newspapers.name')} sortKey="name" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} />
                                        <SortHeader label={t('newspapers.base_price')} sortKey="base_price" currentKey={tc.sortKey} currentDir={tc.sortDir} onSort={tc.toggleSort} />
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tc.paged.map(paper => (
                                        <tr key={paper.id} className={`hover:bg-slate-50 transition-colors ${tc.selected.has(paper.id) ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-6 py-4"><SelectCheckbox checked={tc.selected.has(paper.id)} onChange={() => tc.toggleSelect(paper.id)} /></td>
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg"><NewsIcon className="w-4 h-4 text-blue-600" /></div>
                                                {editId === paper.id ? (
                                                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="border border-blue-300 rounded px-2 py-1 text-sm w-40" />
                                                ) : (
                                                    <span className="font-medium text-slate-800">{paper.name}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {editId === paper.id ? (
                                                    <input type="number" step="0.01" value={editData.base_price} onChange={e => setEditData({ ...editData, base_price: e.target.value })} className="border border-blue-300 rounded px-2 py-1 text-sm w-24" />
                                                ) : (
                                                    `₹${Number(paper.base_price).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editId === paper.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={saveEdit} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">{t('common.save')}</button>
                                                        <button onClick={() => setEditId(null)} className="text-xs text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => startEdit(paper)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => deletePaper(paper.id, paper.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
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