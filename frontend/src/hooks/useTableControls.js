import { useState, useMemo } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function useTableControls(items, { defaultSort = null, defaultPageSize = 10 } = {}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [sortKey, setSortKey] = useState(defaultSort?.key || null);
    const [sortDir, setSortDir] = useState(defaultSort?.dir || 'asc');
    const [selected, setSelected] = useState(new Set());

    const sorted = useMemo(() => {
        if (!sortKey) return items;
        return [...items].sort((a, b) => {
            let va = a[sortKey], vb = b[sortKey];
            if (va == null) va = '';
            if (vb == null) vb = '';
            if (typeof va === 'number' && typeof vb === 'number') {
                return sortDir === 'asc' ? va - vb : vb - va;
            }
            const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
            return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
        });
    }, [items, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);

    const paged = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, safePage, pageSize]);

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === paged.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(paged.map(i => i.id)));
        }
    };

    const clearSelection = () => setSelected(new Set());

    const changePageSize = (size) => {
        setPageSize(size);
        setPage(1);
    };

    return {
        paged,
        page: safePage,
        setPage,
        pageSize,
        changePageSize,
        totalPages,
        totalItems: sorted.length,
        sortKey,
        sortDir,
        toggleSort,
        selected,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
        PAGE_SIZE_OPTIONS,
    };
}
