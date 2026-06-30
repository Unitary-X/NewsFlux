import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Save, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '../../components/Skeleton';

export default function DailyStockLedger() {
    const [newspapers, setNewspapers] = useState([]);
    const [stock, setStock] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Editable breakdown state
    const [breakdown, setBreakdown] = useState({ daily: 0, monthly: 0, yearly: 0 });

    // Auto-save state
    const [autoSaveStatus, setAutoSaveStatus] = useState(''); 
    const initialRender = useRef(true);

    useEffect(() => {
        fetchData();
    }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        if (isLoading || newspapers.length === 0) return;

        const timer = setTimeout(() => {
            saveAll(true);
        }, 1500);

        return () => clearTimeout(timer);
    }, [stock]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [papersRes, stockRes] = await Promise.all([
                api.get('/admin/newspapers'),
                api.get(`/admin/stock/${date}`)
            ]);
 
            setNewspapers(papersRes.data);

            const stockMap = {};
            stockRes.data.forEach(s => {
                stockMap[s.newspaper_id] = { taken: s.taken, returned: s.returned };
            });
            setStock(stockMap);

            // Recalculate breakdown from paper types
            recalcBreakdown(papersRes.data, stockMap);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Recalculate breakdown from the current stock values and paper types
    const recalcBreakdown = (papers, currentStock) => {
        let daily = 0, monthly = 0, yearly = 0;
        papers.forEach(paper => {
            const taken = (currentStock[paper.id]?.taken) || 0;
            const type = paper.paper_type || 'daily';
            if (type === 'daily') daily += taken;
            else if (type === 'monthly') monthly += taken;
            else if (type === 'yearly') yearly += taken;
        });
        setBreakdown({ daily, monthly, yearly });
    };

    const handleInputChange = (paperId, field, value) => {
        const val = parseInt(value) || 0;
        const newStock = {
            ...stock,
            [paperId]: {
                ...stock[paperId],
                [field]: val
            }
        };
        setStock(newStock);
        // Also recalculate breakdown totals
        recalcBreakdown(newspapers, newStock);
    };

    // Handle direct edits to the breakdown cards
    const handleBreakdownChange = (type, value) => {
        const val = parseInt(value) || 0;
        setBreakdown(prev => ({ ...prev, [type]: val }));
    };

    const saveStock = async () => {
        setIsSaving(true);
        try {
            const promises = newspapers.map(paper => {
                const entry = stock[paper.id] || { taken: 0, returned: 0 };
                return api.post('/admin/stock', {
                    date: date,
                    newspaper_id: paper.id,
                    taken: entry.taken || 0,
                    returned: entry.returned || 0
                });
            });

            await Promise.all(promises);
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };
 
    const saveAll = async (isSilent = false) => {
        setAutoSaveStatus('saving');

        setIsSaving(true);
        try {
            await saveStock();
            setAutoSaveStatus('saved');
            if (!isSilent) alert('All ledger stock saved successfully!');
            setTimeout(() => setAutoSaveStatus(''), 3000);
        } catch (err) {
            setAutoSaveStatus('error');
            if (!isSilent) alert('Failed to save ledger stock.');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate totals from table data
    const tableTotalTaken = newspapers.reduce((sum, paper) => {
        return sum + ((stock[paper.id]?.taken) || 0);
    }, 0);

    const totalIncome = newspapers.reduce((sum, paper) => {
        const s = stock[paper.id] || { taken: 0, returned: 0 };
        const sold = Math.max(0, (s.taken || 0) - (s.returned || 0));
        return sum + sold * Number(paper.base_price);
    }, 0);

    const dailyIncome = newspapers.reduce((sum, paper) => {
        if ((paper.paper_type || 'daily') !== 'daily') return sum;
        const s = stock[paper.id] || { taken: 0, returned: 0 };
        const sold = Math.max(0, (s.taken || 0) - (s.returned || 0));
        return sum + sold * Number(paper.base_price);
    }, 0);

    const totalReturnLoss = newspapers.reduce((sum, paper) => {
        const s = stock[paper.id] || { taken: 0, returned: 0 };
        const returned = s.returned || 0;
        return sum + returned * Number(paper.base_price);
    }, 0);

    const dailyProfit = totalIncome - totalReturnLoss;

    // Validation: daily + monthly + yearly must equal total taken
    const breakdownSum = breakdown.daily + breakdown.monthly + breakdown.yearly;
    const isBalanced = breakdownSum === tableTotalTaken;

    if (isLoading) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="max-w-6xl mx-auto px-4 lg:px-0 space-y-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Daily Stock Ledger</h1>
                    <p className="text-slate-500 mt-2">Manage physical newspaper inventory assignments for the agency.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-700 bg-white"
                        />
                    </div>

                    <button
                        onClick={() => saveAll()}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-70"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Stock
                    </button>
                    {autoSaveStatus === 'saved' && <span className="text-sm font-bold text-emerald-600 ml-2 absolute -right-20">Saved</span>}
                    {autoSaveStatus === 'saving' && <span className="text-sm font-mono text-slate-400 ml-2 flex items-center gap-1 absolute -right-[88px]"><Loader2 className="w-3 h-3 animate-spin"/> Saving</span>}
                </div>
            </div>

            {/* Editable Breakdown Cards */}
            {!isLoading && newspapers.length > 0 && (
                <div className="mb-6 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Taken (read-only, auto-calculated) */}
                        <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Taken</div>
                            <div className="text-3xl font-black text-slate-800">{tableTotalTaken}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Auto-calculated from table</div>
                        </div>

                        {/* Daily Taken (editable) */}
                        <div className={`bg-white p-4 rounded-xl border-2 shadow-sm transition-all ${!isBalanced ? 'border-amber-400 bg-amber-50/30' : 'border-sky-300'}`}>
                            <label className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1 block">Daily Taken</label>
                            <input
                                type="number"
                                min="0"
                                value={breakdown.daily || ''}
                                onChange={(e) => handleBreakdownChange('daily', e.target.value)}
                                placeholder="0"
                                className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-sky-200 focus:border-sky-500 outline-none py-1 transition-colors"
                            />
                        </div>

                        {/* Monthly Taken (editable) */}
                        <div className={`bg-white p-4 rounded-xl border-2 shadow-sm transition-all ${!isBalanced ? 'border-amber-400 bg-amber-50/30' : 'border-indigo-300'}`}>
                            <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1 block">Monthly Taken</label>
                            <input
                                type="number"
                                min="0"
                                value={breakdown.monthly || ''}
                                onChange={(e) => handleBreakdownChange('monthly', e.target.value)}
                                placeholder="0"
                                className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-indigo-200 focus:border-indigo-500 outline-none py-1 transition-colors"
                            />
                        </div>

                        {/* Yearly Taken (editable) */}
                        <div className={`bg-white p-4 rounded-xl border-2 shadow-sm transition-all ${!isBalanced ? 'border-amber-400 bg-amber-50/30' : 'border-emerald-300'}`}>
                            <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1 block">Yearly Taken</label>
                            <input
                                type="number"
                                min="0"
                                value={breakdown.yearly || ''}
                                onChange={(e) => handleBreakdownChange('yearly', e.target.value)}
                                placeholder="0"
                                className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-emerald-200 focus:border-emerald-500 outline-none py-1 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Validation message */}
                    {!isBalanced && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-700 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>
                                Daily ({breakdown.daily}) + Monthly ({breakdown.monthly}) + Yearly ({breakdown.yearly}) = <strong>{breakdownSum}</strong> — does not match Total Taken (<strong>{tableTotalTaken}</strong>). Difference: <strong>{Math.abs(breakdownSum - tableTotalTaken)}</strong>
                            </span>
                        </div>
                    )}
                    {isBalanced && tableTotalTaken > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-700 text-sm font-medium">
                            <span>✓ Breakdown totals match: Daily ({breakdown.daily}) + Monthly ({breakdown.monthly}) + Yearly ({breakdown.yearly}) = {tableTotalTaken}</span>
                        </div>
                    )}
                </div>
            )}

            <div id="stock-table-container" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                        <p>Loading inventory payload...</p>
                    </div>
                ) : newspapers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <p>No newspapers configured for this agency yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm">Newspaper Title</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-48">Quantity Taken</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-48">Quantity Returned</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm hidden md:table-cell text-right">Sold (Net)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-40 text-right">Income</th>
                                    <th className="px-6 py-4 font-semibold text-red-600 tracking-wide text-sm w-40 text-right">Return Loss</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {newspapers.map(paper => {
                                    const currentStock = stock[paper.id] || { taken: 0, returned: 0 };
                                    const sold = Math.max(0, (currentStock.taken || 0) - (currentStock.returned || 0));
                                    const income = sold * Number(paper.base_price);

                                    return (
                                        <tr key={paper.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-800">{paper.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{paper.paper_type || 'daily'}</span>
                                                    <span className="text-xs text-slate-400">₹{Number(paper.base_price).toFixed(2)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={currentStock.taken || ''}
                                                    onChange={(e) => handleInputChange(paper.id, 'taken', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={currentStock.returned || ''}
                                                    onChange={(e) => handleInputChange(paper.id, 'returned', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right hidden md:table-cell">
                                                <span className={`inline-flex items-center justify-center font-bold text-lg ${sold > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {sold}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center justify-center font-semibold text-lg ${income > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                    ₹{income.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(() => {
                                                    const returnLoss = (currentStock.returned || 0) * Number(paper.base_price);
                                                    return (
                                                        <span className={`inline-flex items-center justify-center font-semibold text-lg ${returnLoss > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                            ₹{returnLoss.toFixed(2)}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50 border-t-2 border-slate-200">
                                    <td colSpan="5" className="px-6 py-3 text-right">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Daily Generated Income:</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="font-bold text-sky-600">
                                            ₹{dailyIncome.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="bg-gradient-to-r from-blue-50 to-emerald-50 border-t border-blue-200">
                                    <td colSpan="5" className="px-6 py-4 text-right">
                                        <span className="text-lg font-bold text-slate-700 uppercase tracking-wide">Total Income:</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center justify-center text-2xl font-black text-emerald-600">
                                            ₹{totalIncome.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="bg-gradient-to-r from-red-50 to-orange-50 border-t border-red-200">
                                    <td colSpan="5" className="px-6 py-3 text-right">
                                        <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Total Return Loss:</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="font-bold text-red-500 text-lg">
                                            -₹{totalReturnLoss.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-300">
                                    <td colSpan="5" className="px-6 py-4 text-right">
                                        <span className="text-lg font-black text-slate-800 uppercase tracking-wide">Daily Profit:</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center justify-center text-2xl font-black ${dailyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {dailyProfit >= 0 ? '₹' : '-₹'}{Math.abs(dailyProfit).toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
