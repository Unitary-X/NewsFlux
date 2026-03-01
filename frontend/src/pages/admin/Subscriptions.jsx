import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Loader2, Plus, Trash2, Search, BookOpen } from 'lucide-react';

export default function Subscriptions() {
    const [subs, setSubs] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ customer_id: '', newspaper_id: '', quantity: 1, price: '' });

    const fetchAll = async () => {
        try {
            const [subsRes, custRes, paperRes] = await Promise.all([
                api.get('/admin/subscriptions'),
                api.get('/admin/customers'),
                api.get('/admin/newspapers'),
            ]);
            setSubs(subsRes.data);
            setCustomers(custRes.data);
            setNewspapers(paperRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = subs.filter(s => {
        const q = search.toLowerCase();
        return (s.customer_name || '').toLowerCase().includes(q) || (s.newspaper_name || '').toLowerCase().includes(q);
    });

    const createSub = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/subscriptions', {
                customer_id: form.customer_id,
                newspaper_id: form.newspaper_id,
                quantity: parseInt(form.quantity) || 1,
                price: form.price ? parseFloat(form.price) : null,
            });
            setShowForm(false);
            setForm({ customer_id: '', newspaper_id: '', quantity: 1, price: '' });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create subscription');
        }
    };

    const toggleStatus = async (sub) => {
        try {
            await api.put(`/admin/subscriptions/${sub.id}`, {
                status: sub.status === 1 ? 0 : 1,
            });
            fetchAll();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const deleteSub = async (id) => {
        if (!confirm('Delete this subscription?')) return;
        try {
            await api.delete(`/admin/subscriptions/${id}`);
            fetchAll();
        } catch (err) {
            alert('Failed to delete subscription');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Subscriptions</h1>
                    <p className="text-slate-500 mt-2">Assign newspapers to customers with quantities and pricing.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> New Subscription
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> New Subscription</h2>
                    <form onSubmit={createSub} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Customer</label>
                            <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Select...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Newspaper</label>
                            <select value={form.newspaper_id} onChange={e => setForm({ ...form, newspaper_id: e.target.value })} required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Select...</option>
                                {newspapers.map(n => <option key={n.id} value={n.id}>{n.name} (₹{Number(n.base_price).toFixed(2)})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Quantity</label>
                            <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Custom Price (optional)</label>
                            <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Uses base price" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors">Create</button>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or newspaper..." className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">No subscriptions found. Create one to get started.</div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                <th className="px-6 py-4 font-semibold text-slate-600">Customer</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Newspaper</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-center">Qty</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Price</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(sub => (
                                <tr key={sub.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{sub.customer_name}</td>
                                    <td className="px-6 py-4 text-slate-600">{sub.newspaper_name}</td>
                                    <td className="px-6 py-4 text-center text-slate-700">{sub.quantity}</td>
                                    <td className="px-6 py-4 text-right text-slate-700">{sub.price ? `₹${Number(sub.price).toFixed(2)}` : 'Base'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggleStatus(sub)} className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                            {sub.status === 1 ? 'Active' : 'Paused'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteSub(sub.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
