import React from 'react';

export const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`}></div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-32">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[350px]">
                <Skeleton className="h-6 w-48 mb-6" />
                <Skeleton className="h-full w-full rounded-xl" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[350px]">
                <Skeleton className="h-6 w-48 mb-6" />
                <Skeleton className="h-full w-full rounded-xl" />
            </div>
        </div>
    </div>
);

export const TableSkeleton = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-end mb-8">
            <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex gap-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 flex-1" />)}
            </div>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="p-4 border-b border-slate-50 flex gap-4">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-40" />
                </div>
            ))}
        </div>
    </div>
);
