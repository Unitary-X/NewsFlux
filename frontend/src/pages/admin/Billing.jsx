import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Loader2, FileText, IndianRupee, CheckCircle2, Clock, Search } from 'lucide-react';

export default function Billing() {
    const { t } = useTranslation();
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [newspapers, setNewspapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    
    // Default form states
    const now = new Date();
    const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
    const [genYear, setGenYear] = useState(now.getFullYear());
    const [deliveryFee, setDeliveryFee] = useState(0);

    // Custom single-bill states
    const [manualCustomerId, setManualCustomerId] = useState('');
    const [manualPaperName, setManualPaperName] = useState('');
    const [manualPaperPrice, setManualPaperPrice] = useState(0);

    const fetchData = async () => {
        try {
            const [invRes, custRes, newsRes] = await Promise.all([
                api.get('/admin/invoices'),
                api.get('/admin/customers'),
                api.get('/admin/newspapers')
            ]);
            setInvoices(invRes.data);
            setCustomers(custRes.data);
            setNewspapers(newsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoicesOnly = async () => {
        try {
            const res = await api.get('/admin/invoices');
            setInvoices(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const generateBills = async () => {
        setGenerating(true);
        try {
            const payload = {
                month: genMonth,
                year: genYear,
                delivery_fee: parseFloat(deliveryFee) || 0,
            };
            if (manualCustomerId) payload.customer_id = manualCustomerId;
            if (manualPaperName) payload.paper_name = manualPaperName;
            if (manualPaperPrice) payload.paper_price = parseFloat(manualPaperPrice) || 0;

            const res = await api.post('/admin/billing/generate', payload);
            alert(`Generated ${res.data.generated} invoice(s)`);
            fetchInvoicesOnly();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to generate bills');
        } finally {
            setGenerating(false);
        }
    };

    const markPaid = async (id) => {
        try {
            await api.put(`/admin/invoices/${id}/pay`);
            fetchInvoicesOnly();
        } catch (err) {
            alert(t('billing.update_fail') || 'Failed to update invoice');
        }
    };

    const filtered = invoices.filter(inv => {
        const q = search.toLowerCase();
        const matchSearch = (inv.customer_name || '').toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const totalPending = invoices.filter(i => i.status === 'pending').reduce((a, i) => a + i.total_amount, 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.total_amount, 0);

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('billing.title')}</h1>
                <p className="text-slate-500 mt-2">{t('billing.subtitle')}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><FileText className="w-5 h-5 text-blue-600" /></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
                        <p className="text-sm text-slate-500">{t('billing.total_invoices')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-2.5 bg-amber-50 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
                    <div>
                        <p className="text-2xl font-bold text-amber-600">₹{totalPending.toLocaleString()}</p>
                        <p className="text-sm text-slate-500">{t('billing.pending_amount')}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-50 rounded-xl"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</p>
                        <p className="text-sm text-slate-500">{t('billing.collected')}</p>
                    </div>
                </div>
            </div>

            {/* Generate Bills */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-amber-500" /> {t('billing.generate_bills')}
                </h2>
                
                {/* Custom Configuration line */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-100">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Name (Optional)</label>
                        <select value={manualCustomerId} onChange={e => setManualCustomerId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">All Customers (Batch Generate)</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Paper Name (Optional)</label>
                        <select 
                            value={manualPaperName} 
                            onChange={e => {
                                setManualPaperName(e.target.value);
                                const found = newspapers.find(n => n.name === e.target.value);
                                if (found) setManualPaperPrice(found.base_price);
                            }} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">None (Use Subscriptions)</option>
                            {newspapers.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Paper Price (₹)</label>
                        <input type="number" step="0.01" value={manualPaperPrice} disabled={!manualPaperName} onChange={e => setManualPaperPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50" />
                    </div>
                </div>

                {/* Base Configuration line */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{t('billing.month')}</label>
                        <select value={genMonth} onChange={e => setGenMonth(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">{t('billing.year')}</label>
                        <input type="number" value={genYear} onChange={e => setGenYear(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Service Charge (₹)</label>
                        <input type="number" step="0.01" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                    <button onClick={generateBills} disabled={generating} className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('billing.generate')}
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-3">{t('billing.generate_info')}</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search_placeholder')} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {['all', 'pending', 'paid'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filterStatus === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {s === 'all' ? t('billing.all_statuses') : (s === 'pending' ? t('billing.status_pending') : t('billing.status_paid'))}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">{t('billing.no_invoices')}</div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                <th className="px-6 py-4 font-semibold text-slate-600">Customer Name</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Paper Name</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Paper Price</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Total Amount</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{inv.customer_name}</td>
                                    <td className="px-6 py-4 text-slate-600 text-sm">{inv.newspapers || 'None'}</td>
                                    <td className="px-6 py-4 text-right text-slate-500">{inv.manual_paper_price !== null ? `₹${inv.manual_paper_price}` : '-'}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">₹{inv.total_amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {inv.status === 'paid' ? t('billing.status_paid') : t('billing.status_pending')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {inv.status === 'pending' && (
                                            <button onClick={() => markPaid(inv.id)} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 font-medium">
                                                {t('billing.mark_paid')}
                                            </button>
                                        )}
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
