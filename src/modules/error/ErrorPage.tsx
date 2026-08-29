import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BRANDING } from '../../monapp/Branding';

interface ErrorPageProps {
    type?: 'unauthorized' | '404' | 'error';
    message?: string;
}

export const ErrorPage = ({ type: propsType, message }: ErrorPageProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Détecter le type depuis les props ou les paramètres d'URL / state
    const stateType = location.state?.type;
    const type = propsType || stateType || '404';

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    // Configuration selon le type d'erreur
    const getErrorDetails = () => {
        switch (type) {
            case 'unauthorized':
                return {
                    title: 'Accès Refusé',
                    subtitle: 'Zone Restreinte',
                    description: message || "Il semble que vous n'ayez pas les droits nécessaires pour accéder à cette page.",
                };
            case 'error':
                return {
                    title: 'Erreur Inattendue',
                    subtitle: 'Une erreur est survenue',
                    description: message || "Une erreur s'est produite. Veuillez réessayer plus tard.",
                };
            case '404':
            default:
                return {
                    title: 'Page Introuvable',
                    subtitle: 'Erreur 404',
                    description: message || "La page que vous recherchez n'existe pas ou a été déplacée.",
                };
        }
    };

    const details = getErrorDetails();

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col items-center justify-center p-6 text-center transition-theme relative overflow-hidden">
            {/* Arrière-plan décoratif */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-tr from-theme-accent-start/5 to-theme-accent-end/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 max-w-md w-full space-y-8 bg-theme-surface/40 backdrop-blur-xl border border-theme-border/60 p-8 md:p-10 rounded-[2.5rem] shadow-2xl transition-theme">

                {/* Logo + titre */}
                <div className="flex flex-col items-center gap-3">
                    <img loading="lazy"
                        src={BRANDING.LOGO}
                        alt="Logo"
                        className="w-24 h-24 object-contain hover:scale-105 transition-transform duration-300 animate-pulse"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                    />
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-theme-accent-end uppercase tracking-[0.2em]">{details.subtitle}</span>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-theme-text-primary">{details.title}</h2>
                    </div>
                </div>

                {/* Description de l'erreur */}
                <p className="text-theme-text-secondary text-xs md:text-sm font-medium leading-relaxed">
                    {details.description}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-2">
                    <button
                        onClick={() => navigate('/home')}
                        className="w-full py-4 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-theme-accent-start/15 flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" /> Retour à l'accueil
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="py-3.5 bg-theme-surface hover:bg-theme-surface-hover text-theme-text-secondary rounded-2xl font-black text-[10px] uppercase tracking-wider border border-theme-border transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Précédent
                        </button>

                        <button
                            onClick={handleLogout}
                            className="py-3.5 bg-theme-surface hover:bg-theme-surface-hover text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-wider border border-theme-border transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" /> Déconnexion
                        </button>
                    </div>
                </div>
            </div>

            {/* Mentions de bas de page */}
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] text-theme-text-secondary/50 font-black uppercase tracking-widest pointer-events-none">
                AVE Coordination • Tous Droits Réservés
            </p>
        </div>
    );
};
