/**
 * IndexedDB database configuration for offline-first PWA functionality
 * Enables worker mobile app to work offline and sync when connection is restored
 * @module utils/db
 */
import Dexie from 'dexie';

/**
 * NewsFlux Worker Database instance
 * Uses Dexie wrapper around IndexedDB for better DX
 * 
 * Stores two types of data:
 * 1. Cached responses from API (routes, stock data, customers)
 * 2. Offline-first sync queue for data created/modified while offline
 * 
 * @type {Dexie}
 */
export const db = new Dexie('NewsFluxWorkerDB');

/**
 * Define database schema and indexes
 * 
 * 'routes' table: Cached customer routes and delivery data
 * - ++id: Auto-incrementing primary key
 * - customer_id: Foreign key for grouping by customer
 * - name, address: Customer lookup indexes
 * - newspaper_id, newspaper_name: Newspaper association
 * - status: Delivery status for filtering
 * 
 * 'stock' table: Cached stock levels for newspapers
 * - ++id: Auto-incrementing primary key
 * - newspaper_id: Newspaper lookup index
 * - newspaper_name: Name-based search
 * - taken, returned: Stock state tracking
 * 
 * 'syncQueue' table: Queue of offline operations to sync when online
 * - ++id: Auto-incrementing primary key
 * - type: Operation type (STOCK_UPDATE, DELIVERY_UPDATE)
 * - payload: Serialized operation data
 * - timestamp: When operation was created
 * - status: Sync status (pending, synced, failed)
 */
db.version(1).stores({
    // Cached GET responses from API
    routes: '++id, customer_id, name, address, newspaper_id, newspaper_name, status',
    stock: '++id, newspaper_id, newspaper_name, taken, returned',

    // Offline Background Queues - hold operations until network restored
    syncQueue: '++id, type, payload, timestamp, status'
});
