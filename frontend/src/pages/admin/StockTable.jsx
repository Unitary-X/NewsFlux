import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Save, Loader2, Calendar } from 'lucide-react';

export default function StockTable() {
    const [newspapers, setNewspapers] = useState([]);
    const [stock, setStock] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [date]);

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
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (paperId, field, value) => {
        const val = parseInt(value) || 0;
        setStock(prev => ({
            ...prev,
            [paperId]: {
                ...prev[paperId],
                [field]: val
            }
        }));
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
            alert('Stock saved successfully!');
        } catch (err) {
            alert('Failed to save stock.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate total income
    const calculateTotalIncome = () => {
        return newspapers.reduce((total, paper) => {
            const currentStock = stock[paper.id] || { taken: 0, returned: 0 };
            const sold = Math.max(0, (currentStock.taken || 0) - (currentStock.returned || 0));
            return total + (sold * paper.base_price);
        }, 0);
    };

    const totalIncome = calculateTotalIncome();

    return (
        <div className="max-w-6xl mx-auto">
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
                        onClick={saveStock}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-md shadow-blue-500/20 transition-all disabled:opacity-70"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Ledger
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                        <p>Loading inventory data...</p>
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
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-32 text-right">Sold (Net)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600 tracking-wide text-sm w-40 text-right">Income</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {newspapers.map(paper => {
                                    const currentStock = stock[paper.id] || { taken: 0, returned: 0 };
                                    const sold = Math.max(0, (currentStock.taken || 0) - (currentStock.returned || 0));
                                    const income = sold * paper.base_price;

                                    return (
                                        <tr key={paper.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-slate-800">{paper.name}</span>
                                                <div className="text-xs text-slate-400 mt-1">Base Price: ₹{paper.base_price.toFixed(2)}</div>
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
                                            <td className="px-6 py-4 text-right">
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
                                <tr className="bg-gradient-to-r from-blue-50 to-emerald-50 border-t-2 border-blue-200">
                                    <td colSpan="4" className="px-6 py-4 text-right">
                                        <span className="text-lg font-bold text-slate-700">Total Income:</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center justify-center text-2xl font-bold text-emerald-600">
                                            ₹{totalIncome.toFixed(2)}
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
