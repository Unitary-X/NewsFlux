import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { MapPin, Phone, Navigation, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function RouteView() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [route, setRoute] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRoute();
    }, []);

    const fetchRoute = async () => {
        try {
            const res = await api.get('/worker/route');
            setRoute(res.data);
        } catch (err) {
            console.error('Failed to fetch route', err);
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

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="px-4 py-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link to="/worker" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{t('worker.my_route', "Today's Route")}</h1>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                            {route.length} {t('worker.stops', 'Stops')}
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6">
                {route.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <Navigation className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{t('worker.no_route', 'No route assigned yet')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {route.map((customer, index) => (
                            <div 
                                key={customer.id} 
                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden"
                            >
                                {/* Route Number Badge */}
                                <div className="absolute top-3 right-3 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">
                                    {index + 1}
                                </div>

                                {/* Customer Info */}
                                <div className="pr-12">
                                    <h3 className="font-bold text-lg text-slate-800 mb-2">{customer.name}</h3>
                                    
                                    {customer.address && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600 mb-2">
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{customer.address}</span>
                                        </div>
                                    )}
                                    
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                            <a 
                                                href={`tel:${customer.phone}`} 
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {customer.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Route Order Indicator */}
                                {index < route.length - 1 && (
                                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* End Marker */}
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-2xl shadow-lg text-center text-white">
                            <div className="flex items-center justify-center gap-2">
                                <Navigation className="w-5 h-5" />
                                <span className="font-bold">{t('worker.route_complete', 'Route Complete!')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
