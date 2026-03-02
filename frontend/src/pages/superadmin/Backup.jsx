import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import { HardDrive, Cloud, CloudOff, RefreshCw, Loader2, FileSpreadsheet, Calendar, TrendingUp, Search, Building2, ChevronDown, ChevronUp, ExternalLink, Database, Download, FileJson, FileCode, Upload, CheckCircle, AlertCircle, PlayCircle, Link2, Unlink } from 'lucide-react';

export default function SuperAdminBackup() {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [files, setFiles] = useState({ daily: [], monthly: [], yearly: [] });
    const [filesLoading, setFilesLoading] = useState(false);
    const [triggerLoading, setTriggerLoading] = useState(null);
    const [results, setResults] = useState(null);
    const [dbStats, setDbStats] = useState(null);
    const [dbExporting, setDbExporting] = useState(null);
    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const fileInputRef = useRef(null);
    const sqlInputRef = useRef(null);
    // SA GDrive state
    const [saGdrive, setSaGdrive] = useState({ connected: false, connected_at: null });
    const [saGdriveLoading, setSaGdriveLoading] = useState(null); // 'connect' | 'disconnect' | 'upload'
    // Backup All state
    const [backupAllLoading, setBackupAllLoading] = useState(false);
    const [backupAllResult, setBackupAllResult] = useState(null);

    const fetchAgencies = useCallback(async () => {
        try {
            const res = await api.get('/superadmin/backup/agencies');
            setAgencies(res.data);
        } catch {
            console.error('Failed to fetch agency backup status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAgencies(); }, [fetchAgencies]);

    useEffect(() => {
        api.get('/superadmin/backup/db/stats')
            .then(res => setDbStats(res.data))
            .catch(() => setDbStats(null));
        api.get('/superadmin/backup/gdrive/status')
            .then(res => setSaGdrive(res.data))
            .catch(() => {});
    }, []);

    const exportDb = async (format) => {
        setDbExporting(format);
        try {
            const url = format === 'json'
                ? '/superadmin/backup/db/export-json'
                : '/superadmin/backup/db/export-sql';
            const res = await api.get(url, { responseType: 'blob' });
            const disposition = res.headers['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const filename = match ? match[1] : `newsflux_backup.${format}`;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(res.data);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
        } catch {
            console.error(`Failed to export ${format}`);
        } finally {
            setDbExporting(null);
        }
    };

    const handleUpload = async (e, format = 'json') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const url = format === 'sql' ? '/superadmin/backup/db/upload-sql' : '/superadmin/backup/db/upload';
            const res = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadResult({ success: res.data.status === 'success', format, ...res.data });
            api.get('/superadmin/backup/db/stats').then(r => setDbStats(r.data)).catch(() => {});
        } catch (err) {
            setUploadResult({ success: false, error: err.response?.data?.detail || 'Upload failed' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (sqlInputRef.current) sqlInputRef.current.value = '';
        }
    };

    const connectSaGdrive = async () => {
        setSaGdriveLoading('connect');
        try {
            const res = await api.get('/superadmin/backup/gdrive/connect');
            window.open(res.data.url, '_blank', 'width=600,height=700');
        } catch {
            console.error('Failed to start GDrive OAuth');
        } finally {
            setSaGdriveLoading(null);
        }
    };

    const disconnectSaGdrive = async () => {
        setSaGdriveLoading('disconnect');
        try {
            await api.post('/superadmin/backup/gdrive/disconnect');
            setSaGdrive({ connected: false, connected_at: null });
        } catch {
            console.error('Failed to disconnect GDrive');
        } finally {
            setSaGdriveLoading(null);
        }
    };

    const uploadDbToGdrive = async () => {
        setSaGdriveLoading('upload');
        try {
            await api.post('/superadmin/backup/gdrive/upload-db');
            setSaGdriveLoading(null);
            alert('Database backup uploaded to Google Drive successfully!');
        } catch (err) {
            console.error('GDrive upload failed');
            alert(err.response?.data?.detail || 'GDrive upload failed');
            setSaGdriveLoading(null);
        }
    };

    const triggerBackupAll = async () => {
        setBackupAllLoading(true);
        setBackupAllResult(null);
        try {
            const res = await api.post('/superadmin/backup/trigger-all');
            setBackupAllResult(res.data);
        } catch (err) {
            setBackupAllResult({ error: err.response?.data?.detail || 'Backup all failed' });
        } finally {
            setBackupAllLoading(false);
        }
    };

    const fetchFiles = async (agencyId) => {
        setFilesLoading(true);
        try {
            const [daily, monthly, yearly] = await Promise.all([
                api.get(`/superadmin/backup/${agencyId}/files/daily`),
                api.get(`/superadmin/backup/${agencyId}/files/monthly`),
                api.get(`/superadmin/backup/${agencyId}/files/yearly`),
            ]);
            setFiles({ daily: daily.data, monthly: monthly.data, yearly: yearly.data });
        } catch {
            setFiles({ daily: [], monthly: [], yearly: [] });
        } finally {
            setFilesLoading(false);
        }
    };

    const toggleExpand = (agencyId) => {
        if (expanded === agencyId) {
            setExpanded(null);
            setFiles({ daily: [], monthly: [], yearly: [] });
            setResults(null);
        } else {
            setExpanded(agencyId);
            setResults(null);
            fetchFiles(agencyId);
        }
    };

    const triggerBackup = async (agencyId, type) => {
        const key = `${agencyId}-${type}`;
        setTriggerLoading(key);
        setResults(null);
        try {
            const endpoint = type === 'daily' ? `/superadmin/backup/${agencyId}/trigger`
                : type === 'monthly' ? `/superadmin/backup/${agencyId}/trigger-monthly`
                : `/superadmin/backup/${agencyId}/trigger-yearly`;
            const res = await api.post(endpoint);
            setResults(res.data);
            fetchFiles(agencyId);
        } catch (err) {
            setResults({ error: err.response?.data?.detail || 'Backup failed' });
        } finally {
            setTriggerLoading(null);
        }
    };

    const filtered = agencies.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    const connectedCount = agencies.filter(a => a.gdrive_connected).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                    <HardDrive className="w-7 h-7 text-blue-400" />
                    Agency Backups
                </h1>
                <p className="text-slate-400 mt-1">Monitor and trigger Google Drive backups for all agencies</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <p className="text-sm text-slate-400">Total Agencies</p>
                    <p className="text-2xl font-bold text-white mt-1">{agencies.length}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <p className="text-sm text-slate-400">Drive Connected</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{connectedCount}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <p className="text-sm text-slate-400">Not Connected</p>
                    <p className="text-2xl font-bold text-slate-500 mt-1">{agencies.length - connectedCount}</p>
                </div>
            </div>

            {/* Database Backup */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                            <Database className="w-5 h-5 text-indigo-400" />
                            Database Backup
                        </h2>
                        <p className="text-sm text-slate-400 mt-0.5">Export the entire platform database as JSON or SQL dump</p>
                    </div>
                    {dbStats && (
                        <span className="text-sm text-slate-400">
                            Total rows: <span className="font-bold text-white">{dbStats.total_rows.toLocaleString()}</span>
                        </span>
                    )}
                </div>

                {/* Table Stats */}
                {dbStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {dbStats.tables.map(t_item => (
                            <div key={t_item.table} className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-slate-500 truncate">{t_item.table}</p>
                                <p className="text-sm font-semibold text-slate-200">{t_item.rows.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Export & Upload Buttons */}
                <div className="flex flex-wrap gap-3 pt-1">
                    <button
                        onClick={() => exportDb('json')}
                        disabled={dbExporting !== null}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium hover:bg-indigo-600/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {dbExporting === 'json' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                        ) : (
                            <><FileJson className="w-4 h-4" /> Export JSON</>
                        )}
                    </button>
                    <button
                        onClick={() => exportDb('sql')}
                        disabled={dbExporting !== null}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {dbExporting === 'sql' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
                        ) : (
                            <><FileCode className="w-4 h-4" /> Export SQL</>
                        )}
                    </button>

                    <div className="border-l border-slate-700 mx-1" />

                    <input type="file" accept=".json" ref={fileInputRef} onChange={(e) => handleUpload(e, 'json')} className="hidden" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {uploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        ) : (
                            <><Upload className="w-4 h-4" /> Upload JSON</>
                        )}
                    </button>
                    <input type="file" accept=".sql" ref={sqlInputRef} onChange={(e) => handleUpload(e, 'sql')} className="hidden" />
                    <button
                        onClick={() => sqlInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        {uploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        ) : (
                            <><Upload className="w-4 h-4" /> Upload SQL</>
                        )}
                    </button>
                </div>

                {/* Upload Result */}
                {uploadResult && (
                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                        uploadResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                        {uploadResult.success ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                        <div>
                            {uploadResult.success ? (
                                <>
                                    <p className="font-medium">Restore complete</p>
                                    <p className="text-sm opacity-80 mt-1">
                                        {uploadResult.format === 'sql'
                                            ? `${uploadResult.statements_run} SQL statements executed`
                                            : `${uploadResult.total_inserted} inserted, ${uploadResult.total_updated} updated across ${Object.keys(uploadResult.tables || {}).length} tables`
                                        }
                                    </p>
                                </>
                            ) : uploadResult.status === 'partial' ? (
                                <>
                                    <p className="font-medium">Partial restore — {uploadResult.statements_run} statements ran, {uploadResult.errors?.length} errors</p>
                                    <ul className="text-xs opacity-80 mt-1 space-y-0.5">
                                        {uploadResult.errors?.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                                    </ul>
                                </>
                            ) : (
                                <p className="font-medium">{uploadResult.error}</p>
                            )}
                        </div>
                        <button onClick={() => setUploadResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}
            </div>

            {/* Super Admin Google Drive Backup */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                            <Cloud className="w-5 h-5 text-blue-400" />
                            Google Drive Backup
                        </h2>
                        <p className="text-sm text-slate-400 mt-0.5">Back up the full platform database to your Google Drive</p>
                    </div>
                    {saGdrive.connected && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full font-medium">
                            Connected {saGdrive.connected_at ? `since ${new Date(saGdrive.connected_at).toLocaleDateString()}` : ''}
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-3">
                    {saGdrive.connected ? (
                        <>
                            <button
                                onClick={uploadDbToGdrive}
                                disabled={saGdriveLoading !== null}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-wait"
                            >
                                {saGdriveLoading === 'upload' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading to Drive…</>
                                ) : (
                                    <><Cloud className="w-4 h-4" /> Backup DB to Drive</>
                                )}
                            </button>
                            <button
                                onClick={disconnectSaGdrive}
                                disabled={saGdriveLoading !== null}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-600/20 transition-colors disabled:opacity-50"
                            >
                                {saGdriveLoading === 'disconnect' ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Disconnecting…</>
                                ) : (
                                    <><Unlink className="w-4 h-4" /> Disconnect Drive</>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={connectSaGdrive}
                            disabled={saGdriveLoading !== null}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                        >
                            {saGdriveLoading === 'connect' ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
                            ) : (
                                <><Link2 className="w-4 h-4" /> Connect Google Drive</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Search + Backup All */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search agencies..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                {connectedCount > 0 && (
                    <button
                        onClick={triggerBackupAll}
                        disabled={backupAllLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
                    >
                        {backupAllLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Backing up…</>
                        ) : (
                            <><PlayCircle className="w-4 h-4" /> Backup All ({connectedCount})</>
                        )}
                    </button>
                )}
            </div>

            {/* Backup All Result */}
            {backupAllResult && (
                <div className={`rounded-xl border p-4 ${
                    backupAllResult.error
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-slate-800/50 border-slate-700'
                }`}>
                    {backupAllResult.error ? (
                        <p className="text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {backupAllResult.error}
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-slate-200">Backup All Results — {backupAllResult.date}</h4>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="text-emerald-400">{backupAllResult.total_uploaded} uploaded</span>
                                    {backupAllResult.total_failed > 0 && (
                                        <span className="text-red-400">{backupAllResult.total_failed} failed</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                {backupAllResult.results?.map((a, i) => (
                                    <div key={i} className="bg-slate-900/50 rounded-lg p-3">
                                        <p className="text-xs font-medium text-slate-300 mb-1">{a.agency_name}</p>
                                        <div className="space-y-1">
                                            {a.files.map((f, j) => (
                                                <div key={j} className={`text-xs flex items-center justify-between ${
                                                    f.status === 'uploaded' ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    <span>{f.file}</span>
                                                    <span>{f.status === 'uploaded' ? '✓' : `✗ ${f.error?.slice(0, 60)}`}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <button onClick={() => setBackupAllResult(null)} className="mt-2 text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
                </div>
            )}

            {/* Agency List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center text-slate-500">
                        No agencies found.
                    </div>
                ) : (
                    filtered.map(agency => (
                        <div key={agency.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                            {/* Agency Row */}
                            <button
                                onClick={() => agency.gdrive_connected && toggleExpand(agency.id)}
                                disabled={!agency.gdrive_connected}
                                className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${
                                    agency.gdrive_connected ? 'hover:bg-slate-700/30 cursor-pointer' : 'cursor-default opacity-70'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${agency.gdrive_connected ? 'bg-emerald-500/15' : 'bg-slate-700/50'}`}>
                                        {agency.gdrive_connected
                                            ? <Cloud className="w-5 h-5 text-emerald-400" />
                                            : <CloudOff className="w-5 h-5 text-slate-500" />
                                        }
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            {agency.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {agency.gdrive_connected
                                                ? `Connected since ${new Date(agency.gdrive_connected_at).toLocaleDateString()}`
                                                : 'Google Drive not linked by admin'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                        agency.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                                    }`}>
                                        {agency.status}
                                    </span>
                                    {agency.gdrive_connected && (
                                        expanded === agency.id
                                            ? <ChevronUp className="w-5 h-5 text-slate-500" />
                                            : <ChevronDown className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Panel */}
                            {expanded === agency.id && (
                                <div className="border-t border-slate-700 p-6 space-y-5">
                                    {/* Backup Action Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { type: 'daily', icon: FileSpreadsheet, color: 'blue', label: 'Daily Updates', desc: 'Stock summary and delivery reports for today' },
                                            { type: 'monthly', icon: Calendar, color: 'purple', label: 'Monthly Analysis', desc: 'Revenue, subscriptions and invoice reports' },
                                            { type: 'yearly', icon: TrendingUp, color: 'amber', label: 'Yearly Analysis', desc: 'Annual report with revenue and growth trends' },
                                        ].map(({ type, icon: Icon, color, label, desc }) => {
                                            const loadKey = `${agency.id}-${type}`;
                                            return (
                                                <div key={type} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className={`w-5 h-5 text-${color}-400`} />
                                                        <h4 className="font-semibold text-slate-200 text-sm">{label}</h4>
                                                    </div>
                                                    <p className="text-xs text-slate-500">{desc}</p>
                                                    <button
                                                        onClick={() => triggerBackup(agency.id, type)}
                                                        disabled={triggerLoading !== null}
                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                                            triggerLoading === loadKey
                                                                ? 'bg-slate-700 text-slate-400 cursor-wait'
                                                                : `bg-${color}-600/20 text-${color}-400 hover:bg-${color}-600/30 border border-${color}-500/30`
                                                        }`}
                                                    >
                                                        {triggerLoading === loadKey ? (
                                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                                                        ) : (
                                                            <><RefreshCw className="w-3.5 h-3.5" /> Run Now</>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Results */}
                                    {results && (
                                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                                            <h4 className="font-semibold text-slate-200 text-sm mb-3">Backup Results</h4>
                                            {results.error ? (
                                                <p className="text-red-400 text-sm">{results.error}</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {results.results?.map((r, i) => (
                                                        <div key={i} className={`flex items-center justify-between text-xs p-2 rounded ${
                                                            r.status === 'uploaded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                            <span>{r.file}</span>
                                                            <span className="font-medium">{r.status === 'uploaded' ? '✓ Uploaded' : `✗ ${r.error}`}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* File History */}
                                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-slate-200 text-sm">Backup History</h4>
                                            <button
                                                onClick={() => fetchFiles(agency.id)}
                                                disabled={filesLoading}
                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${filesLoading ? 'animate-spin' : ''}`} />
                                                Refresh
                                            </button>
                                        </div>

                                        {['daily', 'monthly', 'yearly'].map(cat => (
                                            <div key={cat} className="mb-3 last:mb-0">
                                                <h5 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                                                    {cat === 'daily' ? 'Daily Updates' : cat === 'monthly' ? 'Monthly Analysis' : 'Yearly Analysis'}
                                                </h5>
                                                {files[cat].length === 0 ? (
                                                    <p className="text-xs text-slate-600 italic">No files yet</p>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {files[cat].slice(0, 5).map((f, i) => (
                                                            <div key={i} className="flex items-center justify-between text-xs bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                                                <span className="text-slate-300 truncate">{f.name}</span>
                                                                <a
                                                                    href={f.webViewLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 flex-shrink-0 ml-3"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
