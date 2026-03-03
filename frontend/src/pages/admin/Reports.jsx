import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Users, Package, Calendar, Search, AlertTriangle, CheckCircle2, MinusCircle, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

const TABS = ['profit_loss', 'stock_recon', 'worker_perf', 'summary'];

/* ─── Download helper ─── */
async function downloadReport(url, defaultName) {
    const res = await api.get(url, { responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename=(.+)/);
    const filename = match ? match[1] : defaultName;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(res.data);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
}

/* ─── Reusable download buttons ─── */
function DownloadButtons({ buildUrl, baseName, disabled, t }) {
    const [downloading, setDownloading] = useState(null);
    const handleDownload = async (fmt) => {
        setDownloading(fmt);
        try {
            const ext = fmt === 'excel' ? 'xlsx' : 'pdf';
            await downloadReport(`${buildUrl}&fmt=${fmt}`, `${baseName}.${ext}`);
        } catch (err) { console.error('Download failed', err); }
        finally { setDownloading(null); }
    };
    return (
        <div className="flex gap-2">
            <button onClick={() => handleDownload('pdf')} disabled={disabled || downloading === 'pdf'}
                className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {downloading === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {t('reports.download_pdf', 'PDF')}
            </button>
            <button onClick={() => handleDownload('excel')} disabled={disabled || downloading === 'excel'}
                className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {downloading === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                {t('reports.download_excel', 'Excel')}
            </button>
        </div>
    );
}

export default function Reports() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('profit_loss');
    const [loading, setLoading] = useState(false);
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [targetDate, setTargetDate] = useState(now.toISOString().split('T')[0]);
    const [period, setPeriod] = useState('daily');

    // Data states
    const [plData, setPlData] = useState(null);
    const [reconData, setReconData] = useState(null);
    const [perfData, setPerfData] = useState(null);
    const [summaryData, setSummaryData] = useState(null);

    const fetchPL = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/reports/profit-loss?month=${month}&year=${year}`);
            setPlData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchRecon = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/reports/stock-reconciliation?target_date=${targetDate}`);
            setReconData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchPerf = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/reports/worker-performance?month=${month}&year=${year}`);
            setPerfData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/reports/summary?period=${period}&target_date=${targetDate}`);
            setSummaryData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'profit_loss') fetchPL();
        else if (activeTab === 'stock_recon') fetchRecon();
        else if (activeTab === 'worker_perf') fetchPerf();
        else if (activeTab === 'summary') fetchSummary();
    }, [activeTab]);

    const tabLabels = {
        profit_loss: t('reports.profit_loss', 'Profit & Loss'),
        stock_recon: t('reports.stock_recon', 'Stock Reconciliation'),
        worker_perf: t('reports.worker_perf', 'Worker Performance'),
        summary: t('reports.summary', 'Report Summary'),
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{t('reports.title', 'Reports & Analytics')}</h1>
                <p className="text-slate-500 text-sm mt-1">{t('reports.subtitle', 'Detailed business insights and performance tracking')}</p>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {TABS.map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                        {tabLabels[tab]}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'profit_loss' && <ProfitLossTab data={plData} loading={loading} month={month} year={year} setMonth={setMonth} setYear={setYear} onFetch={fetchPL} t={t} />}
            {activeTab === 'stock_recon' && <StockReconTab data={reconData} loading={loading} targetDate={targetDate} setTargetDate={setTargetDate} onFetch={fetchRecon} t={t} />}
            {activeTab === 'worker_perf' && <WorkerPerfTab data={perfData} loading={loading} month={month} year={year} setMonth={setMonth} setYear={setYear} onFetch={fetchPerf} t={t} />}
            {activeTab === 'summary' && <SummaryTab data={summaryData} loading={loading} period={period} setPeriod={setPeriod} targetDate={targetDate} setTargetDate={setTargetDate} onFetch={fetchSummary} t={t} />}
        </div>
    );
}

