import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Settings as SettingsIcon, Shield, Plus, Trash2, Loader2, FileText, CreditCard, Layout, Bell, Save, DollarSign, Newspaper } from 'lucide-react';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const tabs = [
        { id: 'general', label: 'General', icon: SettingsIcon },
        { id: 'templates', label: 'Agency Templates', icon: Layout },
        { id: 'billing', label: 'Billing Plans', icon: CreditCard },
        { id: 'admins', label: 'Super Admins', icon: Shield },
    ];

    return (
        <div className="p-8 text-slate-300 space-y-6">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Settings
            </div>
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-slate-900/60 border border-slate-700/40 rounded-xl p-1">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === tab.id
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                            }`}>
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'templates' && <TemplateSettings />}
            {activeTab === 'billing' && <BillingPlansSettings />}
            {activeTab === 'admins' && <AdminManagement />}
        </div>
    );
}

// ─── General Settings ──────────────────
function GeneralSettings() {
    const [settings, setSettings] = useState({
        platform_name: 'NewsFlux', support_email: 'support@newsflux.app',
        max_agencies: 500, trial_days: 14, maintenance_mode: false,
        enable_notifications: true, audit_log_retention: 90,
    });

    return (
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 space-y-6">
            <h3 className="text-white font-bold flex items-center gap-2"><SettingsIcon className="w-4 h-4 text-indigo-400" /> General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Platform Name" value={settings.platform_name} onChange={v => setSettings({ ...settings, platform_name: v })} />
                <Field label="Support Email" value={settings.support_email} onChange={v => setSettings({ ...settings, support_email: v })} />
                <Field label="Max Agencies" type="number" value={settings.max_agencies} onChange={v => setSettings({ ...settings, max_agencies: parseInt(v) })} />
                <Field label="Trial Days" type="number" value={settings.trial_days} onChange={v => setSettings({ ...settings, trial_days: parseInt(v) })} />
                <Field label="Audit Log Retention (days)" type="number" value={settings.audit_log_retention} onChange={v => setSettings({ ...settings, audit_log_retention: parseInt(v) })} />
            </div>
            <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={settings.maintenance_mode} onChange={e => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 accent-indigo-500" />
                    <span className="text-slate-400">Maintenance Mode</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={settings.enable_notifications} onChange={e => setSettings({ ...settings, enable_notifications: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 accent-indigo-500" />
                    <span className="text-slate-400">Enable Notifications</span>
                </label>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors text-xs font-bold">
                <Save className="w-3.5 h-3.5" /> Save Settings
            </button>
        </div>
    );
}

// ─── Agency Templates ──────────────────
function TemplateSettings() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', region: '', newspapers: [{ name: '', base_price: '' }] });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        api.get('/superadmin/templates').then(res => setTemplates(res.data)).finally(() => setLoading(false));
    }, []);

    const addNewspaper = () => setForm({ ...form, newspapers: [...form.newspapers, { name: '', base_price: '' }] });
    const removeNewspaper = (idx) => setForm({ ...form, newspapers: form.newspapers.filter((_, i) => i !== idx) });
    const updateNewspaper = (idx, field, value) => {
        const updated = [...form.newspapers];
        updated[idx][field] = value;
        setForm({ ...form, newspapers: updated });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const payload = {
                name: form.name, region: form.region,
                newspapers: form.newspapers.filter(n => n.name).map(n => ({ name: n.name, base_price: parseFloat(n.base_price) || 0 })),
            };
            await api.post('/superadmin/templates', payload);
            setForm({ name: '', region: '', newspapers: [{ name: '', base_price: '' }] });
            setShowCreate(false);
            const res = await api.get('/superadmin/templates');
            setTemplates(res.data);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this template?')) return;
        await api.delete(`/superadmin/templates/${id}`);
        setTemplates(templates.filter(t => t.id !== id));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2"><Layout className="w-4 h-4 text-cyan-400" /> Agency Templates</h3>
                <button onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg transition-colors text-xs font-bold">
                    <Plus className="w-3 h-3" /> New Template
                </button>
            </div>

            {showCreate && (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-cyan-500/20 rounded-2xl p-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Template Name</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="South India Standard" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Region</label>
                                <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="Tamil Nadu" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2">Newspapers</label>
                            <div className="space-y-2">
                                {form.newspapers.map((np, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input value={np.name} onChange={e => updateNewspaper(idx, 'name', e.target.value)} placeholder="The Hindu"
                                            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                                        <input type="number" step="0.01" value={np.base_price} onChange={e => updateNewspaper(idx, 'base_price', e.target.value)} placeholder="₹ Price"
                                            className="w-24 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500" />
                                        {form.newspapers.length > 1 && (
                                            <button type="button" onClick={() => removeNewspaper(idx)} className="p-1 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addNewspaper} className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-bold">+ Add newspaper</button>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800">Cancel</button>
                            <button type="submit" disabled={creating} className="px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Template'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-slate-600 text-sm animate-pulse">Loading...</div>
            ) : templates.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-8 text-center">
                    <Layout className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-600 text-sm">No templates yet. Create one to pre-seed new agencies with newspapers.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(t => (
                        <div key={t.id} className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-white font-bold text-sm">{t.name}</h4>
                                    {t.region && <span className="text-[10px] text-slate-500 font-mono">{t.region}</span>}
                                </div>
                                <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="text-xs text-slate-400 space-y-1">
                                {(t.newspapers || []).map((np, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-800/40 rounded px-2 py-1">
                                        <span className="flex items-center gap-1"><Newspaper className="w-3 h-3 text-slate-600" />{np.name}</span>
                                        <span className="font-mono text-slate-500">₹{np.base_price}</span>
                                    </div>
                                ))}
                                {(!t.newspapers || t.newspapers.length === 0) && <span className="text-slate-600">No newspapers</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Billing Plans ──────────────────
function BillingPlansSettings() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', max_workers: 5, max_customers: 50, price_monthly: 0, billing_cycle: 'monthly' });
    const [creating, setCreating] = useState(false);

    const fetchPlans = () => api.get('/superadmin/billing-plans').then(res => setPlans(res.data)).finally(() => setLoading(false));
    useEffect(() => { fetchPlans(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/superadmin/billing-plans', {
                name: form.name, max_workers: parseInt(form.max_workers),
                max_customers: parseInt(form.max_customers),
                price_monthly: parseFloat(form.price_monthly),
                billing_cycle: form.billing_cycle,
            });
            setForm({ name: '', max_workers: 5, max_customers: 50, price_monthly: 0, billing_cycle: 'monthly' });
            setShowCreate(false);
            fetchPlans();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this billing plan? It will be unassigned from all agencies.')) return;
        await api.delete(`/superadmin/billing-plans/${id}`);
        fetchPlans();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-400" /> Billing Plans</h3>
                <button onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition-colors text-xs font-bold">
                    <Plus className="w-3 h-3" /> New Plan
                </button>
            </div>

            {showCreate && (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-amber-500/20 rounded-2xl p-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Plan Name</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" placeholder="Pro" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Billing Cycle</label>
                                <select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Workers</label>
                                <input type="number" required value={form.max_workers} onChange={e => setForm({ ...form, max_workers: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Max Customers</label>
                                <input type="number" required value={form.max_customers} onChange={e => setForm({ ...form, max_customers: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Price (₹/month)</label>
                                <input type="number" step="0.01" required value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800">Cancel</button>
                            <button type="submit" disabled={creating} className="px-4 py-2 text-sm bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/30 disabled:opacity-50">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Plan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-slate-600 text-sm animate-pulse">Loading...</div>
            ) : plans.length === 0 ? (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-8 text-center">
                    <CreditCard className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-600 text-sm">No billing plans. Create plans and assign them to agencies.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map(p => (
                        <div key={p.id} className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 relative group">
                            <button onClick={() => handleDelete(p.id)}
                                className="absolute top-3 right-3 p-1.5 text-slate-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">{p.billing_cycle}</div>
                            <h4 className="text-white font-bold text-lg">{p.name}</h4>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-black text-amber-400">₹{p.price_monthly}</span>
                                <span className="text-xs text-slate-500">/month</span>
                            </div>
                            <div className="mt-4 space-y-2 text-xs text-slate-400">
                                <div className="flex justify-between"><span>Max Workers</span><span className="text-white font-bold">{p.max_workers}</span></div>
                                <div className="flex justify-between"><span>Max Customers</span><span className="text-white font-bold">{p.max_customers}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Admin Management ──────────────────
function AdminManagement() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ username: '', password: '' });
    const [creating, setCreating] = useState(false);

    const fetchAdmins = () => api.get('/superadmin/super-admins').then(res => setAdmins(res.data)).finally(() => setLoading(false));
    useEffect(() => { fetchAdmins(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/superadmin/super-admins', form);
            setForm({ username: '', password: '' });
            setShowCreate(false);
            fetchAdmins();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this super admin?')) return;
        try {
            await api.delete(`/superadmin/super-admins/${id}`);
            fetchAdmins();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-white font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" /> Super Admin Accounts</h3>
                <button onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors text-xs font-bold">
                    <Plus className="w-3 h-3" /> New Admin
                </button>
            </div>

            {showCreate && (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-red-500/20 rounded-2xl p-6">
                    <form onSubmit={handleCreate} className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Username</label>
                            <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                            <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <button type="submit" disabled={creating} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/30 disabled:opacity-50">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-slate-600 text-sm animate-pulse">Loading...</div>
            ) : (
                <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[11px] tracking-widest text-slate-500 uppercase font-bold bg-slate-900/50">
                                <th className="px-5 py-3">Username</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {admins.map(a => (
                                <tr key={a.id} className="hover:bg-slate-800/20">
                                    <td className="px-5 py-3 text-white font-medium">{a.username}</td>
                                    <td className="px-5 py-3"><span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{a.role}</span></td>
                                    <td className="px-5 py-3 text-right">
                                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Helpers ──────────────────
function Field({ label, value, onChange, type = 'text' }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
    );
}
