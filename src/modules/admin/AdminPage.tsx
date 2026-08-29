import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Settings, Users, FileText, LayoutDashboard, Home, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../monapp/ThemeContext';
import { supabase } from '../../lib/supabase';

export const AdminPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    return (
        <div className="h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans overflow-hidden transition-theme">
            {/* TOP NAVBAR (Super Compact) */}
            <header className="bg-theme-bg/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 shrink-0 transition-theme">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer shrink-0"
                        title="Retour"
                    >
                        <ArrowLeft className="w-4.5 h-4.5" />
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
                    >
                        <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                    </button>
                    <div className="min-w-0">
                        <span className="block font-black text-theme-text-primary text-base leading-none uppercase tracking-tighter truncate">Admin</span>
                        <span className="text-[9px] font-bold text-theme-accent-end uppercase tracking-[0.3em] truncate block mt-0.5">Administration</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
                        title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
                        title="Accueil"
                    >
                        <Home className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2.5 bg-theme-surface text-red-500 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all border border-theme-border hover:border-red-500/30 cursor-pointer"
                        title="Se déconnecter"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                    <div className="p-2.5 bg-theme-surface text-theme-accent-end rounded-xl border border-theme-border">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-20 transition-theme">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                    {/* HERO BANNER COMPACT */}
                    <div className="relative overflow-hidden bg-theme-surface backdrop-blur-xl border border-theme-border rounded-2xl p-6 transition-theme">
                        <div className="absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-10 -mr-16 -mt-16"></div>

                        <div className="relative z-10 max-w-2xl space-y-3">

                            <h1 className="text-xl md:text-2xl font-black text-theme-text-primary tracking-tighter leading-tight">
                                Gestion Globale <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-accent-start to-theme-accent-end">de la Plateforme</span>
                            </h1>
                            <p className="text-theme-text-secondary text-[11px] font-medium leading-relaxed max-w-md">
                                Supervisez les structures, gérez les nominations et accédez aux outils d'administration centrale de l'application Armée de petits anges.
                            </p>
                        </div>
                    </div>

                    {/* ACTION GRID COMPACT */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <button
                            onClick={() => navigate('/admin/structures')}
                            className="group bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300 flex flex-col items-center gap-3 text-center hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-theme-bg rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                <LayoutDashboard className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-theme-text-primary text-sm tracking-tight">Structures</h3>
                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Hiérarchie & Orga</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/admin/nomination')}
                            className="group bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300 flex flex-col items-center gap-3 text-center hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-theme-bg rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-theme-text-primary text-sm tracking-tight">Nominations</h3>
                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Coordonateurs</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/admin/transferts')}
                            className="group bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300 flex flex-col items-center gap-3 text-center hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-theme-bg rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-theme-text-primary text-sm tracking-tight">Transferts</h3>
                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Approbations</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="group bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300 flex flex-col items-center gap-3 text-center hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-theme-bg rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-theme-text-primary text-sm tracking-tight">Dashboard</h3>
                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Statistiques</p>
                            </div>
                        </button>

                        <button
                            onClick={() => navigate('/admin/publications')}
                            className="group bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300 flex flex-col items-center gap-3 text-center hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-theme-bg rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-theme-text-primary text-sm tracking-tight">Annonces</h3>
                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Modérations</p>
                            </div>
                        </button>

                        <button className="group bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300 flex flex-col items-center gap-3 text-center hover:scale-[1.02] opacity-60 cursor-pointer">
                            <div className="w-12 h-12 bg-theme-bg rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-border group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white group-hover:border-transparent transition-all duration-300 shadow-sm">
                                <Settings className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-black text-theme-text-primary text-sm tracking-tight">Paramètres</h3>
                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Config Système</p>
                            </div>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

