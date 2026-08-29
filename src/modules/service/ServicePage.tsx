import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    Bug,
    Lightbulb,
    ChevronUp,
    Plus,
    X,
    Filter,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    LifeBuoy,
    Lock,
    MessageCircle,
    User as UserIcon,
    Globe,
    Send,
    Trash2,
    Menu,
    ChevronRight,
} from 'lucide-react';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import { useAuth } from '../../monapp/AuthContext';
import { Navbar } from '../../monapp/components/Navbar';

const MODULES = [
    'Accueil (Home)',
    'Publications',
    'Profil',
    'Communauté',
    'Notifications',
    'Chat IA',
    'Admin / Dashboard',
    'Structures',
    'Nominations',
    'Espace Coordonnateur',
    'Authentification',
    'Autre',
];

const TYPE_CONFIG = {
    bug: { label: 'Bug', icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    amelioration: { label: 'Amélioration', icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
};

const STATUT_CONFIG = {
    ouvert: { label: 'Ouvert', icon: Clock, color: 'text-theme-text-secondary', bg: 'bg-theme-surface' },
    en_cours: { label: 'En cours', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    resolu: { label: 'Résolu', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
    refuse: { label: 'Refusé', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
};

const PRIORITE_CONFIG = {
    basse: { label: 'Basse', color: 'text-theme-text-secondary' },
    normale: { label: 'Normale', color: 'text-blue-400' },
    haute: { label: 'Haute', color: 'text-orange-400' },
    critique: { label: 'Critique !', color: 'text-red-500 animate-pulse' },
};

interface SignalementVote {
    user_id: string;
}

interface SignalementComment {
    id: string;
    author?: { avatar_url?: string; nom?: string };
    created_at: string;
    contenu: string;
}

interface Signalement {
    id: string;
    type: string;
    statut: string;
    priorite: string;
    module: string;
    titre: string;
    description: string;
    visibilite: string;
    created_at: string;
    author_id: string;
    votes?: SignalementVote[];
    commentaires?: SignalementComment[];
}

export const ServicePage = () => {
    const { showNotification } = useNotification();
    const { role } = useAuth();
    const queryClient = useQueryClient();

    // REAL-TIME: Écouter les changements sur les signalements
    useEffect(() => {
        const channel = supabase
            .channel('realtime:signalements')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'signalements' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['signalements'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const [activeTab, setActiveTab] = useState<'tous' | 'bug' | 'amelioration'>('tous');
    const [showForm, setShowForm] = useState(false);
    const [filterStatut, setFilterStatut] = useState<string>('');
    const [filterModule, setFilterModule] = useState<string>('');
    const [showSidebar, setShowSidebar] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);
    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        const handleResize = () => setShowSidebar(window.innerWidth > 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [form, setForm] = useState({
        type: 'bug' as 'bug' | 'amelioration',
        module: '',
        titre: '',
        description: '',
        priorite: 'normale' as 'basse' | 'normale' | 'haute' | 'critique',
        visibilite: 'public' as 'public' | 'prive',
    });

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
    });

    const { data: signalements = [], isLoading } = useQuery<Signalement[]>({
        queryKey: ['signalements', activeTab, filterStatut, filterModule],
        queryFn: async () => {
            let query = supabase
                .from('signalements')
                .select('*, votes:signalement_votes(user_id), commentaires:signalement_commentaires(*)')
                .order('created_at', { ascending: false });

            if (activeTab !== 'tous') query = query.eq('type', activeTab);
            if (filterStatut) query = query.eq('statut', filterStatut);
            if (filterModule) query = query.eq('module', filterModule);

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as unknown as Signalement[];
        },
    });

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!currentUser) throw new Error('Non authentifié');
            const { error } = await supabase.from('signalements').insert({
                author_id: currentUser.id,
                type: form.type,
                module: form.module,
                titre: form.titre,
                description: form.description,
                priorite: form.priorite,
                visibilite: form.visibilite,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signalements'] });
            showNotification('Signalement envoyé avec succès !', 'success');
            setShowForm(false);
            setForm({ type: 'bug', module: '', titre: '', description: '', priorite: 'normale', visibilite: 'public' });
        },
        onError: (error) => {
            console.error('Erreur détaillée de Supabase:', error);
            showNotification("Erreur lors de l'envoi. Vérifiez la console.", 'error');
        },
    });

    const voteMutation = useMutation({
        mutationFn: async ({ signalementId, hasVoted }: { signalementId: string; hasVoted: boolean }) => {
            if (!currentUser) return;
            if (hasVoted) {
                await supabase.from('signalement_votes').delete()
                    .eq('signalement_id', signalementId).eq('user_id', currentUser.id);
            } else {
                await supabase.from('signalement_votes').insert({ signalement_id: signalementId, user_id: currentUser.id });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['signalements'] }),
    });

    const updateStatutMutation = useMutation({
        mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
            const { error } = await supabase.from('signalements').update({ statut }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signalements'] });
            showNotification('Statut mis à jour', 'success');
        },
    });

    const commentMutation = useMutation({
        mutationFn: async ({ signalementId, contenu }: { signalementId: string; contenu: string }) => {
            if (!currentUser) throw new Error('Non authentifié');
            const { error } = await supabase.from('signalement_commentaires').insert({
                signalement_id: signalementId,
                author_id: currentUser.id,
                contenu,
            });
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['signalements'] });
            setCommentInputs(prev => ({ ...prev, [variables.signalementId]: '' }));
            showNotification('Commentaire ajouté', 'success');
        },
        onError: () => showNotification("Erreur lors de l'ajout du commentaire", 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('signalements').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signalements'] });
            showNotification('Signalement supprimé', 'success');
        },
        onError: () => showNotification('Erreur lors de la suppression', 'error'),
    });

    const handleSubmit = () => {
        if (!form.module || !form.titre || !form.description) {
            showNotification('Veuillez remplir tous les champs', 'error');
            return;
        }
        submitMutation.mutate();
    };

    const isAdmin = role === 'admin' || role === 'superadmin';
    const canReply = isAdmin || role === 'coordonateur';

    if (isLoading && signalements.length === 0) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme overflow-x-hidden">
            {/* NAVBAR */}
            <Navbar
                mode="subpage"
                title="Service"
                subtitle="Signalement & Idées"
                showLogo
                rightActions={
                    <>
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={`p-2.5 rounded-xl transition-all border cursor-pointer lg:hidden ${showSidebar ? 'bg-theme-accent-start text-white border-theme-accent-start' : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'}`}
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="p-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl shadow transition-all hover:opacity-90 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </>
                }
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* OVERLAY FOR MOBILE SIDEBAR */}
                {showSidebar && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] lg:hidden"
                        onClick={() => setShowSidebar(false)}
                    ></div>
                )}

                {/* SIDEBAR */}
                <aside className={`
                    fixed inset-y-0 left-0 z-[60] lg:relative lg:z-auto
                    bg-theme-surface border-r border-theme-border flex flex-col shrink-0 overflow-hidden 
                    transition-all duration-300 ease-in-out
                    ${showSidebar ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'}
                    lg:flex
                `}>
                    <div className="p-6 border-b border-theme-border bg-theme-bg/80 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 text-theme-text-primary mb-1">
                                <Filter className="w-4 h-4 text-theme-accent-start" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Filtres & Nav</h2>
                            </div>
                            <p className="text-[9px] text-theme-text-secondary font-bold uppercase tracking-tight">Affiner l'affichage</p>
                        </div>
                        <button onClick={() => setShowSidebar(false)} className="lg:hidden p-2 text-theme-text-secondary">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        {/* TABS VERTICAUX */}
                        <div className="space-y-1">
                            <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest px-2 mb-2">Catégorie</p>
                            <button
                                onClick={() => { setActiveTab('tous'); if (window.innerWidth < 1024) setShowSidebar(false); }}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl mb-1 transition-all cursor-pointer group ${activeTab === 'tous' ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1' : 'hover:bg-theme-surface-hover text-theme-text-secondary'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeTab === 'tous' ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg'}`}>
                                        <LifeBuoy className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tight">Tous les signalements</span>
                                </div>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'tous' ? 'text-theme-accent-start' : 'opacity-0 group-hover:opacity-50'}`} />
                            </button>
                            {(['bug', 'amelioration'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); if (window.innerWidth < 1024) setShowSidebar(false); }}
                                    className={`w-full flex items-center justify-between p-3 rounded-2xl mb-1 transition-all cursor-pointer group ${activeTab === tab ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1' : 'hover:bg-theme-surface-hover text-theme-text-secondary'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${activeTab === tab ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg'}`}>
                                            {tab === 'bug' ? <Bug className="w-4 h-4 text-red-500" /> : <Lightbulb className="w-4 h-4 text-blue-400" />}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tight">{tab === 'bug' ? 'Bugs' : 'Idées / Améliorations'}</span>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === tab ? 'text-theme-accent-start' : 'opacity-0 group-hover:opacity-50'}`} />
                                </button>
                            ))}
                        </div>

                        {/* FILTRES SECONDAIRES */}
                        <div className="space-y-3 pt-2 border-t border-theme-border/50">
                            <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest px-2 mb-2">Filtres avancés</p>
                            <div>
                                <label className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider block mb-1 px-2">Statut</label>
                                <select
                                    value={filterStatut}
                                    onChange={e => setFilterStatut(e.target.value)}
                                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text-primary outline-none cursor-pointer"
                                >
                                    <option value="">Tous les statuts</option>
                                    {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider block mb-1 px-2">Module</label>
                                <select
                                    value={filterModule}
                                    onChange={e => setFilterModule(e.target.value)}
                                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-text-primary outline-none cursor-pointer"
                                >
                                    <option value="">Tous les modules</option>
                                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            {(filterStatut || filterModule) && (
                                <button
                                    onClick={() => { setFilterStatut(''); setFilterModule(''); }}
                                    className="w-full p-2.5 rounded-xl bg-theme-bg text-[9px] font-black text-theme-text-secondary uppercase tracking-widest hover:text-theme-accent-start border border-theme-border hover:border-theme-accent-start/20 transition-all cursor-pointer"
                                >
                                    Réinitialiser les filtres
                                </button>
                            )}
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 w-full relative pb-28 space-y-5">
                    {/* INFO BAR */}
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-theme-text-secondary bg-theme-surface border border-theme-border p-3 rounded-xl mb-4">
                        <Filter className="w-3 h-3 shrink-0" />
                        <span className="shrink-0">Filtre actif :</span>
                        <span className="px-2.5 py-1 rounded-full bg-theme-accent-start/10 text-theme-accent-start">
                            {activeTab === 'tous' ? 'Tous' : activeTab === 'bug' ? 'Bugs' : 'Idées'}
                        </span>
                    </div>

                    {/* STATS ADMIN UNIQUEMENT */}
                    {isAdmin && (
                        <div className="bg-theme-surface rounded-xl border border-theme-border px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-theme-accent-start to-theme-accent-end flex items-center justify-center shrink-0">
                                    <LifeBuoy className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h1 className="font-black text-theme-text-primary text-sm leading-none tracking-tight">Statistiques Globales</h1>
                                    <p className="text-theme-text-secondary text-[10px] mt-0.5">Vue Admin</p>
                                </div>
                            </div>
                            <div className="flex items-center divide-x divide-theme-border shrink-0">
                                {[
                                    { label: 'Total', value: signalements.length, color: 'text-theme-text-primary' },
                                    { label: 'Bugs', value: signalements.filter((s: Signalement) => s.type === 'bug').length, color: 'text-red-500' },
                                    { label: 'Idées', value: signalements.filter((s: Signalement) => s.type === 'amelioration').length, color: 'text-blue-400' },
                                ].map(stat => (
                                    <div key={stat.label} className="text-center px-3">
                                        <p className={`text-base font-black leading-none ${stat.color}`}>{stat.value}</p>
                                        <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-wider mt-0.5">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LISTE */}
                    <div className="space-y-3">
                        {isLoading ? (
                            <p className="text-center text-sm text-theme-text-secondary py-12">Chargement…</p>
                        ) : signalements.length === 0 ? (
                            <div className="text-center py-16 space-y-3 bg-theme-surface rounded-2xl border border-theme-border">
                                <LifeBuoy className="w-10 h-10 text-theme-text-secondary mx-auto opacity-40" />
                                <p className="text-sm font-bold text-theme-text-secondary">Aucun signalement</p>
                                <button onClick={() => setShowForm(true)} className="text-[11px] text-theme-accent-start hover:underline cursor-pointer">
                                    Créer le premier
                                </button>
                            </div>
                        ) : signalements.map(s => {
                            const typeConf = TYPE_CONFIG[s.type as keyof typeof TYPE_CONFIG];
                            const statutConf = STATUT_CONFIG[s.statut as keyof typeof STATUT_CONFIG];
                            const prioriteConf = PRIORITE_CONFIG[s.priorite as keyof typeof PRIORITE_CONFIG];
                            const TypeIcon = typeConf?.icon || Bug;
                            const StatutIcon = statutConf?.icon || Clock;
                            const hasVoted = s.votes?.some((v: SignalementVote) => v.user_id === currentUser?.id);
                            const voteCount = s.votes?.length || 0;

                            return (
                                <div key={s.id} className="bg-theme-surface rounded-2xl border border-theme-border p-4 space-y-3 transition-all hover:border-theme-accent-start/30 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={() => voteMutation.mutate({ signalementId: s.id, hasVoted: hasVoted ?? false })}
                                                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${hasVoted ? 'bg-theme-accent-start text-white border-theme-accent-start shadow-md' : 'bg-theme-bg text-theme-text-secondary border-theme-border hover:border-theme-accent-start/50'}`}
                                            >
                                                <ChevronUp className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-black">{voteCount}</span>
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${typeConf?.color} ${typeConf?.bg} ${typeConf?.border}`}>
                                                        <TypeIcon className="w-2.5 h-2.5" />
                                                        {typeConf?.label}
                                                    </span>
                                                    <span className={`text-[8px] font-black uppercase tracking-wider ${prioriteConf?.color}`}>
                                                        {prioriteConf?.label}
                                                    </span>
                                                    {s.visibilite === 'prive' && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-theme-bg border border-theme-border text-theme-text-secondary">
                                                            <Lock className="w-2.5 h-2.5" /> Privé
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-black text-theme-text-primary text-sm leading-tight">{s.titre}</h3>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border border-transparent ${statutConf?.bg} ${statutConf?.color}`}>
                                                <StatutIcon className="w-3 h-3" />
                                                {statutConf?.label}
                                            </div>
                                            {currentUser?.id === s.author_id && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Es-tu sûr de vouloir supprimer ce signalement ?')) {
                                                            deleteMutation.mutate(s.id);
                                                        }
                                                    }}
                                                    disabled={deleteMutation.isPending}
                                                    className="text-theme-text-secondary hover:text-red-500 transition-colors p-1"
                                                    title="Supprimer mon signalement"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-[12px] text-theme-text-secondary leading-relaxed line-clamp-3 bg-theme-bg/50 p-3 rounded-xl border border-theme-border/50">{s.description}</p>

                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider px-2 py-0.5 bg-theme-bg rounded-full border border-theme-border shadow-sm">
                                            {s.module}
                                        </span>
                                        <span className="text-[9px] text-theme-text-secondary font-bold">
                                            {new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>

                                    {isAdmin && (
                                        <div className="flex gap-1.5 pt-3 border-t border-theme-border flex-wrap mt-2">
                                            <span className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest py-1 mr-2">Admin:</span>
                                            {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                                                <button
                                                    key={k}
                                                    onClick={() => updateStatutMutation.mutate({ id: s.id, statut: k })}
                                                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border transition-all cursor-pointer ${s.statut === k ? `${v.bg} ${v.color} border-current` : 'bg-theme-bg text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'}`}
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* COMMENTAIRES */}
                                    <div className="pt-2">
                                        <button
                                            onClick={() => setExpandedComments(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                                            className="text-[10px] font-bold text-theme-text-secondary hover:text-theme-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            {s.commentaires?.length || 0} commentaire{(s.commentaires?.length || 0) > 1 ? 's' : ''}
                                        </button>

                                        {expandedComments[s.id] && (
                                            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* Liste des commentaires */}
                                                <div className="space-y-2">
                                                    {(s.commentaires || []).map((c: SignalementComment) => (
                                                        <div key={c.id} className="bg-theme-bg p-2.5 rounded-xl border border-theme-border space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-4 h-4 rounded-full bg-theme-surface flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                                                        {c.author?.avatar_url ? (
                                                                            <img loading="lazy" src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <UserIcon className="w-2.5 h-2.5 text-theme-text-secondary" />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[9px] font-black text-theme-text-primary truncate">
                                                                        {c.author?.nom || 'Utilisateur'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[8px] text-theme-text-secondary font-bold">
                                                                    {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-theme-text-secondary leading-relaxed pl-5">
                                                                {c.contenu}
                                                            </p>
                                                        </div>
                                                    ))}
                                                    {s.commentaires?.length === 0 && (
                                                        <p className="text-[10px] text-center text-theme-text-secondary py-2 italic">Aucun commentaire</p>
                                                    )}
                                                </div>

                                                {/* Formulaire d'ajout de commentaire */}
                                                {canReply && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="text"
                                                            value={commentInputs[s.id] || ''}
                                                            onChange={e => setCommentInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                                                            placeholder="Répondre..."
                                                            className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:border-theme-accent-start transition-colors"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && commentInputs[s.id]?.trim()) {
                                                                    commentMutation.mutate({ signalementId: s.id, contenu: commentInputs[s.id] });
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                if (commentInputs[s.id]?.trim()) {
                                                                    commentMutation.mutate({ signalementId: s.id, contenu: commentInputs[s.id] });
                                                                }
                                                            }}
                                                            disabled={!commentInputs[s.id]?.trim() || commentMutation.isPending}
                                                            className="p-2 bg-theme-accent-start text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            {/* MODAL FORMULAIRE */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-theme-bg border border-theme-border rounded-3xl w-full max-w-md p-6 space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-theme-text-primary text-base uppercase tracking-tighter">Nouveau signalement</h2>
                                <p className="text-[9px] text-theme-text-secondary font-bold uppercase tracking-wider mt-0.5">Aidez-nous à améliorer l'app</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 bg-theme-surface rounded-xl border border-theme-border cursor-pointer hover:bg-theme-surface-hover transition-all">
                                <X className="w-4 h-4 text-theme-text-secondary" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {(['bug', 'amelioration'] as const).map(t => {
                                const conf = TYPE_CONFIG[t];
                                const Icon = conf.icon;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setForm(f => ({ ...f, type: t }))}
                                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${form.type === t ? `${conf.bg} ${conf.color} ${conf.border}` : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'}`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-black text-[10px] uppercase tracking-wider">{conf.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary block">Module concerné *</label>
                            <div className="relative">
                                <select
                                    value={form.module}
                                    onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                                    className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-all cursor-pointer appearance-none pr-8
                                        ${form.module
                                            ? 'bg-theme-accent-start/10 border-theme-accent-start text-theme-accent-start font-bold'
                                            : 'bg-theme-surface border-theme-border text-theme-text-secondary'
                                        }`}
                                    style={{ colorScheme: 'inherit' }}
                                >
                                    <option value="" style={{ background: 'var(--color-surface, #1e1e1e)', color: 'inherit' }}>Sélectionner…</option>
                                    {MODULES.map(m => (
                                        <option key={m} value={m} style={{ background: 'var(--color-surface, #1e1e1e)', color: 'inherit' }}>{m}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className={`w-4 h-4 ${form.module ? 'text-theme-accent-start' : 'text-theme-text-secondary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary block">Titre *</label>
                            <input
                                type="text"
                                value={form.titre}
                                onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                                placeholder="Résumé en quelques mots…"
                                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:border-theme-accent-start transition-colors"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary block">Description *</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Décris le problème ou l'idée en détail…"
                                rows={4}
                                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2.5 text-sm text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:border-theme-accent-start transition-colors resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary block">Priorité</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {(Object.entries(PRIORITE_CONFIG)).map(([k, v]) => (
                                    <button
                                        key={k}
                                        onClick={() => setForm(f => ({ ...f, priorite: k as 'basse' | 'normale' | 'haute' | 'critique' }))}
                                        className={`py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${form.priorite === k ? 'bg-theme-accent-start text-white border-theme-accent-start' : 'bg-theme-surface border-theme-border text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary block">Visibilité</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                <button
                                    onClick={() => setForm(f => ({ ...f, visibilite: 'public' }))}
                                    className={`py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex justify-center items-center gap-1.5 ${form.visibilite === 'public' ? 'bg-theme-accent-start text-white border-theme-accent-start' : 'bg-theme-surface border-theme-border text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                                >
                                    <Globe className="w-3 h-3" /> Public
                                </button>
                                <button
                                    onClick={() => setForm(f => ({ ...f, visibilite: 'prive' }))}
                                    className={`py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex justify-center items-center gap-1.5 ${form.visibilite === 'prive' ? 'bg-theme-surface text-theme-text-primary border-theme-text-primary shadow-inner' : 'bg-theme-surface border-theme-border text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                                >
                                    <Lock className="w-3 h-3" /> Privé
                                </button>
                            </div>
                            <p className="text-[8px] text-theme-text-secondary font-bold px-1">
                                {form.visibilite === 'public' ? 'Visible par toute la communauté.' : 'Seuls toi et les administrateurs pourront le voir.'}
                            </p>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitMutation.isPending}
                            className="w-full py-3 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-black text-sm uppercase tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {submitMutation.isPending ? 'Envoi…' : 'Envoyer le signalement'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
