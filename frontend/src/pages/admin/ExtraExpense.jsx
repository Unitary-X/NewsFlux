import React, { useState, useEffect } from 'react';
import { Package, Trash2, Plus, Calendar, Save, Loader2 } from 'lucide-react';
import api from '../../utils/api';

export default function ExtraExpense() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Extra Expense calculator
    const [expenseRows, setExpenseRows] = useState([
        { id: Date.now(), area: '', packages: 0, costPerPackage: 0 },
    ]);

    useEffect(() => {
        fetchData();
    }, [date]); // eslint-disable-line

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/extra-expense/${date}`);
            if (res.data && res.data.length > 0) {
                setExpenseRows(res.data.map(r => ({
                    id: r.id || Date.now() + Math.random(),
                    area: r.area || '',
                    packages: r.packages || 0,
                    costPerPackage: r.cost_per_package || 0
                })));
            } else {
                setExpenseRows([{ id: Date.now(), area: '', packages: 0, costPerPackage: 0 }]);
            }
        } catch (err) {
            console.error('Failed to load extra expenses', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/admin/extra-expense', {
                date,
                entries: expenseRows.map(r => ({
                    area: r.area,
                    packages: r.packages || 0,
                    cost_per_package: r.costPerPackage || 0
                }))
            });
            alert('Extra expenses saved successfully!');
        } catch (err) {
            alert('Failed to save extra expenses.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 lg:px-0 space-y-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                            <Package className="w-8 h-8" />
                        </div>
                        Extra Expense Ledger
                    </h1>
                    <p className="text-slate-500 mt-2 ml-14">Record additional expenses for delivery areas per day.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none text-slate-700 shadow-sm" 
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-lg font-medium transition-all shadow-sm disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Ledger
                    </button>
                </div>
            </div>

            {/* Extra Expense Calculator */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Calculator</h2>
                    <button
                        disabled={loading}
                        onClick={() => setExpenseRows(prev => [...prev, { id: Date.now(), area: '', packages: 0, costPerPackage: 0 }])}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-60"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Row
                    </button>
                </div>
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                    </div>
                ) : (
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                            <th className="px-6 py-3 font-semibold text-slate-600">Area</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-right">No. of Packages</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-right">Cost per Package (₹)</th>
                            <th className="px-6 py-3 font-semibold text-slate-600 text-right">Total (₹)</th>
                            <th className="px-6 py-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {expenseRows.map((row, idx) => {
                            const rowTotal = (row.packages || 0) * (row.costPerPackage || 0);
                            return (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3">
                                        <input
                                            type="text"
                                            value={row.area}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, area: val } : r));
                                            }}
                                            placeholder="e.g. North Zone"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-all placeholder:text-slate-300"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            value={row.packages || ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, packages: val } : r));
                                            }}
                                            placeholder="0"
                                            className="w-28 text-right bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none transition-all block ml-auto"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={row.costPerPackage || ''}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setExpenseRows(prev => prev.map((r, i) => i === idx ? { ...r, costPerPackage: val } : r));
                                            }}
                                            placeholder="0.00"
                                            className="w-28 text-right bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none transition-all block ml-auto"
                                        />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className={`text-base font-bold ${rowTotal > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                            ₹{rowTotal.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {expenseRows.length > 1 && (
                                            <button
                                                onClick={() => setExpenseRows(prev => prev.filter((_, i) => i !== idx))}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove row"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Grand total row */}
                        <tr className="bg-rose-50 font-bold border-t-2 border-rose-200">
                            <td className="px-6 py-3 text-slate-800" colSpan="3">Grand Total</td>
                            <td className="px-6 py-3 text-right text-rose-700 text-lg">
                                ₹{expenseRows.reduce((sum, r) => sum + (r.packages || 0) * (r.costPerPackage || 0), 0).toFixed(2)}
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                )}
            </div>
        </div>
    );
}
