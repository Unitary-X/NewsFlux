import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { CheckCircle, XCircle, Plus, Loader2, Building2, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Agencies() {
    const { t } = useTranslation();
    const [agencies, setAgencies] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState({ agency_name: '', admin_username: '', admin_password: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const fetchAgencies = async () => {
        try {
            const res = await api.get('/superadmin/agencies');
            setAgencies(res.data);
            setFiltered(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAgencies(); }, []);

    useEffect(() => {
        if (!search.trim()) {
            setFiltered(agencies);
        } else {
            const q = search.toLowerCase();
            setFiltered(agencies.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)));
        }
    }, [search, agencies]);

    const handleCreateAgency = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        setCreateError('');
        try {
            await api.post('/auth/register', createForm);
            setIsCreateModalOpen(false);
            setCreateForm({ agency_name: '', admin_username: '', admin_password: '' });
            fetchAgencies();
        } catch (err) {
            setCreateError(err.response?.data?.detail || t('agencies.provision_fail'));
        } finally {
            setIsCreating(false);
        }
    };

    const toggleStatus = async (agencyId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await api.put(`/superadmin/agencies/${agencyId}/status`, { status: newStatus });
            setAgencies(agencies.map(a => a.id === agencyId ? { ...a, status: newStatus } : a));
        } catch (err) {
            alert(t('agencies.status_fail'));
        }
    };

    const deleteAgency = async (agencyId, agencyName) => {
        if (!window.confirm(t('agencies.delete_confirm', { name: agencyName }))) return;
        try {
            await api.delete(`/superadmin/agencies/${agencyId}`);
            setAgencies(agencies.filter(a => a.id !== agencyId));
        } catch (err) {
            alert(err.response?.data?.detail || t('agencies.delete_fail'));
        }
    };

    const activeCount = agencies.filter(a => a.status === 'active').length;

    return (
        <div className="p-8 text-slate-300 space-y-6">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                {t('agencies.breadcrumb')}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <MiniStat label={t('agencies.total')} value={agencies.length} color="indigo" />
                <MiniStat label={t('agencies.active')} value={activeCount} color="emerald" />
                <MiniStat label={t('agencies.suspended')} value={agencies.length - activeCount} color="red" />
            </div>

            {/* Agency Table */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-700/40 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-bold text-white">{t('agencies.registered_tenants')}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('agencies.search_placeholder')}
                                className="bg-slate-800/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 w-56"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors text-xs font-bold tracking-wider uppercase"
                        >
                            <Plus className="w-4 h-4" /> {t('agencies.new_agency')}
                        </button>
                    </div>
                </div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50 text-[11px] tracking-widest text-slate-500 uppercase font-bold">
                            <th className="px-5 py-3">{t('agencies.agency_id')}</th>
                            <th className="px-5 py-3">{t('agencies.name')}</th>
                            <th className="px-5 py-3">{t('agencies.status')}</th>
                            <th className="px-5 py-3 text-right">{t('agencies.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {isLoading ? (
                            <tr><td colSpan="4" className="px-5 py-10 text-center text-slate-600 font-mono text-sm">{t('agencies.loading')}</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="4" className="px-5 py-10 text-center text-slate-600 font-mono text-sm">{t('agencies.no_agencies')}</td></tr>
                        ) : (
                            filtered.map(agency => (
                                <tr key={agency.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-5 py-4 font-mono text-xs text-indigo-300/80">{agency.id}</td>
                                    <td className="px-5 py-4 font-semibold text-white">{agency.name}</td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${agency.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {agency.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {agency.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => toggleStatus(agency.id, agency.status)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors ${agency.status === 'active'
                                                ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                                                : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                                                }`}
                                        >
                                            {agency.status === 'active' ? t('agencies.suspend') : t('agencies.reactivate')}
                                        </button>
                                        <button
                                            onClick={() => deleteAgency(agency.id, agency.name)}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-7 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-1">{t('agencies.modal_title')}</h2>
                        <p className="text-slate-500 text-xs mb-6">{t('agencies.modal_subtitle')}</p>

                        {createError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-xs font-semibold text-center">{createError}</p>
                            </div>
                        )}

                        <form onSubmit={handleCreateAgency} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('agencies.agency_name')}</label>
                                <input required value={createForm.agency_name} onChange={e => setCreateForm({ ...createForm, agency_name: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm" placeholder="Global Distributors" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('agencies.admin_username')}</label>
                                <input required value={createForm.admin_username} onChange={e => setCreateForm({ ...createForm, admin_username: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm" placeholder="admin_01" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">{t('agencies.admin_password')}</label>
                                <input required type="password" value={createForm.admin_password} onChange={e => setCreateForm({ ...createForm, admin_password: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm" placeholder="••••••••" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-800/50 transition-colors text-sm font-medium">{t('agencies.cancel')}</button>
                                <button type="submit" disabled={isCreating}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors text-sm font-medium flex justify-center items-center disabled:opacity-50">
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('agencies.create_agency')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniStat({ label, value, color }) {
    const colors = {
        indigo: 'border-indigo-500/20 text-indigo-400',
        emerald: 'border-emerald-500/20 text-emerald-400',
        red: 'border-red-500/20 text-red-400',
    };
    return (
        <div className={`backdrop-blur-xl bg-slate-900/60 border ${colors[color]} rounded-xl p-4 text-center`}>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-70 mt-1">{label}</div>
        </div>
    );
}
