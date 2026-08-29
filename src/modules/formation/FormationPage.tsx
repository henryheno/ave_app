import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../monapp/AuthContext';
import { useTheme } from '../../monapp/ThemeContext';
import {
    ArrowLeft,
    Plus,
    Sun,
    Moon,
    Users,
    User as UserIcon,
    FileText,

} from 'lucide-react';
import { PageLoader } from '../../monapp/Branding';

const CATEGORIES = [
    { key: 'anges', label: 'Anges' },
    { key: 'archanges', label: 'Sessions' },
    { key: 'perames', label: 'Pérames' },
    { key: 'autre', label: 'Autre' },
];

const TYPE_CONFIG = {
    unique: { label: 'Leçon Unique', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    troupe: { label: 'Par Troupe', icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
};

const CAT_COLORS: Record<string, string> = {
    anges: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    archanges: 'text-red-400 bg-red-400/10 border-red-400/30',
    perames: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    autre: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
};

export const FormationPage = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeCategory, setActiveCategory] = useState('anges');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    // Remettre à la page 1 si on change de catégorie
    const handleCategoryChange = (key: string) => {
        setActiveCategory(key);
        setCurrentPage(1);
    };

    const canCreate = role === 'admin' || role === 'superadmin';

    const { data: lecons = [], isLoading } = useQuery({
        queryKey: ['formations_lecons', activeCategory],
        queryFn: async () => {
            let query = supabase
                .from('formations_lecons')
                .select('*')
                .order('numero', { ascending: true });
            if (activeCategory !== 'tous') query = query.eq('categorie', activeCategory);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
    });

    if (isLoading && lecons.length === 0) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
            {/* HEADER */}
            <header className="bg-theme-bg/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/home')}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer">
                        <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-7 h-7 object-contain" />
                    </button>
                    <div>
                        <span className="block font-black text-theme-text-primary text-base leading-none uppercase tracking-tighter">Formation</span>
                        <span className="text-[8px] font-bold text-theme-accent-end uppercase tracking-[0.25em] opacity-80">Leçons & Enseignements</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border cursor-pointer"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => navigate('/formation/creer')}
                            className="p-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl shadow transition-all hover:opacity-90 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto w-full p-4 pb-28 space-y-4">
                {/* Filtres par catégorie */}
                <div className="flex bg-theme-surface p-1.5 rounded-xl border border-theme-border shadow-inner w-full overflow-x-auto no-scrollbar gap-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => handleCategoryChange(cat.key)}
                            className={`flex-1 px-3 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap ${activeCategory === cat.key
                                ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-lg'
                                : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface-hover'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Liste des leçons */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-6 h-6 border-2 border-theme-accent-start border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : lecons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-theme-text-secondary">
                        <FileText className="w-10 h-10 opacity-30" />
                        <p className="text-sm font-medium">Aucune leçon disponible</p>
                        {canCreate && (
                            <button
                                onClick={() => navigate('/formation/creer')}
                                className="mt-2 px-4 py-2 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl text-xs font-black"
                            >
                                Créer la première leçon
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {lecons
                                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                                .map((lecon: any) => {
                                    const typeConf = TYPE_CONFIG[lecon.type_lecon as keyof typeof TYPE_CONFIG];
                                    const TypeIcon = typeConf?.icon || FileText;
                                    const catColor = CAT_COLORS[lecon.categorie] || CAT_COLORS['autre'];
                                    return (
                                        <button
                                            key={lecon.id}
                                            onClick={() => navigate(`/formation/${lecon.id}`)}
                                            className="w-full bg-theme-surface rounded-xl border border-theme-border p-3 text-left space-y-2 transition-all hover:border-theme-accent-start/40 hover:bg-theme-surface-hover group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-theme-bg border border-theme-border shrink-0">

                                                        <span className="text-xs font-black text-theme-text-primary leading-none">N°{lecon.numero}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${typeConf?.color} ${typeConf?.bg} ${typeConf?.border}`}>
                                                                <TypeIcon className="w-2.5 h-2.5" />
                                                                {typeConf?.label}
                                                            </span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${catColor}`}>
                                                                {lecon.categorie}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-black text-theme-text-primary text-sm leading-tight line-clamp-1">{lecon.theme_general}</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-theme-border/50">
                                                <div className="w-5 h-5 rounded-full bg-theme-bg border border-theme-border flex items-center justify-center">
                                                    <UserIcon className="w-2.5 h-2.5 text-theme-text-secondary" />
                                                </div>
                                                <span className="text-[10px] font-bold text-theme-text-secondary line-clamp-1">
                                                    Animée par : {lecon.animateur}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>

                        {/* Pagination */}
                        {lecons.length > PAGE_SIZE && (
                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 text-xs font-black rounded-lg bg-theme-surface border border-theme-border text-theme-text-secondary hover:bg-theme-surface-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    ← Précédent
                                </button>
                                <span className="text-[10px] font-bold text-theme-text-secondary">
                                    Page {currentPage} / {Math.ceil(lecons.length / PAGE_SIZE)}
                                    <span className="ml-1 text-theme-text-secondary opacity-60">({lecons.length} leçons)</span>
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(lecons.length / PAGE_SIZE), p + 1))}
                                    disabled={currentPage === Math.ceil(lecons.length / PAGE_SIZE)}
                                    className="px-3 py-2 text-xs font-black rounded-lg bg-theme-surface border border-theme-border text-theme-text-secondary hover:bg-theme-surface-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    Suivant →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};
