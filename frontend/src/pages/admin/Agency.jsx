import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Package, Plus, Search, Loader2, RefreshCw, Trash2, X, Pencil, Save, Calendar, IndianRupee, TrendingUp } from 'lucide-react';
import api from '../../utils/api';

export default function Agency() {
    const [customers, setCustomers] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('customers');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Forms
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });
    const [subForm, setSubForm] = useState({ customer_id: '', newspaper_id: '', quantity: 1, price: '', subscription_type: 'daily' });

    // Edit state
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({});

    // Stock state
    const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);
    const [stock, setStock] = useState({});
    const [stockLoading, setStockLoading] = useState(false);
    const [stockSaving, setStockSaving] = useState(false);

    // Worker state
    const [workers, setWorkers] = useState([]);
    const [workerSummaries, setWorkerSummaries] = useState({});
    const [workerForm, setWorkerForm] = useState({ username: '', password: '' });
    const [ledgerDate, setLedgerDate] = useState(new Date().toISOString().split('T')[0]);
    const [ledgerEntries, setLedgerEntries] = useState({});
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [savingRows, setSavingRows] = useState({});
    const [workerSubTab, setWorkerSubTab] = useState('list'); // 'list' | 'ledger'

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (activeTab === 'stock') loadStock(); }, [stockDate, activeTab]); // eslint-disable-line
    useEffect(() => { if (activeTab === 'workers' && workerSubTab === 'ledger') loadLedger(); }, [ledgerDate, activeTab, workerSubTab]); // eslint-disable-line

    const loadData = async () => {
        setLoading(true);
        try {
            const [customersRes, subscriptionsRes, newspapersRes, workersRes] = await Promise.all([
                api.get('/admin/customers'),
                api.get('/admin/subscriptions'),
                api.get('/admin/newspapers'),
                api.get('/admin/workers'),
            ]);
            setCustomers(customersRes.data);
            setSubscriptions(subscriptionsRes.data);
            setNewspapers(newspapersRes.data);
            setWorkers(workersRes.data);

            if (workersRes.data.length > 0) {
                const rows = await Promise.all(
                    workersRes.data.map(w =>
                        api.get(`/admin/workers/${w.id}/summary`)
                            .then(r => [w.id, r.data])
                            .catch(() => [w.id, null])
                    )
                );
                const map = {};
                rows.forEach(([id, data]) => { if (data) map[id] = data; });
                setWorkerSummaries(map);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Customer handlers ---
    const addCustomer = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/admin/customers', customerForm);
            setCustomerForm({ name: '', phone: '', address: '' });
            setShowForm(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add customer');
        } finally { setSubmitting(false); }
    };

    const addSubscription = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/admin/subscriptions', {
                customer_id: subForm.customer_id,
                newspaper_id: subForm.newspaper_id,
                quantity: parseInt(subForm.quantity) || 1,
                price: subForm.price ? parseFloat(subForm.price) : null,
                subscription_type: subForm.subscription_type || 'daily',
            });
            setSubForm({ customer_id: '', newspaper_id: '', quantity: 1, price: '', subscription_type: 'daily' });
            setShowForm(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create subscription');
        } finally { setSubmitting(false); }
    };

    // --- Stock handlers ---
    const loadStock = async () => {
        setStockLoading(true);
        try {
            const res = await api.get(`/admin/stock/${stockDate}`);
            const stockMap = {};
            res.data.forEach(s => { stockMap[s.newspaper_id] = { taken: s.taken, returned: s.returned }; });
            setStock(stockMap);
        } catch (err) { console.error('Failed to load stock', err); }
        finally { setStockLoading(false); }
    };

    const handleStockInput = (paperId, field, value) => {
        const val = parseInt(value) || 0;
        setStock(prev => ({ ...prev, [paperId]: { ...prev[paperId], [field]: val } }));
    };

    const saveStock = async () => {
        setStockSaving(true);
        try {
            await Promise.all(newspapers.map(paper => {
                const entry = stock[paper.id] || { taken: 0, returned: 0 };
                return api.post('/admin/stock', { date: stockDate, newspaper_id: paper.id, taken: entry.taken || 0, returned: entry.returned || 0 });
            }));
            alert('Stock saved successfully!');
        } catch (err) { alert('Failed to save stock.'); }
        finally { setStockSaving(false); }
    };

    const stockTotalIncome = newspapers.reduce((total, paper) => {
        const s = stock[paper.id] || { taken: 0, returned: 0 };
        return total + Math.max(0, (s.taken || 0) - (s.returned || 0)) * Number(paper.base_price);
    }, 0);

    // --- Delete handlers ---
    const deleteCustomer = async (id, name) => {
        if (!confirm(`Delete "${name}"? Subscriptions & invoices will also be removed.`)) return;
        try { await api.delete(`/admin/customers/${id}`); loadData(); } catch { alert('Failed to delete'); }
    };
    const deleteSub = async (id) => {
        if (!confirm('Delete this subscription?')) return;
        try { await api.delete(`/admin/subscriptions/${id}`); loadData(); } catch { alert('Failed to delete'); }
    };

    // --- Edit handlers ---
    const startEditCustomer = (c) => { setEditId(c.id); setEditData({ name: c.name, phone: c.phone || '', address: c.address || '' }); };
    const saveEditCustomer = async () => {
        try {
            await api.put(`/admin/customers/${editId}`, editData);
            setEditId(null); loadData();
        } catch { alert('Failed to update'); }
    };
    const toggleSubStatus = async (sub) => {
        try {
            await api.put(`/admin/subscriptions/${sub.id}`, { status: sub.status === 1 ? 0 : 1 });
            loadData();
        } catch { alert('Failed to update'); }
    };

    // --- Worker handlers ---
    const addWorker = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/admin/workers', workerForm);
            setWorkerForm({ username: '', password: '' });
            setShowForm(false);
            loadData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to add worker');
        } finally { setSubmitting(false); }
    };

    const deleteWorker = async (id, name) => {
        if (!confirm(`Delete worker "${name}"? All their assignments and stock records will be removed.`)) return;
        try { await api.delete(`/admin/workers/${id}`); loadData(); } catch { alert('Failed to delete worker'); }
    };

    const loadLedger = async () => {
        setLedgerLoading(true);
        try {
            const res = await api.get(`/admin/workers/stock?target_date=${ledgerDate}`);
            const saved = {};
            res.data.forEach(e => { saved[`${e.worker_id}_${e.newspaper_id}`] = e; });
            const full = {};
            workers.forEach(w => {
                newspapers.forEach(p => {
                    const key = `${w.id}_${p.id}`;
                    full[key] = saved[key] || { worker_id: w.id, newspaper_id: p.id, taken: 0, returned: 0, amount_given: 0, sold: 0 };
                });
            });
            setLedgerEntries(full);
        } catch (err) { console.error('Failed to load ledger', err); }
        finally { setLedgerLoading(false); }
    };

    const updateLedgerField = (workerId, paperId, field, raw) => {
        const key = `${workerId}_${paperId}`;
        const val = field === 'amount_given' ? parseFloat(raw) || 0 : parseInt(raw) || 0;
        setLedgerEntries(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
    };

    const saveLedgerRow = async (workerId, paperId) => {
        const key = `${workerId}_${paperId}`;
        setSavingRows(prev => ({ ...prev, [key]: true }));
        const entry = ledgerEntries[key];
        try {
            await api.post('/admin/workers/stock', {
                worker_id: workerId, newspaper_id: paperId, date: ledgerDate,
                taken: entry.taken || 0, returned: entry.returned || 0, amount_given: entry.amount_given || 0,
            });
            setLedgerEntries(prev => ({ ...prev, [key]: { ...prev[key], sold: Math.max(0, (entry.taken || 0) - (entry.returned || 0)) } }));
        } catch { alert('Failed to save entry'); }
        finally { setSavingRows(prev => ({ ...prev, [key]: false })); }
    };

    // --- Filtering ---
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search));
    const filteredSubs = subscriptions.filter(s => (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) || (s.newspaper_name || '').toLowerCase().includes(search.toLowerCase()));

    const activeSubs = subscriptions.filter(s => s.status === 1);
    const totalEstMonthly = activeSubs.reduce((sum, sub) => {
        const paper = newspapers.find(n => n.id === sub.newspaper_id);
        const dailyPrice = sub.price ? Number(sub.price) : (paper ? Number(paper.base_price) : 0);
        return sum + (dailyPrice * sub.quantity * 30);
    }, 0);

    const tabs = [
        { id: 'customers', label: 'Customers', icon: Users, count: customers.length, color: 'emerald', subtitle: null },
        { id: 'subscriptions', label: 'Subscriptions', icon: BookOpen, count: `${activeSubs.length}/${subscriptions.length}`, color: 'amber', subtitle: `Est. â‚¹${totalEstMonthly.toFixed(0)}/mo` },
        { id: 'stock', label: 'Daily Stock', icon: Package, count: newspapers.length, color: 'blue', subtitle: stockTotalIncome > 0 ? `â‚¹${stockTotalIncome.toFixed(0)} today` : null },
        { id: 'workers', label: 'Workers', icon: Users, count: workers.length, color: 'indigo', subtitle: null },
    ];

    const colorMap = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', activeBorder: 'border-indigo-500', tabBg: 'bg-indigo-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', activeBorder: 'border-emerald-500', tabBg: 'bg-emerald-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', activeBorder: 'border-amber-500', tabBg: 'bg-amber-600' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', activeBorder: 'border-blue-500', tabBg: 'bg-blue-600' },
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    const currentTab = tabs.find(t => t.id === activeTab);
    const currentColor = colorMap[currentTab?.color || 'emerald'];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Agency Overview</h1>
                    <p className="text-slate-500 mt-2">Manage customers, subscriptions, stock and workers</p>
                </div>
                <button onClick={loadData} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tabs.map((tab) => {
                    const c = colorMap[tab.color];
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSearch(''); setShowForm(false); setEditId(null); }}
                            className={`bg-white rounded-2xl shadow-sm border-2 p-5 text-left transition-all ${
                                isActive ? `${c.activeBorder} shadow-md` : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}>
                                    <tab.icon className="w-5 h-5" />
                                </div>
                                {isActive && <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active</span>}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">{tab.count}</h3>
                            <p className="text-sm text-slate-500 mt-1">{tab.label}</p>
                            {tab.subtitle && <p className="text-xs text-slate-400 mt-0.5">{tab.subtitle}</p>}
                        </button>
                    );
                })}
            </div>

            {/* Tab Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                {/* Tab Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 px-2">
                    <div className="flex">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const c = colorMap[tab.color];
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setSearch(''); setShowForm(false); setEditId(null); }}
                                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                        isActive ? `${c.activeBorder} ${c.text}` : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                        isActive ? `${c.bg} ${c.text}` : 'bg-slate-100 text-slate-500'
                                    }`}>{tab.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2 pr-2">
                        {activeTab === 'stock' ? (
                            <>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input type="date" value={stockDate} onChange={e => setStockDate(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <button onClick={saveStock} disabled={stockSaving || stockLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                                    {stockSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                                </button>
                            </>
                        ) : activeTab === 'workers' ? (
                            workerSubTab === 'ledger' ? (
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input type="date" value={ledgerDate} onChange={e => setLedgerDate(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setShowForm(v => !v); setEditId(null); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        showForm ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                >
                                    {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {showForm ? 'Cancel' : 'Add Worker'}
                                </button>
                            )
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-44" />
                                </div>
                                <button
                                    onClick={() => { setShowForm(!showForm); setEditId(null); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        showForm ? 'bg-slate-200 text-slate-700' : `${currentColor.tabBg} text-white hover:opacity-90`
                                    }`}
                                >
                                    {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {showForm ? 'Cancel' : 'Add'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Inline Add Forms */}
                {showForm && activeTab !== 'workers' && (
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                        {activeTab === 'customers' && (
                            <form onSubmit={addCustomer} className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                                    <input value={customerForm.name} onChange={e => setCustomerForm({ ...customerForm, name: e.target.value })} required placeholder="Customer name" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                                    <input value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="Phone number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                                    <input value={customerForm.address} onChange={e => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="Address" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Customer'}
                                </button>
                            </form>
                        )}
                        {activeTab === 'subscriptions' && (
                            <form onSubmit={addSubscription} className="flex items-end gap-3 flex-wrap">
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Customer</label>
                                    <select value={subForm.customer_id} onChange={e => setSubForm({ ...subForm, customer_id: e.target.value })} required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                                        <option value="">Select...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Newspaper</label>
                                    <select value={subForm.newspaper_id} onChange={e => setSubForm({ ...subForm, newspaper_id: e.target.value })} required className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                                        <option value="">Select...</option>
                                        {newspapers.map(n => <option key={n.id} value={n.id}>{n.name} (â‚¹{Number(n.base_price).toFixed(2)})</option>)}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                                    <select value={subForm.subscription_type} onChange={e => setSubForm({ ...subForm, subscription_type: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Qty</label>
                                    <input type="number" min="1" value={subForm.quantity} onChange={e => setSubForm({ ...subForm, quantity: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                                </div>
                                <div className="w-28">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Price</label>
                                    <input type="number" step="0.01" value={subForm.price} onChange={e => setSubForm({ ...subForm, price: e.target.value })} placeholder="Base" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                                </div>
                                <button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* â”€â”€ CUSTOMERS â”€â”€ */}
                {activeTab === 'customers' && (
                    filteredCustomers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No customers found</p>
                            <p className="text-slate-400 text-sm mt-1">Click "Add" to register a new customer</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                    <th className="px-6 py-3 font-semibold text-slate-600">Name</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600">Phone</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600">Address</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3.5 flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg"><Users className="w-4 h-4 text-emerald-600" /></div>
                                            {editId === customer.id ? (
                                                <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="border border-emerald-300 rounded-lg px-2 py-1 text-sm w-36" />
                                            ) : (
                                                <span className="font-medium text-slate-800">{customer.name}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-600">
                                            {editId === customer.id ? (
                                                <input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="border border-emerald-300 rounded-lg px-2 py-1 text-sm w-32" />
                                            ) : (customer.phone || '-')}
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-500">
                                            {editId === customer.id ? (
                                                <input value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="border border-emerald-300 rounded-lg px-2 py-1 text-sm w-44" />
                                            ) : (
                                                <span className="max-w-xs truncate block">{customer.address || '-'}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            {editId === customer.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={saveEditCustomer} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700">Save</button>
                                                    <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => startEditCustomer(customer)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => deleteCustomer(customer.id, customer.name)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}

                {/* â”€â”€ SUBSCRIPTIONS â”€â”€ */}
                {activeTab === 'subscriptions' && (
                    filteredSubs.length === 0 ? (
                        <div className="p-12 text-center">
                            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No subscriptions found</p>
                            <p className="text-slate-400 text-sm mt-1">Click "Add" to create a subscription</p>
                        </div>
                    ) : (
                        <>
                            <div className="mx-6 mt-4 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                                <span className="mt-0.5 shrink-0">â„¹ï¸</span>
                                <div><span className="font-semibold">Billing model: </span>Monthly = (price Ã— qty Ã— days) + service charge &nbsp;|&nbsp; Yearly = (price Ã— qty Ã— days), no service charge</div>
                            </div>
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-3 font-semibold text-slate-600">Customer</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Newspaper</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-center">Type</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-center">Qty</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">Price/day</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">Est. Monthly</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-center">Status</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubs.map((sub) => {
                                        const paper = newspapers.find(n => n.id === sub.newspaper_id);
                                        const dailyPrice = sub.price ? Number(sub.price) : (paper ? Number(paper.base_price) : 0);
                                        const estMonthly = dailyPrice * sub.quantity * 30;
                                        const isYearly = sub.subscription_type === 'yearly';
                                        return (
                                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3.5 flex items-center gap-3">
                                                    <div className="p-2 bg-amber-100 rounded-lg"><BookOpen className="w-4 h-4 text-amber-600" /></div>
                                                    <span className="font-medium text-slate-800">{sub.customer_name || '-'}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-600">{sub.newspaper_name || '-'}</td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            sub.subscription_type === 'daily' ? 'bg-blue-100 text-blue-700' :
                                                            sub.subscription_type === 'weekly' ? 'bg-purple-100 text-purple-700' :
                                                            sub.subscription_type === 'monthly' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>{sub.subscription_type || 'daily'}</span>
                                                        {isYearly && <span className="text-[10px] text-green-600 font-medium">No service charge</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-center text-slate-700 font-medium">{sub.quantity}</td>
                                                <td className="px-6 py-3.5 text-right text-slate-700">â‚¹{dailyPrice.toFixed(2)}</td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <span className="font-semibold text-slate-800">â‚¹{estMonthly.toFixed(0)}</span>
                                                    <span className="text-[10px] text-slate-400 block">/month est.</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <button onClick={() => toggleSubStatus(sub)} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                                        sub.status === 1 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                    }`}>{sub.status === 1 ? 'Active' : 'Paused'}</button>
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <button onClick={() => deleteSub(sub.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )
                )}

                {/* â”€â”€ STOCK â”€â”€ */}
                {activeTab === 'stock' && (
                    stockLoading ? (
                        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                    ) : newspapers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No newspapers configured</p>
                            <p className="text-slate-400 text-sm mt-1">Add newspapers first to manage stock</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                    <th className="px-6 py-3 font-semibold text-slate-600">Newspaper</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600 w-44">Taken</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600 w-44">Returned</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600 w-28 text-right">Sold</th>
                                    <th className="px-6 py-3 font-semibold text-slate-600 w-36 text-right">Income</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {newspapers.map(paper => {
                                    const s = stock[paper.id] || { taken: 0, returned: 0 };
                                    const sold = Math.max(0, (s.taken || 0) - (s.returned || 0));
                                    const income = sold * Number(paper.base_price);
                                    return (
                                        <tr key={paper.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg"><Package className="w-4 h-4 text-blue-600" /></div>
                                                    <div>
                                                        <span className="font-medium text-slate-800">{paper.name}</span>
                                                        <div className="text-xs text-slate-400">â‚¹{Number(paper.base_price).toFixed(2)}/copy</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <input type="number" min="0" value={s.taken || ''} onChange={e => handleStockInput(paper.id, 'taken', e.target.value)} placeholder="0" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <input type="number" min="0" value={s.returned || ''} onChange={e => handleStockInput(paper.id, 'returned', e.target.value)} placeholder="0" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                            </td>
                                            <td className="px-6 py-3.5 text-right"><span className={`font-bold text-lg ${sold > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{sold}</span></td>
                                            <td className="px-6 py-3.5 text-right"><span className={`font-semibold text-lg ${income > 0 ? 'text-blue-600' : 'text-slate-400'}`}>â‚¹{income.toFixed(2)}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gradient-to-r from-blue-50 to-emerald-50 border-t-2 border-blue-200">
                                    <td colSpan="4" className="px-6 py-4 text-right"><span className="text-lg font-bold text-slate-700">Total Income:</span></td>
                                    <td className="px-6 py-4 text-right"><span className="text-2xl font-bold text-emerald-600">â‚¹{stockTotalIncome.toFixed(2)}</span></td>
                                </tr>
                            </tfoot>
                        </table>
                    )
                )}

                {/* â”€â”€ WORKERS â”€â”€ */}
                {activeTab === 'workers' && (
                    <div>
                        {/* Worker sub-tabs */}
                        <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-slate-100">
                            <button
                                onClick={() => { setWorkerSubTab('list'); setShowForm(false); }}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                    workerSubTab === 'list' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Worker List
                            </button>
                            <button
                                onClick={() => { setWorkerSubTab('ledger'); setShowForm(false); loadLedger(); }}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                    workerSubTab === 'ledger' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Daily Ledger
                            </button>
                        </div>

                        {/* Add worker form */}
                        {workerSubTab === 'list' && showForm && (
                            <form onSubmit={addWorker} className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-end gap-4 flex-wrap">
                                <div className="flex-1 min-w-40">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                                    <input value={workerForm.username} onChange={e => setWorkerForm(p => ({ ...p, username: e.target.value }))} required placeholder="e.g. worker_ravi"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="flex-1 min-w-40">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                                    <input type="password" value={workerForm.password} onChange={e => setWorkerForm(p => ({ ...p, password: e.target.value }))} required minLength={6} placeholder="Min 6 characters"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <button type="submit" disabled={submitting}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
                                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create Worker
                                </button>
                            </form>
                        )}

                        {/* Worker list */}
                        {workerSubTab === 'list' && (
                            workers.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">No workers yet</p>
                                    <p className="text-sm mt-1">Click "Add Worker" to create the first delivery worker</p>
                                </div>
                            ) : (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {workers.map(w => {
                                        const s = workerSummaries[w.id];
                                        return (
                                            <div key={w.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base uppercase flex-shrink-0">
                                                            {w.username[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 text-sm">{w.username}</p>
                                                            <p className="text-xs text-slate-400">Delivery Worker</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => deleteWorker(w.id, w.username)} title="Delete worker"
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                                                        <p className="text-xs text-slate-400">Papers Taken</p>
                                                        <p className="font-bold text-slate-700 mt-0.5 text-xl">{s?.total_taken ?? 0}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                                                        <p className="text-xs text-slate-400">Returned</p>
                                                        <p className="font-bold text-slate-700 mt-0.5 text-xl">{s?.total_returned ?? 0}</p>
                                                    </div>
                                                    <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                                                        <p className="text-xs text-emerald-600">Sold</p>
                                                        <p className="font-bold text-emerald-700 mt-0.5 text-xl">{s?.total_sold ?? 0}</p>
                                                    </div>
                                                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
                                                        <p className="text-xs text-amber-600">Amount Given</p>
                                                        <p className="font-bold text-amber-700 mt-0.5 text-xl">â‚¹{(s?.total_amount_given ?? 0).toFixed(0)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* Daily ledger */}
                        {workerSubTab === 'ledger' && (
                            ledgerLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                            ) : workers.length === 0 || newspapers.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">{workers.length === 0 ? 'No workers yet' : 'No newspapers configured'}</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Worker</th>
                                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Newspaper</th>
                                                <th className="text-center px-3 py-3 font-semibold text-slate-600">Taken</th>
                                                <th className="text-center px-3 py-3 font-semibold text-slate-600">Returned</th>
                                                <th className="text-center px-3 py-3 font-semibold text-emerald-700">Sold</th>
                                                <th className="text-center px-3 py-3 font-semibold text-amber-700">Amount Given (â‚¹)</th>
                                                <th className="w-20"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {workers.flatMap(w =>
                                                newspapers.map(p => {
                                                    const key = `${w.id}_${p.id}`;
                                                    const entry = ledgerEntries[key] || { taken: 0, returned: 0, amount_given: 0, sold: 0 };
                                                    const sold = Math.max(0, (entry.taken || 0) - (entry.returned || 0));
                                                    return (
                                                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">{w.username[0]}</div>
                                                                    <span className="font-medium text-slate-700">{w.username}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-slate-600 font-medium">{p.name}</td>
                                                            <td className="px-3 py-2.5">
                                                                <input type="number" min="0" value={entry.taken || 0}
                                                                    onChange={e => updateLedgerField(w.id, p.id, 'taken', e.target.value)}
                                                                    className="w-20 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400 outline-none block mx-auto" />
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <input type="number" min="0" value={entry.returned || 0}
                                                                    onChange={e => updateLedgerField(w.id, p.id, 'returned', e.target.value)}
                                                                    className="w-20 text-center bg-white border border-orange-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-400 outline-none block mx-auto" />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className={`text-base font-bold ${sold > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{sold}</span>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <input type="number" min="0" step="0.01" value={entry.amount_given || 0}
                                                                    onChange={e => updateLedgerField(w.id, p.id, 'amount_given', e.target.value)}
                                                                    className="w-24 text-center bg-white border border-amber-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-400 outline-none block mx-auto" />
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <button onClick={() => saveLedgerRow(w.id, p.id)} disabled={savingRows[key]}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
                                                                    {savingRows[key] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
