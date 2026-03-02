import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, IndianRupee } from 'lucide-react';

export default function PricingGrid() {
    const { t } = useTranslation();
    const [grid, setGrid] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changed, setChanged] = useState(false);

    const fetchGrid = async () => {
        try {
            const res = await api.get('/admin/pricing-grid');
            setGrid(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchGrid(); }, []);

    const updatePrice = (idx, value) => {
        const updated = [...grid];
        updated[idx] = { ...updated[idx], base_price: value };
        setGrid(updated);
        setChanged(true);
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            await api.put('/admin/pricing-grid', {
                prices: grid.map(g => ({ newspaper_id: g.newspaper_id, base_price: parseFloat(g.base_price) || 0 })),
            });
            setChanged(false);
            alert(t('pricing.save_success', 'Prices updated successfully'));
        } catch (err) {
            alert(err.response?.data?.detail || t('common.failed', 'Failed'));
        } finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('pricing.title', 'Pricing Grid')}</h1>
                    <p className="text-slate-500 text-sm mt-1">{t('pricing.subtitle', 'Bulk manage newspaper base prices across your agency')}</p>
                </div>
                <button onClick={saveAll} disabled={!changed || saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${changed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('pricing.save_all', 'Save All Prices')}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {grid.length === 0 ? (
                    <p className="text-center py-12 text-slate-400">{t('pricing.no_papers', 'No newspapers found. Add newspapers first.')}</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                        {grid.map((item, idx) => (
                            <div key={item.newspaper_id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                        <IndianRupee className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="font-medium text-slate-800 truncate">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-slate-400 text-sm">₹</span>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={item.base_price}
                                        onChange={e => updatePrice(idx, e.target.value)}
                                        className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {changed && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    {t('pricing.unsaved', 'You have unsaved changes')}
                </p>
            )}
        </div>
    );
}
