import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Save, Loader2, Calendar, User, Plus, Trash2, IndianRupee, Phone, ShieldCheck, UserPlus, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '../../components/Skeleton';

export default function WorkerDailyLedger() {
    const [newspapers, setNewspapers] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [workerStock, setWorkerStock] = useState([]);
    const [stock, setStock] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingWorker, setIsSavingWorker] = useState(false);

    // Inline worker creation
    const [showAddWorker, setShowAddWorker] = useState(false);
    const [newWorker, setNewWorker] = useState({ username: '', role: 'worker', phone: '' });
    const [addingWorker, setAddingWorker] = useState(false);

    // Auto-save state
    const [autoSaveStatus, setAutoSaveStatus] = useState(''); 
    const [autoSaveErrors, setAutoSaveErrors] = useState([]);
    const initialRender = useRef(true);

    const [viewMode, setViewMode] = useState('issue'); // 'issue' or 'returns'

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
    }, [workerStock]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [papersRes, stockRes, workersRes, workerStockRes] = await Promise.all([
                api.get('/admin/newspapers'),
                api.get(`/admin/stock/${date}`),
                api.get('/admin/workers'),
                api.get(`/admin/workers/stock?target_date=${date}`)
            ]);
 
            const fetchedPapers = papersRes.data;
            const fetchedWorkers = workersRes.data;
            const backendStock = workerStockRes.data || [];

            // Auto-generate full matrix
            const fullMatrix = [];
            fetchedWorkers.forEach(w => {
                fetchedPapers.forEach(p => {
                    const existing = backendStock.find(s => s.worker_id === w.id && s.newspaper_id === p.id);
                    if (existing) {
                        fullMatrix.push(existing);
                    } else {
                        fullMatrix.push({
                            worker_id: w.id,
                            newspaper_id: p.id,
                            taken: 0,
                            month_taken: 0,
                            year_taken: 0,
                            returned: 0,
                            sold: 0,
                            amount_given: 0, // We'll store worker's total cash in the first paper's entry
                            date: date,
                            worker_area: w.area || ''
                        });
                    }
                });
            });

            setNewspapers(fetchedPapers);
            setWorkers(fetchedWorkers);
            setWorkerStock(fullMatrix);

            const stockMap = {};
            stockRes.data.forEach(s => {
                stockMap[s.newspaper_id] = { taken: s.taken, returned: s.returned };
            });
            setStock(stockMap);

        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCellChange = (workerId, paperId, field, value) => {
        setWorkerStock(prev => prev.map(s => {
            if (s.worker_id === workerId && s.newspaper_id === paperId) {
                return { ...s, [field]: parseInt(value) || 0 };
            }
            return s;
        }));
    };

    // For worker-level fields (Area, Paid Amount), we store them on the FIRST newspaper entry for that worker
    const handleWorkerLevelChange = (workerId, field, value) => {
        if (newspapers.length === 0) return;
        const firstPaperId = newspapers[0].id;
        
        setWorkerStock(prev => prev.map(s => {
            if (s.worker_id === workerId && s.newspaper_id === firstPaperId) {
                const parsedValue = field === 'amount_given' ? (parseFloat(value) || 0) : value;
                return { ...s, [field]: parsedValue };
            }
            return s;
        }));
    };
 
    const saveWorkerStock = async () => {
        setIsSavingWorker(true);
        try {
            // Filter out purely empty entries to avoid sending massive payloads of zeros
            const activeEntries = workerStock.filter(s => s.taken > 0 || s.returned > 0 || s.amount_given > 0);
            
            const payload = activeEntries.map(s => ({
                worker_id: s.worker_id,
                newspaper_id: s.newspaper_id,
                date: date,
                taken: s.taken || 0,
                month_taken: s.month_taken ?? null,
                year_taken: s.year_taken ?? null,
                returned: s.returned || 0,
                sold: (s.taken || 0) - (s.returned || 0), // Auto-calculate sold
                amount_given: s.amount_given || 0
            }));
            if (payload.length > 0) {
                await api.post('/admin/worker-stock', payload);
            }
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
        
        const errors = [];
        
        // Validation checks
        workerStock.forEach(s => {
            if (s.returned > s.taken) {
                const w = workers.find(work => work.id === s.worker_id);
                const p = newspapers.find(pap => pap.id === s.newspaper_id);
                errors.push(`${w?.username} returned more '${p?.name}' than taken.`);
            }
        });

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

        try {
            await saveWorkerStock();
            setAutoSaveStatus('saved');
            if (!isSilent) alert('All worker ledger stock saved successfully!');
            setTimeout(() => setAutoSaveStatus(''), 3000);
        } catch (err) {
            setAutoSaveStatus('error');
            if (!isSilent) alert('Failed to save worker ledger stock.');
        }
    };

    if (isLoading) return <div className="p-8"><TableSkeleton /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-0 space-y-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <User className="w-8 h-8 text-blue-500" />
                        Worker Daily Ledger
                    </h1>
                    <p className="text-slate-500 mt-2">Manage daily stock distributions and returns in a matrix grid.</p>
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
                        disabled={isSavingWorker || isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-70"
                    >
                        {isSavingWorker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Ledger
                    </button>
                    {autoSaveStatus === 'saved' && <span className="text-sm font-bold text-emerald-600 ml-2 absolute -right-20">Saved</span>}
                    {autoSaveStatus === 'saving' && <span className="text-sm font-mono text-slate-400 ml-2 flex items-center gap-1 absolute -right-[88px]"><Loader2 className="w-3 h-3 animate-spin"/> Saving</span>}
                </div>
            </div>

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

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex bg-slate-100 p-1 rounded-xl w-max">
                        <button
                            onClick={() => setViewMode('issue')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'issue' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Morning Issue (Taken)
                        </button>
                        <button
                            onClick={() => setViewMode('returns')}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'returns' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Evening Returns & Cash
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAddWorker(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showAddWorker ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                        >
                            <UserPlus className="w-4 h-4" />
                            {showAddWorker ? 'Cancel' : 'New Worker'}
                        </button>
                    </div>
                </div>

                {/* Inline Add Worker Form */}
                {showAddWorker && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-end gap-4 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Worker Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={newWorker.username} onChange={e => setNewWorker(p => ({...p, username: e.target.value}))} required placeholder="Full Name" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Role</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select value={newWorker.role} onChange={e => setNewWorker(p => ({...p, role: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                                    <option value="worker">Delivery Worker</option>
                                    <option value="supervisor">Supervisor</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="tel" value={newWorker.phone} onChange={e => setNewWorker(p => ({...p, phone: e.target.value}))} placeholder="9876543210" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-60"
                        >
                            {addingWorker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create
                        </button>
                    </div>
                )}

                {workers.length === 0 || newspapers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Please ensure you have at least one Worker and one Newspaper in the system.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 font-bold text-slate-700 text-sm sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">Worker</th>
                                    {newspapers.map(p => (
                                        <th key={p.id} className="px-3 py-3 font-semibold text-slate-600 text-sm text-center min-w-[80px]">
                                            {p.name}
                                        </th>
                                    ))}
                                    {viewMode === 'returns' && (
                                        <th className="px-4 py-3 font-bold text-emerald-700 text-sm text-center bg-emerald-50/50">Total Loss</th>
                                    )}
                                    {viewMode === 'returns' && (
                                        <th className="px-4 py-3 font-bold text-slate-700 text-sm bg-slate-100 w-40">Paid Amount</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {workers.map((worker) => {
                                    // Get the first paper entry to retrieve worker-level fields
                                    const firstEntry = workerStock.find(s => s.worker_id === worker.id && s.newspaper_id === newspapers[0].id) || {};
                                    
                                    let totalReturnLoss = 0;
                                    
                                    return (
                                        <tr key={worker.id} className="hover:bg-blue-50/20 transition-colors group">
                                            <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-blue-50/20 z-10 border-r border-slate-200 shadow-[1px_0_0_0_#f1f5f9]">
                                                <div className="font-bold text-slate-800 text-sm">{worker.username}</div>
                                                <input 
                                                    type="text" 
                                                    placeholder="Area" 
                                                    value={firstEntry.worker_area || ''} 
                                                    onChange={(e) => handleWorkerLevelChange(worker.id, 'worker_area', e.target.value)}
                                                    className="w-full mt-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 outline-none focus:border-blue-400 focus:bg-white"
                                                />
                                            </td>
                                            
                                            {newspapers.map(paper => {
                                                const entry = workerStock.find(s => s.worker_id === worker.id && s.newspaper_id === paper.id) || {};
                                                
                                                if (viewMode === 'returns') {
                                                    const loss = (entry.returned || 0) * (entry.base_price || Number(paper.base_price) || 0);
                                                    totalReturnLoss += loss;
                                                }

                                                const isOverLimit = viewMode === 'issue' && (() => {
                                                    const totalTaken = workerStock.filter(s => s.newspaper_id === paper.id).reduce((sum, s) => sum + (s.taken || 0), 0);
                                                    const agencyLimit = stock[paper.id]?.taken || 0;
                                                    return totalTaken > agencyLimit;
                                                })();

                                                return (
                                                    <td key={paper.id} className="px-2 py-3">
                                                        {viewMode === 'issue' ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={entry.taken || ''}
                                                                placeholder="0"
                                                                onChange={(e) => handleCellChange(worker.id, paper.id, 'taken', e.target.value)}
                                                                className={`w-full text-center px-2 py-2 border rounded-lg outline-none font-bold text-blue-700 bg-blue-50/30 transition-all focus:ring-2 ${isOverLimit ? 'border-amber-400 focus:ring-amber-500 text-amber-700 bg-amber-50' : 'border-slate-200 focus:ring-blue-500 focus:bg-white'}`}
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={entry.returned || ''}
                                                                    placeholder="Ret 0"
                                                                    title="Returned"
                                                                    onChange={(e) => handleCellChange(worker.id, paper.id, 'returned', e.target.value)}
                                                                    className={`w-full text-center px-2 py-1.5 border rounded outline-none font-medium text-sm transition-all focus:ring-2 ${entry.returned > entry.taken ? 'border-red-400 bg-red-50 text-red-600 focus:ring-red-400' : 'border-slate-200 bg-slate-50 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500'}`}
                                                                />
                                                                <div className="text-[10px] text-center font-semibold text-slate-400">
                                                                    Sold: {(entry.taken || 0) - (entry.returned || 0)}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {viewMode === 'returns' && (
                                                <td className="px-4 py-3 text-center bg-emerald-50/20">
                                                    <div className={`font-bold text-sm ${totalReturnLoss > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                        ₹{totalReturnLoss.toFixed(2)}
                                                    </div>
                                                </td>
                                            )}

                                            {viewMode === 'returns' && (
                                                <td className="px-4 py-3 bg-slate-50 border-l border-slate-200">
                                                    <div className="relative">
                                                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            value={firstEntry.amount_given || ''}
                                                            onChange={(e) => handleWorkerLevelChange(worker.id, 'amount_given', e.target.value)}
                                                            className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-slate-700 font-bold bg-white shadow-sm"
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
