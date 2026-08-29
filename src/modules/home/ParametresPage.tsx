import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../monapp/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
    Sun,
    Moon,
    BookOpen,
    Users,
    Bell,
    LifeBuoy,
    ChevronRight,
    User as UserIcon,
    LogOut,
    ScanLine,
    Building2,
    Shield,
    Calendar,
    FileText
} from 'lucide-react';
import { Navbar } from '../../monapp/components/Navbar';
import { useAuth } from '../../monapp/AuthContext';

// Clé localStorage pour les raccourcis
const SHORTCUTS_KEY = 'home_shortcuts';

export type ShortcutKey = 'formation' | 'communaute' | 'notifications' | 'service' | 'profileBar' | 'profil' | 'calendrier' | 'rapports';

const ALL_SHORTCUTS: { key: ShortcutKey; label: string; icon: React.ElementType; path: string; description: string }[] = [
    { key: 'profileBar', label: 'Barre de profil', icon: UserIcon, path: '', description: 'Afficher la barre de profil détaillée' },
    { key: 'profil', label: 'Bouton Profil', icon: UserIcon, path: '/profil', description: 'Bouton profil dans la barre du haut' },
    { key: 'calendrier', label: 'Calendrier', icon: Calendar, path: '/calendrier', description: 'Programme et événements' },
    { key: 'rapports', label: 'Rapports', icon: FileText, path: '/rapports', description: 'Gérer et soumettre les rapports' },
    { key: 'formation', label: 'Formation', icon: BookOpen, path: '/formation', description: 'Accès aux leçons & enseignements' },
    { key: 'communaute', label: 'Communauté', icon: Users, path: '/communaute', description: 'Publications & membres' },
    { key: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', description: 'Vos alertes et messages' },
    { key: 'service', label: 'Service', icon: LifeBuoy, path: '/service', description: 'Signalement & assistance' },
];

const QUICK_LINKS = [
    { label: 'Formation', path: '/formation', icon: BookOpen, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    { label: 'Communauté', path: '/communaute', icon: Users, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    { label: 'Notifications', path: '/notifications', icon: Bell, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
    { label: 'Service', path: '/service', icon: LifeBuoy, color: 'text-green-400 bg-green-400/10 border-green-400/20' },
    { label: 'Profil', path: '/profil', icon: UserIcon, color: 'text-red-400 bg-red-400/10 border-red-400/20' },
    { label: 'Calendrier', path: '/calendrier', icon: Calendar, color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
    { label: 'Rapports', path: '/rapports', icon: FileText, color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
    { label: 'Scanner QR', path: '/scan', icon: ScanLine, color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
];

// Helper exporté pour lire les raccourcis depuis localStorage
export const getStoredShortcuts = (): Record<ShortcutKey, boolean> => {
    try {
        const raw = localStorage.getItem(SHORTCUTS_KEY);
        if (raw) return { profileBar: false, profil: false, calendrier: false, rapports: false, formation: false, communaute: false, notifications: false, service: false, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    // Par défaut, seulement 4 raccourcis actifs
    return { profileBar: false, profil: false, calendrier: true, rapports: true, formation: true, communaute: true, notifications: false, service: false };
};

export const ParametresPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { role } = useAuth();

    const { data: userProfile } = useQuery({
        queryKey: ['userProfileParams'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            return data;
        },
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const [shortcuts, setShortcuts] = useState<Record<ShortcutKey, boolean>>(getStoredShortcuts);

    useEffect(() => {
        localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
    }, [shortcuts]);

    const MAX_SHORTCUTS = 5;
    const activeCount = Object.values(shortcuts).filter(Boolean).length;

    const toggleShortcut = (key: ShortcutKey) => {
        setShortcuts(prev => {
            const isCurrentlyOn = prev[key];
            // Bloquer si on essaie d'activer et que le max est atteint
            if (!isCurrentlyOn && activeCount >= MAX_SHORTCUTS) return prev;
            return { ...prev, [key]: !prev[key] };
        });
    };

    const sectionClass = 'bg-theme-surface rounded-xl border border-theme-border overflow-hidden';
    const sectionHeader = 'px-4 py-3 border-b border-theme-border';

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };


    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
            {/* Header */}
            <Navbar
                mode="subpage"
                title="Paramètres"
                subtitle={userProfile ? `${userProfile.prenom} ${userProfile.nom}` : 'Personnalisation'}
                showLogo
                onBack={() => navigate('/home')}
            />

            <main className="max-w-2xl mx-auto w-full p-4 pb-28 space-y-4">

                {/* ─── Section 1 : Raccourcis accueil ─── */}
                <div className={sectionClass}>
                    <div className={`${sectionHeader} flex items-center gap-3`}>
                        <button
                            onClick={() => navigate('/profil')}
                            className="w-10 h-10 shrink-0 rounded-xl overflow-hidden border border-theme-border bg-theme-bg shadow cursor-pointer hover:scale-105 transition-transform"
                        >
                            {userProfile?.avatar_url ? (
                                <img loading="lazy" src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-theme-accent-start/20 to-theme-accent-end/20 flex items-center justify-center">
                                    <span className="font-black text-sm uppercase tracking-tighter text-theme-accent-end">
                                        {userProfile?.prenom?.[0]}{userProfile?.nom?.[0]}
                                    </span>
                                </div>
                            )}
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-theme-text-secondary uppercase tracking-widest">Raccourcis de l'accueil</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeCount >= MAX_SHORTCUTS ? 'bg-red-500/20 text-red-400' : 'bg-theme-accent-start/20 text-theme-accent-start'}`}>
                                    {activeCount}/{MAX_SHORTCUTS}
                                </span>
                            </div>
                            <p className="text-[10px] text-theme-text-secondary mt-0.5">Maximum {MAX_SHORTCUTS} raccourcis activés.</p>
                        </div>
                    </div>
                    {ALL_SHORTCUTS.map((s, i) => {
                        const Icon = s.icon;
                        const isOn = shortcuts[s.key];
                        return (
                            <div key={s.key} className={`flex items-center justify-between px-4 py-3 ${i < ALL_SHORTCUTS.length - 1 ? 'border-b border-theme-border' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-theme-text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-theme-text-primary">{s.label}</p>
                                        <p className="text-[10px] text-theme-text-secondary">{s.description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleShortcut(s.key)}
                                    disabled={!isOn && activeCount >= MAX_SHORTCUTS}
                                    className={`relative w-11 h-6 rounded-full transition-all duration-300 border shrink-0 ${isOn ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end border-theme-accent-start cursor-pointer' : activeCount >= MAX_SHORTCUTS ? 'bg-theme-bg border-theme-border opacity-30 cursor-not-allowed' : 'bg-theme-bg border-theme-border cursor-pointer'}`}
                                    aria-label={`${isOn ? 'Désactiver' : 'Activer'} ${s.label}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${isOn ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* ─── Section 2 : Thème ─── */}
                <div className={sectionClass}>
                    <div className={sectionHeader}>
                        <span className="text-[10px] font-black text-theme-text-secondary uppercase tracking-widest">Apparence</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center shrink-0">
                                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                            </div>
                            <div>
                                <p className="text-sm font-black text-theme-text-primary">Mode {theme === 'dark' ? 'Sombre' : 'Clair'}</p>
                                <p className="text-[10px] text-theme-text-secondary">{theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer border shrink-0 ${theme === 'light' ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end border-theme-accent-start' : 'bg-theme-bg border-theme-border'}`}
                            aria-label="Basculer le thème"
                        >
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${theme === 'light' ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>

                {/* ─── Section 3 : Liens rapides ─── */}
                <div className={sectionClass}>
                    <div className={sectionHeader}>
                        <span className="text-[10px] font-black text-theme-text-secondary uppercase tracking-widest">Aller à</span>
                    </div>
                    {QUICK_LINKS.map((link, i) => {
                        const Icon = link.icon;
                        return (
                            <button
                                key={link.path}
                                onClick={() => navigate(link.path)}
                                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-theme-surface-hover transition-colors cursor-pointer text-left ${i < QUICK_LINKS.length - 1 ? 'border-b border-theme-border' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${link.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-theme-text-primary">{link.label}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-theme-text-secondary" />
                            </button>
                        );
                    })}
                </div>

                {/* ─── Section Admin (Si rôle admin) ─── */}
                {(role === 'admin' || role === 'coordinateur_general' || role === 'coordinateur_provincial') && (
                    <div className={sectionClass}>
                        <div className={sectionHeader}>
                            <span className="text-[10px] font-black text-theme-text-secondary uppercase tracking-widest">Administration</span>
                        </div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-theme-surface-hover transition-colors cursor-pointer text-left border-b border-theme-border"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-red-500 bg-red-500/10 border-red-500/20">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-theme-text-primary">Panel Admin</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-theme-text-secondary" />
                        </button>
                        <button
                            onClick={() => navigate('/admin/structures')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-theme-surface-hover transition-colors cursor-pointer text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-orange-500 bg-orange-500/10 border-orange-500/20">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-theme-text-primary">Structures</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-theme-text-secondary" />
                        </button>
                        <button
                            onClick={() => navigate('/cordon/')}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-theme-surface-hover transition-colors cursor-pointer text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-orange-500 bg-orange-500/10 border-orange-500/20">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-bold text-theme-text-primary">cordon</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-theme-text-secondary" />
                        </button>
                    </div>
                )}

                {/* ─── Section Déconnexion ─── */}
                <div className="flex justify-center pt-6 pb-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 rounded-xl font-black text-sm uppercase tracking-widest transition-all cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </button>
                </div>
            </main>
        </div>
    );
};
