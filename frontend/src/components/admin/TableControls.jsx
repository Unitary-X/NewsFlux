import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

export function SortHeader({ label, sortKey, currentKey, currentDir, onSort, className = '' }) {
    const active = currentKey === sortKey;
    return (
        <th
            className={`px-6 py-4 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-800 transition-colors ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active ? (
                    currentDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                )}
            </span>
        </th>
    );
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, pageSizeOptions }) {
    if (totalItems <= 10 && pageSize >= totalItems) return null;
    return (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 text-sm text-slate-600">
            <div className="flex items-center gap-2">
                <span>Rows:</span>
                <select
                    value={pageSize}
                    onChange={e => onPageSizeChange(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                >
                    {pageSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="text-slate-400 ml-2">
                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onPageChange(1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                <span className="px-3 font-medium text-slate-700">{page} / {totalPages}</span>
                <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

export function BulkBar({ count, onDelete, onClear }) {
    if (count === 0) return null;
    return (
        <div className="flex items-center justify-between px-6 py-2 bg-blue-50 border-b border-blue-200 text-sm">
            <span className="font-medium text-blue-700">{count} selected</span>
            <div className="flex items-center gap-3">
                {onDelete && (
                    <button onClick={onDelete} className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                )}
                <button onClick={onClear} className="text-blue-600 hover:text-blue-700 font-medium">Clear</button>
            </div>
        </div>
    );
}

export function SelectCheckbox({ checked, onChange, className = '' }) {
    return (
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${className}`}
        />
    );
}
