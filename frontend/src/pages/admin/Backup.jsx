import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { HardDrive, CloudOff, Cloud, RefreshCw, Loader2, FileSpreadsheet, ExternalLink, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Backup() {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [triggerLoading, setTriggerLoading] = useState(false);
    const [backups, setBackups] = useState([]);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [notification, setNotification] = useState(null); // { type: 'success'|'error', msg: string }

    // ─── Handle OAuth redirect parameters ───────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('connected') === 'true') {
            // Remove query string from URL bar without a page reload
            window.history.replaceState({}, '', '/admin/backup');
            // Re-fetch drive status so UI reflects the new connection
            fetchStatus();
            setNotification({ type: 'success', msg: 'Google Drive connected successfully!' });
        } else if (params.get('error')) {
            const errCode = params.get('error');
            const errDetail = params.get('error_detail');
            window.history.replaceState({}, '', '/admin/backup');
            const msgs = {
                oauth_failed: 'Google Drive connection failed. Please try again.',
                missing_code_verifier: 'Google OAuth failed: missing PKCE code verifier. Please retry connection.',
            };
            const baseMsg = msgs[errCode] || 'Google Drive connection failed. Please try again.';
            const fullMsg = errDetail ? `${baseMsg} Details: ${decodeURIComponent(errDetail)}` : baseMsg;
            setNotification({ type: 'error', msg: fullMsg });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/backup/status');
            setStatus(res.data);
        } catch {
            setStatus({ connected: false, enabled: false });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBackups = useCallback(async () => {
        if (!status?.connected) return;
        setBackupsLoading(true);
        try {
            const res = await api.get('/backup/list');
            setBackups(res.data);
        } catch {
            // Silently fail
        } finally {
            setBackupsLoading(false);
        }
    }, [status?.connected]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);
    useEffect(() => { fetchBackups(); }, [fetchBackups]);

    const connectDrive = async () => {
        try {
            const res = await api.get('/backup/google/auth-url');
            window.location.href = res.data.auth_url;
        } catch {
            alert('Failed to start Google Drive connection.');
        }
    };

    const disconnectDrive = async () => {
        if (!window.confirm(t('backup.disconnect_confirm'))) return;
        try {
            await api.post('/backup/disconnect-google');
            setStatus({ ...status, connected: false, connected_at: null });
            setBackups([]);
        } catch {
            alert('Failed to disconnect.');
        }
    };

    const triggerBackup = async () => {
        setTriggerLoading(true);
        setResults(null);
        try {
            const res = await api.post('/backup/trigger-backup');
            setResults(res.data);
            fetchBackups();
        } catch (err) {
            setResults({ error: err.response?.data?.detail || 'Backup failed' });
        } finally {
            setTriggerLoading(false);
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

            {/* OAuth Notification Banner */}
            {notification && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                    notification.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                    {notification.type === 'success'
                        ? <Cloud className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    }
                    <p className="text-sm font-medium flex-1">{notification.msg}</p>
                    <button
                        onClick={() => setNotification(null)}
                        className="text-xs opacity-60 hover:opacity-100 flex-shrink-0"
                    >✕</button>
                </div>
            )}

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
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-200 mb-4">{t('backup.manual_backup')}</h2>
                    <p className="text-sm text-slate-400 mb-4">{t('backup.manual_desc')}</p>
                    <button
                        onClick={triggerBackup}
                        disabled={triggerLoading}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                            triggerLoading
                                ? 'bg-slate-700 text-slate-400 cursor-wait'
                                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                        }`}
                    >
                        {triggerLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> {t('backup.running')}</>
                        ) : (
                            <><RefreshCw className="w-4 h-4" /> {t('backup.run_now')}</>
                        )}
                    </button>
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
                        <button onClick={fetchBackups} disabled={backupsLoading} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            <RefreshCw className={`w-3.5 h-3.5 ${backupsLoading ? 'animate-spin' : ''}`} />
                            {t('backup.refresh')}
                        </button>
                    </div>

                    {backups.length > 0 ? (
                        <div className="space-y-2">
                            {backups.map((b) => (
                                <div key={b.id} className="flex items-center justify-between text-sm py-2 px-3 bg-slate-700/30 rounded">
                                    <div className="flex items-center gap-3">
                                        <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <span className="text-slate-300">{b.backup_name}</span>
                                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                                b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                b.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-amber-500/20 text-amber-400'
                                            }`}>{b.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500">{new Date(b.created_at).toLocaleString()}</span>
                                        {b.gdrive_web_link && (
                                            <a href={b.gdrive_web_link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500">{t('backup.no_files')}</p>
                    )}
                </div>
            )}
        </div>
    );
}
