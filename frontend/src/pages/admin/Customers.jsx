import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { Users, UserPlus, Loader2, MapPin, Phone } from 'lucide-react';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/admin/customers');
            setCustomers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const onSubmit = async (data) => {
        setIsAdding(true);
        try {
            await api.post('/admin/customers', {
                name: data.name,
                address: data.address,
                phone: data.phone
            });
            reset();
            fetchCustomers();
        } catch (err) {
            alert('Failed to register customer to database.');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Customer Database</h1>
                    <p className="text-slate-500 mt-2">Manage consumer demographics and bulk route processing points.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <UserPlus className="w-5 h-5 text-emerald-500" />
                            Register Customer
                        </h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                <input
                                    {...register('name', { required: true })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Address Location</label>
                                <textarea
                                    {...register('address')}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24"
                                    placeholder="123 Sector 4..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                                <input
                                    {...register('phone')}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="+91..."
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Client'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                        ) : customers.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No customers registered yet.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                                        <th className="px-6 py-4 font-semibold text-slate-600">Client Info</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">Contact Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {customers.map(cust => (
                                        <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 flex items-start gap-4">
                                                <div className="p-2 bg-emerald-100 rounded-lg shrink-0 mt-1"><Users className="w-4 h-4 text-emerald-600" /></div>
                                                <div>
                                                    <span className="font-bold text-slate-800 block text-lg">{cust.name}</span>
                                                    <span className="text-xs font-mono text-slate-400">ID: {cust.id.substring(0, 8)}...</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-2 text-sm text-slate-600">
                                                    {cust.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {cust.phone}</div>}
                                                    {cust.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2">{cust.address}</span></div>}
                                                </div>
                                            </td>
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
