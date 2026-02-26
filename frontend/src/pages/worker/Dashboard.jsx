import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import api from '../../utils/api';
import { db } from '../../utils/db';
import StepperInput from '../../components/worker/StepperInput';
import { Wifi, WifiOff, RefreshCw, LogOut, CheckCircle } from 'lucide-react';

export default function WorkerDashboard() {
    const { user, logout } = useAuth();
    const { isOnline, isSyncing, queueAction } = useSyncQueue();
    const [newspapers, setNewspapers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'deliveries'

    useEffect(() => {
        loadData();
    }, [isOnline]);

    const loadData = async () => {
        if (isOnline) {
            // Fetch fresh network data, cache it
            try {
                const res = await api.get('/worker/assignments');

                // Cache to Dexie
                await db.routes.clear();
                await db.stock.clear();

                if (res.data.customers) await db.routes.bulkAdd(res.data.customers.map(c => ({ ...c, status: undefined })));
                if (res.data.newspapers) await db.stock.bulkAdd(res.data.newspapers.map(n => ({ newspaper_id: n.id, newspaper_name: n.name, taken: 0, returned: 0 })));

                setNewspapers(await db.stock.toArray());
                setCustomers(await db.routes.toArray());
            } catch (err) {
                console.error("Failed to load network assignments, falling back to cache.", err);
                loadFromCache();
            }
        } else {
            loadFromCache();
        }
    };

    const loadFromCache = async () => {
        setNewspapers(await db.stock.toArray());
        setCustomers(await db.routes.toArray());
    };

    const handleStockChange = async (paperId, field, newValue) => {
        // 1. Update UI & Local DB immediately
        const updated = newspapers.map(p => {
            if (p.newspaper_id === paperId) {
                return { ...p, [field]: newValue };
            }
            return p;
        });
        setNewspapers(updated);

        const targetPaper = updated.find(p => p.newspaper_id === paperId);
        await db.stock.put(targetPaper);

        // 2. Queue for background sync
        queueAction('STOCK_UPDATE', {
            newspaper_id: paperId,
            taken: targetPaper.taken,
            returned: targetPaper.returned
        });
    };

    const handleDeliveryToggle = async (customerId, currentStatus) => {
        const newStatus = currentStatus === 1 ? 0 : 1;

        // 1. Update UI & Local DB
        const updated = customers.map(c => {
            if (c.id === customerId) return { ...c, status: newStatus };
            return c;
        });
        setCustomers(updated);

        const targetCustomer = updated.find(c => c.id === customerId);
        await db.routes.put(targetCustomer);

        // 2. Queue for background sync
        queueAction('DELIVERY_UPDATE', {
            customer_id: customerId,
            status: newStatus
        });
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <header className="px-4 py-4 bg-white border-b border-slate-200 shadow-sm flex justify-between items-center sticky top-0 z-10 shrink-0">
                <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">Distributor PWA</h1>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5 capitalize">{user?.role} Portal</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Network Status Indicator */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isOnline ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-red-100 text-red-700 ring-1 ring-red-500/20'
                        }`}>
                        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {isOnline ? 'Online' : 'Offline'}
                    </div>

                    {/* Sync Indicator */}
                    {isSyncing && (
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    )}

                    <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 rounded-full transition-colors">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex p-4 shrink-0 gap-2 bg-slate-50 relative z-0">
                <button
                    onClick={() => setActiveTab('stock')}
                    className={`flex-1 py-3 font-bold text-sm rounded-xl transition-all shadow-sm ${activeTab === 'stock' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                >
                    1. Daily Stock
                </button>
                <button
                    onClick={() => setActiveTab('deliveries')}
                    className={`flex-1 py-3 font-bold text-sm rounded-xl transition-all shadow-sm ${activeTab === 'deliveries' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                >
                    2. Deliveries
                </button>
            </div>

            {/* Scrollable Content Pane */}
            <main className="flex-1 overflow-y-auto w-full max-w-lg mx-auto pb-24 px-4 relative z-0">

                {/* Stock Tab */}
                {activeTab === 'stock' && (
                    <div className="space-y-6 isolate">
                        {newspapers.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p>No newspapers assigned to this agency.</p>
                            </div>
                        ) : (
                            newspapers.map(paper => (
                                <div key={paper.newspaper_id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 isolation-auto">
                                    <h2 className="text-xl font-bold text-slate-800 mb-4">{paper.newspaper_name}</h2>

                                    <div className="space-y-5">
                                        <StepperInput
                                            label="Quantity Taken (from Agent)"
                                            value={paper.taken || 0}
                                            onChange={(val) => handleStockChange(paper.newspaper_id, 'taken', val)}
                                        />
                                        <StepperInput
                                            label="Quantity Returned (to Agent)"
                                            value={paper.returned || 0}
                                            onChange={(val) => handleStockChange(paper.newspaper_id, 'returned', val)}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Deliveries Tab */}
                {activeTab === 'deliveries' && (
                    <div className="space-y-4 isolate">
                        {customers.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p>No customers assigned.</p>
                            </div>
                        ) : (
                            customers.map(cust => (
                                <div key={cust.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center isolation-auto">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">{cust.name}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-1">{cust.address}</p>
                                    </div>

                                    <button
                                        onClick={() => handleDeliveryToggle(cust.id, cust.status)}
                                        className={`shrink-0 w-12 h-12 rounded-full flex justify-center items-center shadow-md transition-all active:scale-95 ${cust.status === 1 ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-100 text-slate-300 border border-slate-200 shadow-none'
                                            }`}
                                    >
                                        <CheckCircle className="w-6 h-6" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Notification Toast if Offline Actions are Queued */}
            {!isOnline && (
                <div className="absolute bottom-6 left-4 right-4 bg-slate-800/90 backdrop-blur tracking-tight text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between z-50">
                    <span className="text-sm font-medium">Changes saved securely offline.</span>
                    <WifiOff className="w-4 h-4 text-slate-400" />
                </div>
            )}
        </div>
    );
}
