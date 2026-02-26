import Dexie from 'dexie';

export const db = new Dexie('NewsFluxWorkerDB');

db.version(1).stores({
    // Cached GET responses
    routes: '++id, customer_id, name, address, newspaper_id, newspaper_name, status',
    stock: '++id, newspaper_id, newspaper_name, taken, returned',

    // Offline Background Queues
    syncQueue: '++id, type, payload, timestamp, status' // type: 'STOCK_UPDATE' | 'DELIVERY_UPDATE'
});
