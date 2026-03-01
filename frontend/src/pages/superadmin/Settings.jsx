import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, Bell, Shield, Save, UserPlus, Users, Loader2, Trash2 } from 'lucide-react';
import api from '../../utils/api';

export default function Settings() {
    const [settings, setSettings] = useState({
        platformName: 'NewsFlux',
        supportEmail: 'support@newsflux.io',
        maxAgencies: 100,
        trialDays: 14,
        maintenanceMode: false,
        emailNotifications: true,
        auditLogRetentionDays: 90,
    });
    const [saved, setSaved] = useState(false);

    // Super admin management
    const [superAdmins, setSuperAdmins] = useState([]);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [adminSuccess, setAdminSuccess] = useState('');

    useEffect(() => {
        fetchSuperAdmins();
    }, []);

    const fetchSuperAdmins = async () => {
        try {
            const res = await api.get('/superadmin/super-admins');
            setSuperAdmins(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateSuperAdmin = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        setAdminError('');
        setAdminSuccess('');
        try {
            await api.post('/superadmin/super-admins', newAdmin);
            setNewAdmin({ username: '', password: '' });
            setAdminSuccess('Super admin created successfully.');
            setTimeout(() => setAdminSuccess(''), 3000);
            fetchSuperAdmins();
        } catch (err) {
            setAdminError(err.response?.data?.detail || 'Failed to create super admin.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteSuperAdmin = async (id, username) => {
        if (!window.confirm(`Delete super admin "${username}"? This cannot be undone.`)) return;
        setAdminError('');
        try {
            await api.delete(`/superadmin/super-admins/${id}`);
            fetchSuperAdmins();
        } catch (err) {
            setAdminError(err.response?.data?.detail || 'Failed to delete super admin.');
        }
    };

    const handleChange = (key, value) => {
        setSettings(s => ({ ...s, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        // In production this would call a backend endpoint
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-8 text-slate-300 space-y-8 max-w-3xl">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Settings
            </div>
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
            </div>

            {/* General */}
            <Section icon={Globe} title="General">
                <Field label="Platform Name">
                    <input
                        type="text"
                        value={settings.platformName}
                        onChange={e => handleChange('platformName', e.target.value)}
                        className="input-field"
                    />
                </Field>
                <Field label="Support Email">
                    <input
                        type="email"
                        value={settings.supportEmail}
                        onChange={e => handleChange('supportEmail', e.target.value)}
                        className="input-field"
                    />
                </Field>
                <Field label="Max Agencies">
                    <input
                        type="number"
                        value={settings.maxAgencies}
                        onChange={e => handleChange('maxAgencies', Number(e.target.value))}
                        className="input-field w-32"
                    />
                </Field>
                <Field label="Free Trial Days">
                    <input
                        type="number"
                        value={settings.trialDays}
                        onChange={e => handleChange('trialDays', Number(e.target.value))}
                        className="input-field w-32"
                    />
                </Field>
            </Section>

            {/* Notifications */}
            <Section icon={Bell} title="Notifications">
                <Field label="Email Notifications">
                    <Toggle
                        checked={settings.emailNotifications}
                        onChange={v => handleChange('emailNotifications', v)}
                    />
                </Field>
            </Section>

            {/* Security */}
            <Section icon={Shield} title="Security & Maintenance">
                <Field label="Maintenance Mode">
                    <Toggle
                        checked={settings.maintenanceMode}
                        onChange={v => handleChange('maintenanceMode', v)}
                    />
                    <span className="text-xs text-slate-500 ml-3">Blocks all non-super-admin access</span>
                </Field>
                <Field label="Audit Log Retention (days)">
                    <input
                        type="number"
                        value={settings.auditLogRetentionDays}
                        onChange={e => handleChange('auditLogRetentionDays', Number(e.target.value))}
                        className="input-field w-32"
                    />
                </Field>
            </Section>

            {/* Super Admin Management */}
            <Section icon={Users} title="Super Admin Management">
                <div className="space-y-4">
                    {/* Existing super admins list */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Super Admins</p>
                        <div className="space-y-2">
                            {superAdmins.length === 0 ? (
                                <p className="text-xs text-slate-600">No super admins loaded.</p>
                            ) : superAdmins.map(sa => (
                                <div key={sa.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                            <span className="text-indigo-400 text-xs font-bold uppercase">{sa.username.charAt(0)}</span>
                                        </div>
                                        <span className="text-sm text-white font-medium">{sa.username}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold bg-indigo-500/10 px-2 py-1 rounded">super_admin</span>
                                        <button
                                            onClick={() => handleDeleteSuperAdmin(sa.id, sa.username)}
                                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Create new super admin */}
                    <div className="border-t border-slate-700/40 pt-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Create New Super Admin</p>
                        {adminError && (
                            <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-xs font-semibold">{adminError}</p>
                            </div>
                        )}
                        {adminSuccess && (
                            <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <p className="text-emerald-400 text-xs font-semibold">{adminSuccess}</p>
                            </div>
                        )}
                        <form onSubmit={handleCreateSuperAdmin} className="flex items-end gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Username</label>
                                <input
                                    required
                                    value={newAdmin.username}
                                    onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                    placeholder="new_super_admin"
                                    className="input-field w-full"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Password</label>
                                <input
                                    required
                                    type="password"
                                    value={newAdmin.password}
                                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="input-field w-full"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="flex items-center gap-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 font-bold py-2 px-4 rounded-lg transition-colors text-xs disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                Create
                            </button>
                        </form>
                    </div>
                </div>
            </Section>

            {/* Save */}
            <div className="pt-2">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg transition-colors"
                >
                    <Save className="w-4 h-4" />
                    Save Settings
                </button>
                {saved && (
                    <span className="text-emerald-400 text-xs font-bold ml-4 animate-pulse">Settings saved.</span>
                )}
            </div>

            <style>{`
                .input-field {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(51, 65, 85, 0.5);
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    color: #e2e8f0;
                    font-size: 0.875rem;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .input-field:focus {
                    border-color: rgba(99, 102, 241, 0.5);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
                }
            `}</style>
        </div>
    );
}

function Section({ icon: Icon, title, children }) {
    return (
        <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-indigo-400" />
                <h3 className="text-white font-bold">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-400 shrink-0">{label}</label>
            <div className="flex items-center">{children}</div>
        </div>
    );
}

function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </button>
    );
}
