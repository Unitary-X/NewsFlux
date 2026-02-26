import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { Plus, Newspaper as NewsIcon, Loader2 } from 'lucide-react';

export default function Newspapers() {
    const [newspapers, setNewspapers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    const fetchNewspapers = async () => {
        try {
            const res = await api.get('/admin/newspapers');
            setNewspapers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNewspapers();
    }, []);

    const onSubmit = async (data) => {
        setIsAdding(true);
        try {
            await api.post('/admin/newspapers', {
                name: data.name,
                base_price: parseFloat(data.base_price)
            });
            reset();
            fetchNewspapers();
        } catch (err) {
            alert('Failed to add newspaper');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Newspaper Catalog</h1>
                    <p className="text-slate-500 mt-2">Manage the baseline newspapers available for distribution.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <Plus className="w-5 h-5 text-blue-500" />
                            Add Newspaper
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Newspaper Name</label>
                                <input
                                    {...register('name', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Daily Bugle"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Base Price (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('base_price', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Paper'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : newspapers.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No newspapers found. Add one to the left to get started.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-4 font-semibold text-slate-600">Name</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">Base Price</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {newspapers.map(paper => (
                                        <tr key={paper.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg"><NewsIcon className="w-4 h-4 text-blue-600" /></div>
                                                <span className="font-medium text-slate-800">{paper.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">₹{paper.base_price.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-400">{paper.id.substring(0, 8)}...</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
