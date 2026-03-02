import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { 
    Cloud, 
    Download, 
    Trash2, 
    Plus,
    CheckCircle, 
    AlertCircle, 
    Clock,
    LogOut
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function BackupSettings() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Check if Google Drive is connected
    useEffect(() => {
        checkGDriveStatus();
        loadBackups();
    }, []);

    const checkGDriveStatus = async () => {
        try {
            const response = await api.get('/api/v1/backup/status');
            setIsConnected(response.data?.connected || false);
        } catch (err) {
            setIsConnected(false);
        }
    };

    const loadBackups = async () => {
        try {
            const response = await api.get('/api/v1/backup/list?limit=50');
            setBackups(response.data || []);
        } catch (err) {
            console.error('Failed to load backups:', err);
        }
    };

    const handleConnectGDrive = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Get auth URL
            const response = await api.get('/api/v1/backup/google/auth-url');
            const { auth_url } = response.data;
            
            // Redirect to Google OAuth
            window.location.href = auth_url;
        } catch (err) {
            setError(t('backup.connect_error') || 'Failed to connect Google Drive');
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure? All future backups will stop.')) return;
        
        try {
            setLoading(true);
            await api.post('/api/v1/backup/disconnect-google');
            setIsConnected(false);
            setSuccess(t('backup.disconnect_success') || 'Google Drive disconnected');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(t('backup.disconnect_error') || 'Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    const handleTriggerBackup = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.post('/api/v1/backup/trigger-backup?backup_type=files');
            setSuccess(response.data?.message || 'Backup started');
            // Reload backups
            await loadBackups();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Backup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBackup = async (backupId) => {
        if (!window.confirm('Delete this backup? This cannot be undone.')) return;
        
        try {
            setLoading(true);
            await api.delete(`/api/v1/backup/delete/${backupId}`);
            setSuccess('Backup deleted');
            await loadBackups();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    // Check if user is admin
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">{t('common.access_denied') || 'Access Denied'}</h1>
                    <p className="text-gray-600 mt-2">{t('common.admin_only') || 'Only admins can access this page'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
                        <Cloud className="w-10 h-10 text-sky-600" />
                        {t('backup.title') || 'Backup & Cloud Storage'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {t('backup.description') || 'Manage automatic backups of your files to Google Drive'}
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-green-800">{success}</p>
                    </div>
                )}

                {/* Google Drive Connection Card */}
                <div className="bg-white rounded-lg shadow-md p-8 mb-8 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                {isConnected ? (
                                    <>
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                        {t('backup.connected') || 'Google Drive Connected'}
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-6 h-6 text-amber-600" />
                                        {t('backup.not_connected') || 'Google Drive Not Connected'}
                                    </>
                                )}
                            </h2>
                            <p className="text-gray-600 mt-2">
                                {isConnected 
                                    ? (t('backup.connected_desc') || 'Your agency is connected to Google Drive. Daily backups are active.')
                                    : (t('backup.not_connected_desc') || 'Connect your Google account to enable automatic file backups.')
                                }
                            </p>
                        </div>
                        
                        <div className="flex gap-3">
                            {isConnected ? (
                                <button
                                    onClick={handleDisconnect}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <LogOut className="w-4 h-4" />
                                    {t('backup.disconnect') || 'Disconnect'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleConnectGDrive}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                                >
                                    <Plus className="w-5 h-5" />
                                    {t('backup.connect') || 'Connect Google Drive'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {isConnected && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
                        <button
                            onClick={handleTriggerBackup}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 w-full justify-center"
                        >
                            <Download className="w-5 h-5" />
                            {loading ? (t('common.processing') || 'Processing...') : (t('backup.trigger') || 'Backup Now')}
                        </button>
                    </div>
                )}

                {/* Backup History */}
                {backups.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-slate-900">
                                {t('backup.history') || 'Backup History'}
                            </h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="text-left px-6 py-3 font-semibold text-gray-700">{t('common.name') || 'Name'}</th>
                                        <th className="text-left px-6 py-3 font-semibold text-gray-700">{t('common.status') || 'Status'}</th>
                                        <th className="text-left px-6 py-3 font-semibold text-gray-700">{t('common.size') || 'Size'}</th>
                                        <th className="text-left px-6 py-3 font-semibold text-gray-700">{t('common.date') || 'Date'}</th>
                                        <th className="text-left px-6 py-3 font-semibold text-gray-700">{t('common.actions') || 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map((backup) => (
                                        <tr key={backup.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <a 
                                                    href={backup.gdrive_web_link} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="text-sky-600 hover:underline truncate"
                                                >
                                                    {backup.backup_name}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-1 w-fit px-3 py-1 rounded-full text-sm font-medium ${
                                                    backup.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : backup.status === 'pending'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {backup.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                                                    {backup.status === 'pending' && <Clock className="w-4 h-4" />}
                                                    {backup.status === 'failed' && <AlertCircle className="w-4 h-4" />}
                                                    {backup.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {backup.file_size_bytes 
                                                    ? `${(backup.file_size_bytes / 1024 / 1024).toFixed(2)} MB`
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 text-sm">
                                                {new Date(backup.created_at).toLocaleDateString()} 
                                                <br />
                                                <span className="text-gray-500">
                                                    {formatDistanceToNow(new Date(backup.created_at), { addSuffix: true })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleDeleteBackup(backup.id)}
                                                    disabled={loading}
                                                    className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                                                    title="Delete backup"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {backups.length === 0 && isConnected && (
                    <div className="bg-white rounded-lg shadow-md p-12 border border-gray-200 text-center">
                        <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">{t('backup.no_backups') || 'No backups yet'}</p>
                        <p className="text-gray-500">{t('backup.first_backup_hint') || 'Click "Backup Now" to create your first backup'}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
