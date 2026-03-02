import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserSquare2, Loader2, Pencil, Trash2, X, Search } from 'lucide-react';

export default function Workers() {
    const { t } = useTranslation();
    const [workers, setWorkers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [search, setSearch] = useState('');
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({ username: '', password: '' });
    const { register, handleSubmit, reset } = useForm();

    const fetchWorkers = async () => {
        try {
            const res = await api.get('/admin/workers');
            setWorkers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchWorkers(); }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(workers.filter(w => w.username.toLowerCase().includes(q)));
    }, [search, workers]);

    const onSubmit = async (data) => {
        setIsAdding(true);
        try {
            await api.post('/admin/workers', { username: data.username, password: data.password });
            reset();
            fetchWorkers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to provision worker account');
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (worker) => {
        setEditId(worker.id);
        setEditData({ username: worker.username, password: '' });
    };

    const saveEdit = async () => {
        try {
            const payload = { username: editData.username };
            if (editData.password) payload.password = editData.password;
            await api.put(`/admin/workers/${editId}`, payload);
            setEditId(null);
            fetchWorkers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update worker');
        }
    };

    const deleteWorker = async (id, name) => {
        if (!confirm(t('workers.delete_confirm', { name }))) return;
        try {
            await api.delete(`/admin/workers/${id}`);
            fetchWorkers();
        } catch (err) {
            alert(t('workers.delete_fail'));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('workers.title')}</h1>
                    <p className="text-slate-500 mt-2">{t('workers.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <UserPlus className="w-5 h-5 text-indigo-500" />
                            {t('workers.new_worker')}
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('workers.username')}</label>
                                <input {...register('username', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. jdoe_route1" autoComplete="off" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{t('workers.password')}</label>
                                <input type="password" {...register('password', { required: true })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" autoComplete="new-password" />
                            </div>
                            <button type="submit" disabled={isAdding} className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : t('workers.provision_account')}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-3 border-b border-slate-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder')} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>
                        {isLoading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">{t('workers.no_workers')}</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-4 font-semibold text-slate-600">{t('workers.username')}</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">{t('sidebar.agency_menu')}</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(worker => (
                                        <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 rounded-lg"><UserSquare2 className="w-4 h-4 text-indigo-600" /></div>
                                                {editId === worker.id ? (
                                                    <div className="space-y-1">
                                                        <input value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value })} className="border border-indigo-300 rounded px-2 py-1 text-sm w-40" />
                                                        <input type="password" placeholder={t('workers.password')} value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} className="border border-indigo-300 rounded px-2 py-1 text-sm w-40" />
                                                    </div>
                                                ) : (
                                                    <span className="font-medium text-slate-800">{worker.username}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium capitalize">{worker.role}</td>
                                            <td className="px-6 py-4 text-right">
                                                {editId === worker.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={saveEdit} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">{t('common.save')}</button>
                                                        <button onClick={() => setEditId(null)} className="text-xs text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => startEdit(worker)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteWorker(worker.id, worker.username)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
