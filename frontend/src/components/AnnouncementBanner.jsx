import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Megaphone, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AnnouncementBanner() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [dismissed, setDismissed] = useState([]);

    useEffect(() => {
        if (!user || user.role === 'super_admin') return;
        const endpoint = user.role === 'admin' ? '/admin/announcements' : '/worker/announcements';
        api.get(endpoint)
            .then(res => setAnnouncements(res.data))
            .catch(() => { });
    }, [user]);

    const visible = announcements.filter(a => !dismissed.includes(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-0">
            {visible.map(ann => (
                <div
                    key={ann.id}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md"
                >
                    <div className="flex items-center gap-3">
                        <Megaphone className="w-4 h-4 shrink-0" />
                        <div>
                            <span className="text-sm font-bold">{ann.title}</span>
                            <span className="text-xs opacity-80 ml-2">{ann.message}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(prev => [...prev, ann.id])}
                        className="p-1 hover:bg-white/20 rounded transition-colors shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
