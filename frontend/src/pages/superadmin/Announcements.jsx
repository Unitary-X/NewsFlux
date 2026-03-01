import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Megaphone, Plus, Trash2, Loader2, Users, Building2, Globe, Search } from 'lucide-react';

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        title: '', message: '', target_audience: 'all', target_agency_id: '',
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const fetchAnnouncements = async () => {
        try {
            const [annRes, agRes] = await Promise.all([
                api.get('/superadmin/announcements'),
                api.get('/superadmin/agencies'),
            ]);
            setAnnouncements(annRes.data);
            setAgencies(agRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAnnouncements(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            const payload = {
                title: form.title,
                message: form.message,
                target_audience: form.target_audience,
            };
            if (form.target_audience === 'specific_agency' && form.target_agency_id) {
                payload.target_agency_id = form.target_agency_id;
            }
            await api.post('/superadmin/announcements', payload);
            setForm({ title: '', message: '', target_audience: 'all', target_agency_id: '' });
            setShowCreate(false);
            fetchAnnouncements();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create announcement');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await api.delete(`/superadmin/announcements/${id}`);
            setAnnouncements(announcements.filter(a => a.id !== id));
        } catch (err) {
            alert('Failed to delete announcement');
        }
    };

    const audienceLabel = (audience) => {
        const map = { all: 'Everyone', admins: 'Admins Only', workers: 'Workers Only', specific_agency: 'Specific Agency' };
        return map[audience] || audience;
    };

    const audienceColor = (audience) => {
        const map = {
            all: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
            admins: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            workers: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            specific_agency: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
        return map[audience] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-indigo-400 font-mono text-sm animate-pulse">Loading announcements...</div>
            </div>
        );
    }

    return (
        <div className="p-8 text-slate-300 space-y-6">
            <div className="text-xs font-mono text-slate-600 tracking-widest uppercase">
                Home &bull; Announcements
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-2xl font-bold text-white">Announcements</h1>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors text-xs font-bold tracking-wider uppercase"
                >
                    <Plus className="w-4 h-4" /> New Broadcast
                </button>
            </div>

            {/* Announcements List */}
            <div className="space-y-3">
                {announcements.length === 0 ? (
                    <div className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-12 text-center">
                        <Megaphone className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-600 text-sm font-mono">No announcements yet. Create one to broadcast to your platform.</p>
                    </div>
                ) : (
                    announcements.map(ann => (
                        <div key={ann.id} className="backdrop-blur-xl bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-white font-bold text-sm">{ann.title}</h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${audienceColor(ann.target_audience)}`}>
                                        {audienceLabel(ann.target_audience)}
                                    </span>
                                    {ann.is_active && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">{ann.message}</p>
                                <p className="text-[10px] text-slate-600 font-mono mt-2">
                                    Created: {ann.created_at ? new Date(ann.created_at).toLocaleString() : '—'}
                                    {ann.expires_at && ` · Expires: ${new Date(ann.expires_at).toLocaleString()}`}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(ann.id)}
                                className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-7 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-1">📢 New Broadcast</h2>
                        <p className="text-slate-500 text-xs mb-6">Send a message to your platform users</p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-xs font-semibold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Title</label>
                                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm"
                                    placeholder="Scheduled Maintenance" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Message</label>
                                <textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={3}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                                    placeholder="Scheduled maintenance on Sunday 2 AM for 15 minutes..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Target Audience</label>
                                <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm">
                                    <option value="all">Everyone</option>
                                    <option value="admins">Admins Only</option>
                                    <option value="workers">Workers Only</option>
                                    <option value="specific_agency">Specific Agency</option>
                                </select>
                            </div>
                            {form.target_audience === 'specific_agency' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Agency</label>
                                    <select value={form.target_agency_id} onChange={e => setForm({ ...form, target_agency_id: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm">
                                        <option value="">Select...</option>
                                        {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-800/50 transition-colors text-sm font-medium">Cancel</button>
                                <button type="submit" disabled={creating}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors text-sm font-medium flex justify-center items-center disabled:opacity-50">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : '📢 Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
