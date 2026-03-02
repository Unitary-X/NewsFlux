import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { DollarSign, TrendingUp, Clock, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function MySalary() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSalary();
    }, []);

    const fetchSalary = async () => {
        try {
            const res = await api.get('/worker/salary');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch salary data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="px-4 py-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link to="/worker" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{t('worker.my_salary', 'My Salary')}</h1>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{t('worker.compensation_details', 'Compensation Details')}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-semibold opacity-90">{t('salaries.paid_amount', 'Total Earned')}</span>
                        </div>
                        <div className="text-3xl font-black mb-1">₹{data?.total_earned?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs opacity-75">{t('billing.status_paid', 'Paid')}</div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 opacity-80" />
                            <span className="text-xs font-semibold opacity-90">{t('salaries.pending_amount', 'Pending')}</span>
                        </div>
                        <div className="text-3xl font-black mb-1">₹{data?.total_pending?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs opacity-75">{t('billing.status_pending', 'Unpaid')}</div>
                    </div>
                </div>

                {/* Salary Records */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800">{t('worker.salary_history', 'Salary History')}</h2>
                    </div>

                    {!data?.salaries || data.salaries.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>{t('salaries.no_data', 'No salary records yet')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {data.salaries.map((salary) => (
                                <div key={salary.id} className="p-5 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800">
                                                {months[salary.month - 1]} {salary.year}
                                            </h3>
                                            {salary.notes && (
                                                <p className="text-xs text-slate-500 mt-1">{salary.notes}</p>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            salary.status === 'paid' 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {salary.status === 'paid' ? t('billing.status_paid', 'Paid') : t('billing.status_pending', 'Pending')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                                            <span className="text-slate-600">{t('salaries.base', 'Base')}</span>
                                            <span className="font-semibold text-slate-800">₹{salary.base_salary.toFixed(2)}</span>
                                        </div>
                                        {salary.bonus > 0 && (
                                            <div className="flex justify-between p-2 bg-emerald-50 rounded-lg">
                                                <span className="text-emerald-600">{t('salaries.bonus', 'Bonus')}</span>
                                                <span className="font-semibold text-emerald-700">+₹{salary.bonus.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {salary.deductions > 0 && (
                                            <div className="flex justify-between p-2 bg-red-50 rounded-lg">
                                                <span className="text-red-600">{t('salaries.ded', 'Deductions')}</span>
                                                <span className="font-semibold text-red-700">-₹{salary.deductions.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-600">{t('salaries.total', 'Total')}</span>
                                        <span className="text-2xl font-black text-blue-600">₹{salary.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
