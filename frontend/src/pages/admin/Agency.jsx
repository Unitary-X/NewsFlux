import React, { useState, useEffect } from 'react';
import { Users, UserSquare2, BookOpen, Plus, Search, Loader2, RefreshCw, Trash2, X, Pencil } from 'lucide-react';
import api from '../../utils/api';

export default function Agency() {
    const [workers, setWorkers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('workers');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Forms
    const [workerForm, setWorkerForm] = useState({ username: '', password: '' });
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '' });
    const [subForm, setSubForm] = useState({ customer_id: '', newspaper_id: '', quantity: 1, price: '', subscription_type: 'daily' });

    // Edit state
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({});

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [workersRes, customersRes, subscriptionsRes, newspapersRes] = await Promise.all([
                api.get('/admin/workers'),
                api.get('/admin/customers'),
                api.get('/admin/subscriptions'),
                api.get('/admin/newspapers'),
            ]);
            setWorkers(workersRes.data);
            setCustomers(customersRes.data);
            setSubscriptions(subscriptionsRes.data);
            setNewspapers(newspapersRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Create handlers ---
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

    // --- Delete handlers ---
    const deleteWorker = async (id, name) => {
        if (!confirm(`Delete worker "${name}"?`)) return;
        try { await api.delete(`/admin/workers/${id}`); loadData(); } catch { alert('Failed to delete'); }
    };
    const deleteCustomer = async (id, name) => {
        if (!confirm(`Delete "${name}"? Subscriptions & invoices will also be removed.`)) return;
        try { await api.delete(`/admin/customers/${id}`); loadData(); } catch { alert('Failed to delete'); }
    };
    const deleteSub = async (id) => {
        if (!confirm('Delete this subscription?')) return;
        try { await api.delete(`/admin/subscriptions/${id}`); loadData(); } catch { alert('Failed to delete'); }
    };

    // --- Edit handlers ---
    const startEditWorker = (w) => { setEditId(w.id); setEditData({ username: w.username, password: '' }); };
    const startEditCustomer = (c) => { setEditId(c.id); setEditData({ name: c.name, phone: c.phone || '', address: c.address || '' }); };

    const saveEditWorker = async () => {
        try {
            const payload = { username: editData.username };
            if (editData.password) payload.password = editData.password;
            await api.put(`/admin/workers/${editId}`, payload);
            setEditId(null); loadData();
        } catch { alert('Failed to update'); }
    };
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

    // --- Filtering ---
    const filteredWorkers = workers.filter(w => w.username.toLowerCase().includes(search.toLowerCase()));
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search));
    const filteredSubs = subscriptions.filter(s => (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) || (s.newspaper_name || '').toLowerCase().includes(search.toLowerCase()));

    const tabs = [
        { id: 'workers', label: 'Workers', icon: UserSquare2, count: workers.length, color: 'indigo' },
        { id: 'customers', label: 'Customers', icon: Users, count: customers.length, color: 'emerald' },
        { id: 'subscriptions', label: 'Subscriptions', icon: BookOpen, count: subscriptions.length, color: 'amber' },
    ];

    const colorMap = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', activeBorder: 'border-indigo-500', tabBg: 'bg-indigo-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', activeBorder: 'border-emerald-500', tabBg: 'bg-emerald-600' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', activeBorder: 'border-amber-500', tabBg: 'bg-amber-600' },
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    const currentTab = tabs.find(t => t.id === activeTab);
    const currentColor = colorMap[currentTab?.color || 'indigo'];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Agency Overview</h1>
                    <p className="text-slate-500 mt-2">Manage your workers, customers and subscriptions</p>
                </div>
                <button onClick={loadData} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        </button>
                    );
                })}
            </div>

            {/* Sub Menu Bar */}
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
                                        isActive
                                            ? `${c.activeBorder} ${c.text}`
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
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
                    <div className="flex items-center gap-2 pr-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-44"
                            />
                        </div>
                        <button
                            onClick={() => { setShowForm(!showForm); setEditId(null); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                showForm
                                    ? 'bg-slate-200 text-slate-700'
                                    : `${currentColor.tabBg} text-white hover:opacity-90`
                            }`}
                        >
                            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {showForm ? 'Cancel' : 'Add'}
                        </button>
                    </div>
                </div>

                {/* Inline Add Form */}
                {showForm && (
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                        {activeTab === 'workers' && (
                            <form onSubmit={addWorker} className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                                    <input value={workerForm.username} onChange={e => setWorkerForm({ ...workerForm, username: e.target.value })} required placeholder="e.g. worker_route1" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                                    <input type="password" value={workerForm.password} onChange={e => setWorkerForm({ ...workerForm, password: e.target.value })} required placeholder="Temporary password" autoComplete="new-password" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Worker'}
                                </button>
                            </form>
                        )}
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
                                        {newspapers.map(n => <option key={n.id} value={n.id}>{n.name} (₹{Number(n.base_price).toFixed(2)})</option>)}
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

                {/* Table Content */}
                <div>
                    {activeTab === 'workers' && (
                        filteredWorkers.length === 0 ? (
                            <div className="p-12 text-center">
                                <UserSquare2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No workers found</p>
                                <p className="text-slate-400 text-sm mt-1">Click "Add" to create a new worker</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-3 font-semibold text-slate-600">Username</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Role</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredWorkers.map((worker) => (
                                        <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3.5 flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 rounded-lg">
                                                    <UserSquare2 className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                {editId === worker.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value })} className="border border-indigo-300 rounded-lg px-2 py-1 text-sm w-36" />
                                                        <input type="password" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} placeholder="New pwd" className="border border-indigo-300 rounded-lg px-2 py-1 text-sm w-28" />
                                                    </div>
                                                ) : (
                                                    <span className="font-medium text-slate-800">{worker.username}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">{worker.role}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {editId === worker.id ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={saveEditWorker} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Save</button>
                                                        <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => startEditWorker(worker)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteWorker(worker.id, worker.username)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    )}

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
                                                <div className="p-2 bg-emerald-100 rounded-lg">
                                                    <Users className="w-4 h-4 text-emerald-600" />
                                                </div>
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

                    {activeTab === 'subscriptions' && (
                        filteredSubs.length === 0 ? (
                            <div className="p-12 text-center">
                                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No subscriptions found</p>
                                <p className="text-slate-400 text-sm mt-1">Click "Add" to create a subscription</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-3 font-semibold text-slate-600">Customer</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600">Newspaper</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-center">Type</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-center">Qty</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">Price</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-center">Status</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSubs.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3.5 flex items-center gap-3">
                                                <div className="p-2 bg-amber-100 rounded-lg">
                                                    <BookOpen className="w-4 h-4 text-amber-600" />
                                                </div>
                                                <span className="font-medium text-slate-800">{sub.customer_name || '-'}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-slate-600">{sub.newspaper_name || '-'}</td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    sub.subscription_type === 'daily' ? 'bg-blue-100 text-blue-700' :
                                                    sub.subscription_type === 'weekly' ? 'bg-purple-100 text-purple-700' :
                                                    sub.subscription_type === 'monthly' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>{sub.subscription_type || 'daily'}</span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center text-slate-700 font-medium">{sub.quantity}</td>
                                            <td className="px-6 py-3.5 text-right text-slate-700">{sub.price ? `₹${Number(sub.price).toFixed(2)}` : 'Base'}</td>
                                            <td className="px-6 py-3.5 text-center">
                                                <button onClick={() => toggleSubStatus(sub)} className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                                    sub.status === 1 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                }`}>
                                                    {sub.status === 1 ? 'Active' : 'Paused'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <button onClick={() => deleteSub(sub.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
