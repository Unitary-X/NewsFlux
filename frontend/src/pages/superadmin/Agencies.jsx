import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Plus, Search, Trash2, Shield, ShieldOff, Loader2, Eye, CreditCard } from 'lucide-react';

export default function Agencies() {
    const { impersonate } = useAuth();
    const [agencies, setAgencies] = useState([]);
    const [billingPlans, setBillingPlans] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        agency_name: '', admin_username: '', admin_password: '', template_id: '',
    });

    const fetchData = async () => {
        try {
            const [aRes, pRes, tRes] = await Promise.all([
                api.get('/superadmin/agencies'),
                api.get('/superadmin/billing-plans').catch(() => ({ data: [] })),
                api.get('/superadmin/templates').catch(() => ({ data: [] })),
            ]);
            setAgencies(aRes.data);
            setBillingPlans(pRes.data);
            setTemplates(tRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            await api.post('/auth/register', {
                agency_name: form.agency_name,
                admin_username: form.admin_username,
                admin_password: form.admin_password,
                template_id: form.template_id || undefined,
            });
            setForm({ agency_name: '', admin_username: '', admin_password: '', template_id: '' });
            setShowCreate(false);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create agency');
        } finally {
            setCreating(false);
        }
    };

    const toggleStatus = async (agencyId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            await api.put(`/superadmin/agencies/${agencyId}/status`, { status: newStatus });
            setAgencies(agencies.map(a => a.id === agencyId ? { ...a, status: newStatus } : a));
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const deleteAgency = async (agencyId) => {
        if (!window.confirm('⚠️ Permanently delete this agency and ALL its data? This cannot be undone.')) return;
        try {
            await api.delete(`/superadmin/agencies/${agencyId}`);
            setAgencies(agencies.filter(a => a.id !== agencyId));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const handleImpersonate = async (agencyId) => {
        try {
            const res = await api.post(`/superadmin/impersonate/${agencyId}`);
            impersonate(res.data.access_token, res.data.agency_name);
        } catch (err) {
            alert(err.response?.data?.detail || 'Impersonation failed');
        }
    };

    const handleAssignPlan = async (agencyId, planId) => {
        try {
            await api.put(`/superadmin/agencies/${agencyId}/plan`, {
                billing_plan_id: planId || null,
            });
            fetchData();
        } catch (err) {
            alert('Failed to assign plan');
        }
    };

    const filtered = agencies.filter(a => {
        const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-indigo-400 font-mono text-sm animate-pulse">Loading agencies...</div>
            </div>
        );
    }

    return (
        <div className="p-8 text-slate-300 space-y-6">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Agencies
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-2xl font-bold text-white">Agencies</h1>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full font-mono">{agencies.length}</span>
                </div>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors text-xs font-bold tracking-wider uppercase">
                    <Plus className="w-4 h-4" /> New Agency
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agencies..."
                        className="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-900/60 border border-slate-700/40 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            {/* Table */}
            <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/60 text-[11px] tracking-widest text-slate-500 uppercase font-bold">
                            <th className="px-5 py-3">Agency</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Plan</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {filtered.length === 0 ? (
                            <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-600 text-sm">No agencies found.</td></tr>
                        ) : (
                            filtered.map(agency => (
                                <tr key={agency.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="font-semibold text-white">{agency.name}</div>
                                        <div className="text-[10px] text-slate-600 font-mono">{agency.id}</div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${agency.status === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${agency.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                            {agency.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <select
                                            value={agency.billing_plan_id || ''}
                                            onChange={e => handleAssignPlan(agency.id, e.target.value)}
                                            className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-[140px]"
                                        >
                                            <option value="">No plan</option>
                                            {billingPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {agency.status === 'active' && (
                                                <button
                                                    onClick={() => handleImpersonate(agency.id)}
                                                    title="Impersonate (Log in as Admin)"
                                                    className="p-2 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleStatus(agency.id, agency.status)}
                                                title={agency.status === 'active' ? 'Suspend' : 'Reactivate'}
                                                className="p-2 text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                            >
                                                {agency.status === 'active' ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => deleteAgency(agency.id)}
                                                title="Delete"
                                                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-7 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-1">🏢 Provision New Agency</h2>
                        <p className="text-slate-500 text-xs mb-6">Creates a new tenant with an admin account</p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-xs font-semibold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Agency Name</label>
                                <input required value={form.agency_name} onChange={e => setForm({ ...form, agency_name: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                                    placeholder="Daily Times Publications" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Admin Username</label>
                                    <input required value={form.admin_username} onChange={e => setForm({ ...form, admin_username: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                                        placeholder="admin_user" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Admin Password</label>
                                    <input required type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                                        placeholder="••••••••" />
                                </div>
                            </div>
                            {templates.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Pre-seed Template (Optional)</label>
                                    <select value={form.template_id} onChange={e => setForm({ ...form, template_id: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm">
                                        <option value="">None — Start from scratch</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} {t.region ? `(${t.region})` : ''} — {t.newspapers?.length || 0} papers</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-800/50 transition-colors text-sm font-medium">Cancel</button>
                                <button type="submit" disabled={creating}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors text-sm font-medium flex justify-center items-center disabled:opacity-50">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : '🏢 Create Agency'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
