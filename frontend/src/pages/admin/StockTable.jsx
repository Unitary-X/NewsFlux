import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Save, Loader2, Calendar, AlertTriangle, User, Plus, Trash2, IndianRupee, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import { TableSkeleton } from '../../components/Skeleton';

export default function StockTable() {
    const [newspapers, setNewspapers] = useState([]);
    const [stock, setStock] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [workers, setWorkers] = useState([]);
    const [workerStock, setWorkerStock] = useState([]);
    const [isSavingWorker, setIsSavingWorker] = useState(false);

    // Inline worker creation
    const [showAddWorker, setShowAddWorker] = useState(false);
    const [newWorker, setNewWorker] = useState({ username: '', role: 'worker', phone: '' });
    const [addingWorker, setAddingWorker] = useState(false);

    // Editable breakdown state
    const [breakdown, setBreakdown] = useState({ daily: 0, monthly: 0, yearly: 0 });

    // Auto-save state
    const [autoSaveStatus, setAutoSaveStatus] = useState(''); 
    const [autoSaveErrors, setAutoSaveErrors] = useState([]);
    const initialRender = useRef(true);

    useEffect(() => {
        fetchData();
    }, [date]);

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
    }, [stock, workerStock]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [papersRes, stockRes, workersRes, workerStockRes] = await Promise.all([
                api.get('/admin/newspapers'),
                api.get(`/admin/stock/${date}`),
                api.get('/admin/workers'),
                api.get(`/admin/workers/stock?target_date=${date}`)
            ]);
 
            setNewspapers(papersRes.data);
            setWorkers(workersRes.data);
            setWorkerStock(workerStockRes.data || []);

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
 
    const handleWorkerStockChange = (index, field, value) => {
        const newWorkerStock = [...workerStock];
        newWorkerStock[index] = {
            ...newWorkerStock[index],
            [field]: field === 'amount_given' ? parseFloat(value) || 0 : parseInt(value) || 0
        };
        setWorkerStock(newWorkerStock);
    };
 
    const addWorkerStockRow = () => {
        if (workers.length === 0 || newspapers.length === 0) return;
        setWorkerStock([...workerStock, {
            worker_id: workers[0].id,
            newspaper_id: newspapers[0].id,
            taken: 0,
            returned: 0,
            amount_given: 0,
            date: date
        }]);
    };
 
    const removeWorkerStockRow = (index) => {
        setWorkerStock(workerStock.filter((_, i) => i !== index));
    };
 
    const saveWorkerStock = async () => {
        setIsSavingWorker(true);
        try {
            const promises = workerStock.map(s => 
                api.post('/admin/workers/stock', {
                    worker_id: s.worker_id,
                    newspaper_id: s.newspaper_id,
                    date: date,
                    taken: s.taken || 0,
                    returned: s.returned || 0,
                    amount_given: s.amount_given || 0
                })
            );
            await Promise.all(promises);
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsSavingWorker(false);
        }
    };
 
    const saveAll = async (isSilent = false) => {
        setAutoSaveStatus('saving');
        setAutoSaveErrors([]);
        
        // Validation checks
        const errors = [];
        
        // 1. Worker returns vs taken
        workerStock.forEach((s, idx) => {
            if (s.returned > s.taken) {
                const w = workers.find(work => work.id === s.worker_id);
                const p = newspapers.find(pap => pap.id === s.newspaper_id);
                errors.push(`Worker ${w?.username || idx+1} returned more '${p?.name}' than taken.`);
            }
        });

        // 2. Total worker taken vs agency stock
        const paperTotals = {};
        workerStock.forEach(s => {
            paperTotals[s.newspaper_id] = (paperTotals[s.newspaper_id] || 0) + s.taken;
        });

        Object.entries(paperTotals).forEach(([pId, total]) => {
            const agencyTaken = (stock[pId]?.taken) || 0;
            if (total > agencyTaken) {
                const p = newspapers.find(pap => pap.id === pId);
                errors.push(`Total assigned '${p?.name}' (${total}) exceeds agency stock (${agencyTaken}).`);
            }
        });

        if (errors.length > 0) {
            setAutoSaveErrors(errors);
            setAutoSaveStatus('error');
            if (!isSilent) {
                alert("Please fix the following issues before saving:\n\n" + errors.join("\n"));
            }
            return;
        }

        setIsSaving(true);
        try {
            await Promise.all([saveStock(), saveWorkerStock()]);
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

    // Validation: daily + monthly + yearly must equal total taken
    const breakdownSum = breakdown.daily + breakdown.monthly + breakdown.yearly;
    const isBalanced = breakdownSum === tableTotalTaken;

    if (isLoading) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="max-w-6xl mx-auto px-4 lg:px-0">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Daily Stock Ledger</h1>
                    <p className="text-slate-500 mt-2">Manage physical newspaper inventory assignments.</p>
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
                        disabled={isSaving || isSavingWorker || isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-70"
                    >
                        {isSaving || isSavingWorker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save All Ledger
                    </button>
                    {autoSaveStatus === 'saved' && <span className="text-sm font-bold text-emerald-600 ml-2 absolute -right-20">Saved</span>}
                    {autoSaveStatus === 'saving' && <span className="text-sm font-mono text-slate-400 ml-2 flex items-center gap-1 absolute -right-[88px]"><Loader2 className="w-3 h-3 animate-spin"/> Saving</span>}
                </div>
            </div>
            
            {/* Display AutoSave Errors explicitly if they exist */}
            {autoSaveErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Failed to auto-save ledger
                    </h3>
                    <ul className="text-xs text-red-500 font-medium pl-6 list-disc">
                        {autoSaveErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>
            )}

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
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50 border-t-2 border-slate-200">
                                    <td colSpan="4" className="px-6 py-3 text-right">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Daily Generated Income:</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="font-bold text-sky-600">
                                            ₹{dailyIncome.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                                <tr className="bg-gradient-to-r from-blue-50 to-emerald-50 border-t border-blue-200">
                                    <td colSpan="4" className="px-6 py-4 text-right">
                                        <span className="text-lg font-bold text-slate-700 uppercase tracking-wide">Total Income:</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center justify-center text-2xl font-black text-emerald-600">
                                            ₹{totalIncome.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
 
            {/* Worker Daily Ledger */}
            <div className="mt-12 mb-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <User className="w-6 h-6 text-blue-500" />
                            Worker Daily Ledger
                        </h2>
                        <p className="text-slate-500 mt-1">Record individual worker assignments and payments.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAddWorker(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showAddWorker ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                            <UserPlus className="w-4 h-4" />
                            {showAddWorker ? 'Cancel' : 'New Worker'}
                        </button>
                        <button
                            onClick={addWorkerStockRow}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Entry
                        </button>
                    </div>
                </div>

                {/* Inline Add Worker Form */}
                {showAddWorker && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-end gap-4 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Worker Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={newWorker.username} onChange={e => setNewWorker(p => ({...p, username: e.target.value}))} required placeholder="Full Name" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select value={newWorker.role} onChange={e => setNewWorker(p => ({...p, role: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none cursor-pointer">
                                    <option value="worker">Delivery Worker</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="tel" value={newWorker.phone} onChange={e => setNewWorker(p => ({...p, phone: e.target.value}))} placeholder="9876543210" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                            </div>
                        </div>
                        <button
                            disabled={addingWorker || !newWorker.username.trim()}
                            onClick={async () => {
                                setAddingWorker(true);
                                try {
                                    await api.post('/admin/workers', newWorker);
                                    setNewWorker({ username: '', role: 'worker', phone: '' });
                                    setShowAddWorker(false);
                                    fetchData();
                                } catch (err) {
                                    alert(err.response?.data?.detail || 'Failed to create worker');
                                } finally { setAddingWorker(false); }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
                        >
                            {addingWorker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create
                        </button>
                    </div>
                )}
 
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm">Worker Name</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm">Newspaper</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-28 text-center bg-blue-50/50">Today</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-24 text-center">MTD</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-24 text-center">YTD</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-32">Returned</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-24 text-center">Sold</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-44">Paid Amount</th>
                                    <th className="px-6 py-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {workerStock.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-8 text-center text-slate-400 italic">
                                            No worker assignments recorded for this date. Click "Add Entry" to start.
                                        </td>
                                    </tr>
                                ) : (
                                    workerStock.map((entry, index) => {
                                        const paper = newspapers.find(p => p.id === entry.newspaper_id);
                                        const sold = Math.max(0, (entry.taken || 0) - (entry.returned || 0));
                                        const isReturnInvalid = entry.returned > entry.taken;

                                        // Calculate if total taken for this paper exceeds agency stock
                                        const totalPaperTaken = workerStock
                                            .filter(s => s.newspaper_id === entry.newspaper_id)
                                            .reduce((sum, s) => sum + (s.taken || 0), 0);
                                        const agencyLimit = (stock[entry.newspaper_id]?.taken) || 0;
                                        const isOverLimit = totalPaperTaken > agencyLimit;
                                        
                                        return (
                                            <tr key={index} className={`transition-colors ${isReturnInvalid ? 'bg-red-50/50' : isOverLimit ? 'bg-amber-50/50' : 'hover:bg-slate-50/30'}`}>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={entry.worker_id}
                                                        onChange={(e) => handleWorkerStockChange(index, 'worker_id', e.target.value)}
                                                        className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white font-medium"
                                                    >
                                                        {workers.map(w => (
                                                            <option key={w.id} value={w.id}>{w.username}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={entry.newspaper_id}
                                                        onChange={(e) => handleWorkerStockChange(index, 'newspaper_id', e.target.value)}
                                                        className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                                                    >
                                                        {newspapers.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} ({p.paper_type || 'daily'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={entry.taken || 0}
                                                        onChange={(e) => handleWorkerStockChange(index, 'taken', parseInt(e.target.value) || 0)}
                                                        className={`w-full p-2 border rounded-md focus:ring-2 outline-none text-center bg-blue-50/30 font-bold ${isOverLimit ? 'border-amber-400 focus:ring-amber-500' : 'border-slate-200 focus:ring-blue-500'}`}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={entry.month_taken || 0}
                                                        onChange={(e) => handleWorkerStockChange(index, 'month_taken', parseInt(e.target.value) || 0)}
                                                        className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold text-slate-700"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={entry.year_taken || 0}
                                                        onChange={(e) => handleWorkerStockChange(index, 'year_taken', parseInt(e.target.value) || 0)}
                                                        className="w-full p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold text-slate-700"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={entry.returned || 0}
                                                        onChange={(e) => handleWorkerStockChange(index, 'returned', parseInt(e.target.value) || 0)}
                                                        className={`w-full p-2 border rounded-md focus:ring-2 outline-none text-center font-medium ${isReturnInvalid ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'}`}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-600">
                                                    {sold}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative">
                                                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={entry.amount_given || 0}
                                                            onChange={(e) => handleWorkerStockChange(index, 'amount_given', e.target.value)}
                                                            className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => removeWorkerStockRow(index)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
