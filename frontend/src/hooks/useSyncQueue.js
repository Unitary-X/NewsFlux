import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import api from '../utils/api';

export function useSyncQueue() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    const flushQueue = useCallback(async () => {
        if (isSyncing || !navigator.onLine) return;

        try {
            setIsSyncing(true);
            const pendingJobs = await db.syncQueue.where('status').equals('pending').toArray();

            if (pendingJobs.length === 0) {
                setIsSyncing(false);
                return;
            }

            // Mark as syncing to avoid race conditions
            await Promise.all(pendingJobs.map(job => db.syncQueue.update(job.id, { status: 'syncing' })));

            // Construct Batch API Payload
            const stock_updates = pendingJobs
                .filter(j => j.type === 'STOCK_UPDATE')
                .map(j => ({ ...j.payload, timestamp: j.timestamp }));

            const delivery_updates = pendingJobs
                .filter(j => j.type === 'DELIVERY_UPDATE')
                .map(j => ({ ...j.payload, timestamp: j.timestamp }));

            // Transmit to Central Cloud
            await api.post('/worker/offline-sync', {
                stock_updates,
                delivery_updates
            });

            // Clear successful jobs
            const jobIds = pendingJobs.map(j => j.id);
            await db.syncQueue.bulkDelete(jobIds);

        } catch (err) {
            console.error('Background Sync Failed. Retrying later...', err);
            // Revert status so they can be tried again
            const pendingJobs = await db.syncQueue.where('status').equals('syncing').toArray();
            await Promise.all(pendingJobs.map(job => db.syncQueue.update(job.id, { status: 'pending' })));
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing]);

    /**
     * Queue an action to be synced when online
     * @param {string} type - Action type (e.g., 'STOCK_UPDATE', 'DELIVERY_UPDATE')
     * @param {object} payload - Action payload data
     */
    const queueAction = useCallback(async (type, payload) => {
        try {
            await db.syncQueue.add({
                type,
                payload,
                status: 'pending',
                timestamp: Date.now(),
                retries: 0
            });
        } catch (err) {
            console.error('Failed to queue action:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            flushQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Try flushing on initial load if online
        if (navigator.onLine) {
            flushQueue();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [flushQueue]);

    return { isOnline, isSyncing, flushQueue, queueAction };
}