/* ─── Profit & Loss Tab ─── */
function ProfitLossTab({ data, loading, month, year, setMonth, setYear, onFetch, t }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <select value={month} onChange={e => setMonth(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
                    </select>
                    <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24" />
                    <button onClick={onFetch} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('reports.generate', 'Generate')}
                    </button>
                </div>
                {data && <DownloadButtons buildUrl={`/admin/reports/profit-loss/download?month=${month}&year=${year}`} baseName={`profit_loss_${month}_${year}`} disabled={loading} t={t} />}
            </div>

            {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

            {!loading && data && (
                <div className="space-y-4">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard label={t('reports.total_revenue', 'Total Revenue')} value={`₹${data.revenue.total.toLocaleString()}`} icon={TrendingUp} color="green" />
                        <KPICard label={t('reports.total_expenses', 'Total Expenses')} value={`₹${data.expenses.total.toLocaleString()}`} icon={TrendingDown} color="red" />
                        <KPICard label={t('reports.net_profit', 'Net Profit')} value={`₹${data.net_profit.toLocaleString()}`} icon={data.net_profit >= 0 ? TrendingUp : TrendingDown} color={data.net_profit >= 0 ? 'emerald' : 'red'} />
                        <KPICard label={t('reports.pending_collection', 'Pending Collection')} value={`₹${data.revenue.pending.toLocaleString()}`} icon={BarChart3} color="amber" />
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('reports.revenue_breakdown', 'Revenue Breakdown')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">{t('reports.collected', 'Collected')}</span><span className="font-medium text-green-600">₹{data.revenue.collected.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">{t('reports.pending', 'Pending')}</span><span className="font-medium text-amber-600">₹{data.revenue.pending.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">{t('reports.invoices', 'Invoices')}</span><span className="font-medium">{data.invoices_count}</span></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('reports.expense_breakdown', 'Expense Breakdown')}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">{t('reports.purchase_cost', 'Newspaper Purchase')}</span><span className="font-medium text-red-600">₹{data.expenses.purchase_cost.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">{t('reports.salary_expense', 'Worker Salaries')}</span><span className="font-medium text-red-600">₹{data.expenses.salary.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">{t('reports.salaries_count', 'Salary Records')}</span><span className="font-medium">{data.salaries_count}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Stock summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('reports.stock_summary', 'Stock Summary')}</h3>
                        <div className="flex gap-8 text-sm">
                            <div><span className="text-slate-500">{t('stock.taken', 'Taken')}:</span> <span className="font-medium">{data.stock.taken}</span></div>
                            <div><span className="text-slate-500">{t('stock.returned', 'Returned')}:</span> <span className="font-medium">{data.stock.returned}</span></div>
                            <div><span className="text-slate-500">{t('stock.sold', 'Sold')}:</span> <span className="font-bold text-blue-600">{data.stock.sold}</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Stock Reconciliation Tab ─── */
function StockReconTab({ data, loading, targetDate, setTargetDate, onFetch, t }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={onFetch} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('reports.check', 'Check')}
                    </button>
                </div>
                {data && <DownloadButtons buildUrl={`/admin/reports/stock-reconciliation/download?target_date=${targetDate}`} baseName={`stock_recon_${targetDate}`} disabled={loading} t={t} />}
            </div>

            {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

            {!loading && data && (
                <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-green-700">{data.summary.newspapers_matched}</p>
                            <p className="text-xs text-green-600">{t('reports.matched', 'Matched')}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-amber-700">{data.summary.newspapers_surplus}</p>
                            <p className="text-xs text-amber-600">{t('reports.surplus', 'Surplus')}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <MinusCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-red-700">{data.summary.newspapers_deficit}</p>
                            <p className="text-xs text-red-600">{t('reports.deficit', 'Deficit')}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium">{t('reports.newspaper', 'Newspaper')}</th>
                                    <th className="text-right px-4 py-3 font-medium">{t('reports.expected', 'Expected')}</th>
                                    <th className="text-right px-4 py-3 font-medium">{t('stock.taken', 'Taken')}</th>
                                    <th className="text-right px-4 py-3 font-medium">{t('stock.returned', 'Returned')}</th>
                                    <th className="text-right px-4 py-3 font-medium">{t('stock.sold', 'Sold')}</th>
                                    <th className="text-right px-4 py-3 font-medium">{t('reports.discrepancy', 'Discrepancy')}</th>
                                    <th className="text-center px-4 py-3 font-medium">{t('reports.status', 'Status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.newspapers.map(n => (
                                    <tr key={n.newspaper_id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{n.newspaper_name}</td>
                                        <td className="px-4 py-3 text-right">{n.expected}</td>
                                        <td className="px-4 py-3 text-right">{n.taken}</td>
                                        <td className="px-4 py-3 text-right">{n.returned}</td>
                                        <td className="px-4 py-3 text-right font-medium">{n.sold}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${n.discrepancy > 0 ? 'text-amber-600' : n.discrepancy < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {n.discrepancy > 0 && '+'}{n.discrepancy}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${n.status === 'match' ? 'bg-green-100 text-green-700' : n.status === 'surplus' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                {n.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Worker Performance Tab ─── */
function WorkerPerfTab({ data, loading, month, year, setMonth, setYear, onFetch, t }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <select value={month} onChange={e => setMonth(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>)}
                    </select>
                    <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24" />
                    <button onClick={onFetch} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('reports.load', 'Load')}
                    </button>
                </div>
                {data && <DownloadButtons buildUrl={`/admin/reports/worker-performance/download?month=${month}&year=${year}`} baseName={`worker_perf_${month}_${year}`} disabled={loading} t={t} />}
            </div>

            {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

            {!loading && data && (
                <div className="space-y-4">
                    {data.workers.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">{t('reports.no_workers', 'No workers found')}</p>
                    ) : (
                        <>
                            {/* Performance chart */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('reports.delivery_rate', 'Delivery Rate by Worker')}</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={data.workers}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="worker_name" tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="delivery_rate" fill="#3b82f6" name="Delivery %" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Workers table */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium">#</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('reports.worker', 'Worker')}</th>
                                            <th className="text-right px-4 py-3 font-medium">{t('reports.assignments', 'Assignments')}</th>
                                            <th className="text-right px-4 py-3 font-medium">{t('reports.delivered', 'Delivered')}</th>
                                            <th className="text-right px-4 py-3 font-medium">{t('reports.missed', 'Missed')}</th>
                                            <th className="text-right px-4 py-3 font-medium">{t('reports.rate', 'Rate')}</th>
                                            <th className="text-right px-4 py-3 font-medium">{t('reports.salary', 'Salary')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.workers.map((w, i) => (
                                            <tr key={w.worker_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                                                <td className="px-4 py-3 font-medium">{w.worker_name}</td>
                                                <td className="px-4 py-3 text-right">{w.assignments}</td>
                                                <td className="px-4 py-3 text-right text-green-600">{w.delivered}</td>
                                                <td className="px-4 py-3 text-right text-red-600">{w.missed}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-bold ${w.delivery_rate >= 90 ? 'text-green-600' : w.delivery_rate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {w.delivery_rate}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-medium">₹{w.salary_amount.toLocaleString()}</span>
                                                    <span className={`ml-1 text-xs ${w.salary_status === 'paid' ? 'text-green-500' : 'text-slate-400'}`}>
                                                        ({w.salary_status})
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Summary Tab (Daily / Weekly / Monthly) ─── */
function SummaryTab({ data, loading, period, setPeriod, targetDate, setTargetDate, onFetch, t }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <select value={period} onChange={e => setPeriod(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                        <option value="daily">{t('reports.daily', 'Daily')}</option>
                        <option value="weekly">{t('reports.weekly', 'Weekly')}</option>
                        <option value="monthly">{t('reports.monthly', 'Monthly')}</option>
                    </select>
                    <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={onFetch} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('reports.load', 'Load')}
                    </button>
                </div>
                {data && <DownloadButtons buildUrl={`/admin/reports/summary/download?period=${period}&target_date=${targetDate}`} baseName={`summary_${period}_${targetDate}`} disabled={loading} t={t} />}
            </div>

            {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}

            {!loading && data && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">{data.start_date} — {data.end_date}</p>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard label={t('reports.total_revenue', 'Revenue')} value={`₹${data.revenue.toLocaleString()}`} icon={TrendingUp} color="green" />
                        <KPICard label={t('stock.taken', 'Taken')} value={data.stock.taken} icon={Package} color="blue" />
                        <KPICard label={t('stock.sold', 'Sold')} value={data.stock.sold} icon={BarChart3} color="indigo" />
                        <KPICard label={t('reports.deliveries', 'Deliveries')} value={`${data.deliveries.delivered}/${data.deliveries.total}`} icon={Users} color="purple" />
                    </div>

                    {/* Trend chart */}
                    {data.daily_breakdown.length > 1 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('reports.daily_trend', 'Daily Trend')}</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.daily_breakdown}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f680" name="Revenue (₹)" />
                                    <Area type="monotone" dataKey="sold" stroke="#10b981" fill="#10b98150" name="Sold" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Daily breakdown table */}
                    {data.daily_breakdown.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium">{t('reports.date', 'Date')}</th>
                                        <th className="text-right px-4 py-3 font-medium">{t('stock.taken', 'Taken')}</th>
                                        <th className="text-right px-4 py-3 font-medium">{t('stock.returned', 'Returned')}</th>
                                        <th className="text-right px-4 py-3 font-medium">{t('stock.sold', 'Sold')}</th>
                                        <th className="text-right px-4 py-3 font-medium">{t('reports.revenue', 'Revenue')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.daily_breakdown.map(d => (
                                        <tr key={d.date} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{d.date}</td>
                                            <td className="px-4 py-3 text-right">{d.taken}</td>
                                            <td className="px-4 py-3 text-right">{d.returned}</td>
                                            <td className="px-4 py-3 text-right font-medium text-blue-600">{d.sold}</td>
                                            <td className="px-4 py-3 text-right font-medium text-green-600">₹{d.revenue.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── KPI Card Component ─── */
function KPICard({ label, value, icon: Icon, color }) {
    const colors = {
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 opacity-70" />
                <span className="text-xs font-medium opacity-70">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}
