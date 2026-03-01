import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { HardDrive, CloudOff, Cloud, RefreshCw, Loader2, FileSpreadsheet, Calendar, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Backup() {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(null);
    const [files, setFiles] = useState({ daily: [], monthly: [], yearly: [] });
    const [filesLoading, setFilesLoading] = useState(false);
    const [results, setResults] = useState(null);

    // Check for OAuth callback redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('connected') === 'true') {
            window.history.replaceState({}, '', '/admin/backup');
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/admin/backup/google/status');
            setStatus(res.data);
        } catch {
            setStatus({ connected: false, enabled: false });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFiles = useCallback(async () => {
        if (!status?.connected) return;
        setFilesLoading(true);
        try {
            const [daily, monthly, yearly] = await Promise.all([
                api.get('/admin/backup/files/daily'),
                api.get('/admin/backup/files/monthly'),
                api.get('/admin/backup/files/yearly'),
            ]);
            setFiles({ daily: daily.data, monthly: monthly.data, yearly: yearly.data });
        } catch {
            // Silently fail — files may not exist yet
        } finally {
            setFilesLoading(false);
        }
    }, [status?.connected]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);
    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    const connectDrive = async () => {
        try {
            const res = await api.get('/admin/backup/google/connect');
            window.location.href = res.data.auth_url;
        } catch {
            alert('Failed to start Google Drive connection.');
        }
    };

    const disconnectDrive = async () => {
        if (!window.confirm(t('backup.disconnect_confirm'))) return;
        try {
            await api.delete('/admin/backup/google/disconnect');
            setStatus({ ...status, connected: false, connected_at: null });
            setFiles({ daily: [], monthly: [], yearly: [] });
        } catch {
            alert('Failed to disconnect.');
        }
    };

    const triggerBackup = async (type) => {
        setTriggerLoading(type);
        setResults(null);
        try {
            const endpoint = type === 'daily' ? '/admin/backup/trigger'
                : type === 'monthly' ? '/admin/backup/trigger-monthly'
                : '/admin/backup/trigger-yearly';
            const res = await api.post(endpoint);
            setResults(res.data);
            fetchFiles();
        } catch (err) {
            setResults({ error: err.response?.data?.detail || 'Backup failed' });
        } finally {
            setTriggerLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                    <HardDrive className="w-7 h-7 text-blue-400" />
                    {t('backup.title')}
                </h1>
                <p className="text-slate-400 mt-1">{t('backup.subtitle')}</p>
            </div>

            {/* Connection Status Card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">{t('backup.connection')}</h2>

                {!status?.enabled ? (
                    <div className="flex items-center gap-3 text-amber-400 bg-amber-500/10 p-4 rounded-lg">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{t('backup.not_configured')}</p>
                    </div>
                ) : status?.connected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 p-4 rounded-lg">
                            <Cloud className="w-5 h-5" />
                            <div>
                                <p className="font-medium">{t('backup.connected')}</p>
                                {status.connected_at && (
                                    <p className="text-xs text-emerald-300/70 mt-0.5">
                                        {t('backup.connected_since')} {new Date(status.connected_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={disconnectDrive}
                            className="text-sm text-red-400 hover:text-red-300 hover:underline transition-colors"
                        >
                            {t('backup.disconnect')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-400 bg-slate-700/50 p-4 rounded-lg">
                            <CloudOff className="w-5 h-5" />
                            <p>{t('backup.not_connected')}</p>
                        </div>
                        <button
                            onClick={connectDrive}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                            <Cloud className="w-4 h-4" />
                            {t('backup.connect_btn')}
                        </button>
                    </div>
                )}
            </div>

            {/* Backup Actions */}
            {status?.connected && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { type: 'daily', icon: FileSpreadsheet, color: 'blue', label: t('backup.daily'), desc: t('backup.daily_desc') },
                        { type: 'monthly', icon: Calendar, color: 'purple', label: t('backup.monthly'), desc: t('backup.monthly_desc') },
                        { type: 'yearly', icon: TrendingUp, color: 'amber', label: t('backup.yearly'), desc: t('backup.yearly_desc') },
                    ].map(({ type, icon: Icon, color, label, desc }) => (
                        <div key={type} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 text-${color}-400`} />
                                <h3 className="font-semibold text-slate-200">{label}</h3>
                            </div>
                            <p className="text-sm text-slate-400">{desc}</p>
                            <button
                                onClick={() => triggerBackup(type)}
                                disabled={triggerLoading !== null}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                                    ${triggerLoading === type
                                        ? 'bg-slate-700 text-slate-400 cursor-wait'
                                        : `bg-${color}-600/20 text-${color}-400 hover:bg-${color}-600/30 border border-${color}-500/30`
                                    }`}
                            >
                                {triggerLoading === type ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('backup.running')}</>
                                ) : (
                                    <><RefreshCw className="w-4 h-4" /> {t('backup.run_now')}</>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-200 mb-3">{t('backup.results')}</h3>
                    {results.error ? (
                        <p className="text-red-400 text-sm">{results.error}</p>
                    ) : (
                        <div className="space-y-2">
                            {results.results?.map((r, i) => (
                                <div key={i} className={`flex items-center justify-between text-sm p-2 rounded ${r.status === 'uploaded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    <span>{r.file}</span>
                                    <span className="font-medium">{r.status === 'uploaded' ? '✓ Uploaded' : `✗ ${r.error}`}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Backup History */}
            {status?.connected && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-200">{t('backup.history')}</h2>
                        <button onClick={fetchFiles} disabled={filesLoading} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            <RefreshCw className={`w-3.5 h-3.5 ${filesLoading ? 'animate-spin' : ''}`} />
                            {t('backup.refresh')}
                        </button>
                    </div>

                    {['daily', 'monthly', 'yearly'].map((cat) => (
                        <div key={cat} className="mb-4 last:mb-0">
                            <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">
                                {cat === 'daily' ? t('backup.daily') : cat === 'monthly' ? t('backup.monthly') : t('backup.yearly')}
                            </h4>
                            {files[cat]?.length > 0 ? (
                                <div className="space-y-1">
                                    {files[cat].map((f) => (
                                        <div key={f.id} className="flex items-center justify-between text-sm py-1.5 px-3 bg-slate-700/30 rounded">
                                            <span className="text-slate-300">{f.name}</span>
                                            <a
                                                href={f.webViewLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> {t('backup.open')}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">{t('backup.no_files')}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
