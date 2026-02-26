import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { UserPlus, UserSquare2, Loader2 } from 'lucide-react';

export default function Workers() {
    const [workers, setWorkers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    const fetchWorkers = async () => {
        try {
            const res = await api.get('/admin/workers');
            setWorkers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    const onSubmit = async (data) => {
        setIsAdding(true);
        try {
            await api.post('/admin/workers', {
                username: data.username,
                password: data.password
            });
            reset();
            fetchWorkers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to provision worker account');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Worker Roster</h1>
                    <p className="text-slate-500 mt-2">Provision distributor accounts assigned to this agency.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <UserPlus className="w-5 h-5 text-indigo-500" />
                            New Distributor
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Worker Username</label>
                                <input
                                    {...register('username', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. jdoe_route1"
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Temporary Password</label>
                                <input
                                    type="password"
                                    {...register('password', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    autoComplete="new-password"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Provision Account'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                        ) : workers.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No workers enrolled yet.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-4 font-semibold text-slate-600">Username</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">Role</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">Account ID</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {workers.map(worker => (
                                        <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 rounded-lg"><UserSquare2 className="w-4 h-4 text-indigo-600" /></div>
                                                <span className="font-medium text-slate-800">{worker.username}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-medium capitalize">{worker.role}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-400">{worker.id.substring(0, 8)}...</td>
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
