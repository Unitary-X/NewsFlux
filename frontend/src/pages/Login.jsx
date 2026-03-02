import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Newspaper, Loader2, Globe } from 'lucide-react';

export default function Login() {
    const { t, i18n } = useTranslation();
    const { login } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'ta' : 'en';
        i18n.changeLanguage(nextLang);
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        setServerError('');
        try {
            // Login using FastAPI standards (x-www-form-urlencoded vs JSON depending on backend setup)
            // We set up Pydantic model for LoginRequest JSON in backend, so we send JSON.
            const response = await axios.post('http://localhost:8000/api/v1/auth/login', {
                username: data.username,
                password: data.password
            });

            const { access_token, refresh_token } = response.data;

            // We need the role, we should parse the JWT manually since backend didn't return it in body
            const payload = JSON.parse(atob(access_token.split('.')[1]));
            const userState = { id: payload.sub, role: payload.role, tenant_id: payload.tenant_id };

            login(access_token, refresh_token, userState);

            // Role-based routing
            if (payload.role === 'admin') navigate('/admin');
            else if (payload.role === 'worker') navigate('/worker');
            else if (payload.role === 'super_admin') navigate('/superadmin');
            else navigate('/');

        } catch (error) {
            console.error(error);
            setServerError(error.response?.data?.detail || t('login.error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden flex flex-col justify-center items-center py-10 px-4">
            {/* Soft Light Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-sky-200/50 rounded-full mix-blend-multiply filter blur-[100px] -z-10"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full mix-blend-multiply filter blur-[100px] -z-10"></div>

            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/60 backdrop-blur-md rounded-full text-slate-700 hover:bg-white/90 transition-all border border-slate-200/60 shadow-sm hover:shadow-md"
                >
                    <Globe className="w-4 h-4 text-sky-500" />
                    <span className="text-sm font-bold tracking-wider uppercase">{i18n.language === 'en' ? 'தமிழ்' : 'English'}</span>
                </button>
            </div>

            <div className="w-full max-w-md z-10 transition-all duration-500 ease-out translate-y-0 opacity-100">
                <div className="backdrop-blur-xl bg-white/70 border border-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-500">
                    <div className="absolute -inset-1 bg-gradient-to-r from-sky-100/30 to-indigo-100/30 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-1000 -z-10"></div>

                    <div className="flex justify-center mb-8">
                        <div className="p-4 bg-sky-50 rounded-2xl ring-1 ring-sky-100 shadow-inner">
                            <Newspaper className="w-10 h-10 text-sky-500" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-black text-center text-slate-800 mb-2 tracking-tight">
                        {t('login.title')}
                    </h2>
                    <p className="text-slate-500 text-center mb-10 text-sm font-medium tracking-wide">{t('welcome')}</p>

                    {serverError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <p className="text-red-500 text-sm font-bold tracking-wide text-center uppercase">{serverError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">{t('login.username')}</label>
                            <input
                                {...register('username', { required: true })}
                                className="w-full bg-white/80 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all font-medium hover:bg-white"
                                autoComplete="username"
                                placeholder="..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-2">{t('login.password')}</label>
                            <input
                                type="password"
                                {...register('password', { required: true })}
                                className="w-full bg-white/80 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all font-medium tracking-widest hover:bg-white"
                                autoComplete="current-password"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-widest uppercase py-4 rounded-full shadow-lg shadow-slate-900/20 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden hover:-translate-y-0.5"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin mr-3 text-white/70" /> {t('login.logging_in')}</>
                            ) : (
                                t('login.submit')
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
                            >
                                {t('login.forgot_password') || 'Forgot Password?'}
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
