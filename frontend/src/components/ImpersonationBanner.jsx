import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, X } from 'lucide-react';

export default function ImpersonationBanner() {
    const { user, exitImpersonation } = useAuth();

    if (!user?.impersonating) return null;

    return (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white px-4 py-2.5 flex items-center justify-between z-[9999] relative shadow-lg">
            <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-bold tracking-wide">
                    GOD MODE — You are impersonating <span className="underline decoration-2">{user.agencyName || 'an agency'}</span>
                </span>
                <span className="text-xs opacity-75 font-mono">
                    All actions are logged
                </span>
            </div>
            <button
                onClick={exitImpersonation}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
                <X className="w-3.5 h-3.5" />
                Exit Impersonation
            </button>
        </div>
    );
}
