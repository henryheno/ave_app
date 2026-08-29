import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    LayoutDashboard,
    ChevronRight,
    Users,
    PieChart,
    FileText,
    UserCircle,
    Briefcase,
    ShieldCheck,
    Sun,
    Moon,
    TrendingUp,
    Globe,
    Zap,
    AlertCircle,
    MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { getCurrentProfile } from '../../lib/profileCache';
import { PageLoader } from '../../monapp/Branding';
import { useTheme } from '../../monapp/ThemeContext';
import { StructureNode } from './components/StructureNode';
import { SexeStats } from './components/SexeStats';
import { FonctionsStats } from './components/FonctionsStats';

type TabType = 'dashboard' | 'hierarchy' | 'sexe' | 'branches' | 'roles' | 'membres' | 'publications';



export const CordonPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');

    // Data states
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [managedStructure, setManagedStructure] = useState<any>(null);

    const [subStructures, setSubStructures] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [publications, setPublications] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate('/auth');
                    return;
                }
                // 1. Get User Profile & Managed Structure
                const pData = await getCurrentProfile();
                if (!pData || !pData.coordinated_structure_id) {
                    setLoading(false);
                    return; // User is not a coordinator
                }
                setUserProfile(pData);
                // coordinatedStructureId is no longer used; removed.
                // setCoordinatedStructureId(pData.coordinated_structure_id);
                // If needed elsewhere, can derive from userProfile.
                // For now, we rely on userProfile.coordinated_structure_id directly.

                const { data: roleData } = await supabase
                    .from('utilisateurs')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setUserRole(roleData?.role || null);
                // Verify role permissions
                const allowedRoles = ['admin', 'superadmin', 'coordonateur'];
                if (!roleData?.role || !allowedRoles.includes(roleData.role)) {
                    navigate('/home');
                    return;
                }
                // 2. Get All Structures from cache (Optimisé : une seule requête pour réduire la latence)
                const allStructures = await getStructures();

                const sData = allStructures.find(s => s.id === pData.coordinated_structure_id);
                setManagedStructure(sData);

                const getAllDescendantStructures = (parentId: string): any[] => {
                    const children = allStructures.filter(s => s.parent_id === parentId);
                    let all: any[] = [...children];
                    if (children.length > 0) {
                        for (const child of children) {
                            all = [...all, ...getAllDescendantStructures(child.id)];
                        }
                    }
                    return all;
                };
                const allDescStructs = getAllDescendantStructures(pData.coordinated_structure_id);
                setSubStructures(allDescStructs);
                const allStructIds = [pData.coordinated_structure_id, ...allDescStructs.map(s => s.id)];
                // 5. Get Members
                const { data: mData } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('comi_id', allStructIds);
                setMembers(mData || []);
                // 6. Get Publications
                const { data: pubData } = await supabase
                    .from('publications')
                    .select('*, profile:profiles(nom, prenom)')
                    .in('structure_id', allStructIds)
                    .order('created_at', { ascending: false });
                setPublications(pubData || []);
                setLoading(false);
            } catch (e: any) {
                console.error('Erreur lors du chargement de la page Cordon :', e);
                setError(e.message || 'Erreur inconnue');
                setLoading(false);
            }
        };
        init();
    }, []);

    // ------------------------------------------------------
    // Arbre récursif de structures et statistiques cumulées
    // ------------------------------------------------------
    const structureTree = useMemo(() => {
        if (!managedStructure) return null;

        // Récupérer rÃ©cursivement tous les IDs descendants sous un parent donné (y compris lui-même)
        const getSubtreeIds = (structId: string): string[] => {
            const ids = [structId];
            const directChildren = subStructures.filter(s => s.parent_id === structId);
            directChildren.forEach(child => {
                ids.push(...getSubtreeIds(child.id));
            });
            return ids;
        };

        // Calculer les statistiques cumulées pour un ensemble d'IDs
        const calculateStatsForIds = (ids: string[]) => {
            const membersInSubtree = members.filter(m => ids.includes(m.comi_id));
            const total = membersInSubtree.length;
            const male = membersInSubtree.filter(m => m.sexe === 'M').length;
            const female = membersInSubtree.filter(m => m.sexe === 'F').length;
            return { total, male, female };
        };

        // Fonction rÃ©cursive pour construire chaque nœud de l'arbre
        const buildNode = (struct: any): any => {
            const children = subStructures
                .filter(s => s.parent_id === struct.id)
                .map(child => buildNode(child));

            const subtreeIds = getSubtreeIds(struct.id);
            const nodeStats = calculateStatsForIds(subtreeIds);
            const directCount = members.filter(m => m.comi_id === struct.id).length;

            return {
                ...struct,
                children,
                stats: {
                    ...nodeStats,
                    directCount
                }
            };
        };

        return buildNode(managedStructure);
    }, [managedStructure, subStructures, members]);


    // ------------------------------------------------------
    // 0ï¸âƒ£ Mémo pour les stats globales
    // ------------------------------------------------------
    const stats = useMemo(() => {
        const total = members.length;
        const male = members.filter(m => m.sexe === 'M').length;
        const female = members.filter(m => m.sexe === 'F').length;
        const branches = members.reduce((acc, m) => {
            const branchKey = (m.branche || 'enfant').toLowerCase();
            acc[branchKey] = (acc[branchKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const functions = members.reduce((acc, m) => {
            const fn = m.fonction || 'Membre';
            acc[fn] = (acc[fn] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return { total, male, female, branches, functions };
    }, [members]);

    if (loading) return <PageLoader />;

    if (error) {
        return (
            <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col items-center justify-center p-6 text-center space-y-6 transition-theme">
                <div className="w-20 h-20 bg-theme-surface rounded-2xl flex items-center justify-center border border-theme-border">
                    <AlertCircle className="w-10 h-10 text-theme-accent-start" />
                </div>
                <div className="space-y-1.5">
                    <h2 className="text-lg font-black uppercase tracking-wider text-theme-text-primary">Erreur</h2>
                    <p className="text-theme-text-secondary text-[9px] font-bold uppercase max-w-xs">{error}</p>
                </div>
                <button
                    onClick={() => navigate('/home')}
                    className="px-6 py-3 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer shadow"
                >
                    Retour Ã  l'accueil
                </button>
            </div>
        );
    }

    if (!userProfile?.coordinated_structure_id) {
        return (
            <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col items-center justify-center p-6 text-center space-y-6 transition-theme">
                <div className="w-20 h-20 bg-theme-surface rounded-2xl flex items-center justify-center border border-theme-border">
                    <ShieldCheck className="w-10 h-10 text-theme-accent-start" />
                </div>
                <div className="space-y-1.5">
                    <h2 className="text-lg font-black uppercase tracking-wider text-theme-text-primary">Accès Restreint</h2>
                    <p className="text-theme-text-secondary text-[9px] font-bold uppercase max-w-xs">Cet espace est réservé aux coordonnateurs d'entités.</p>
                </div>
                <button
                    onClick={() => navigate('/home')}
                    className="px-6 py-3 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer shadow"
                >
                    Retour Ã  l'accueil
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans pb-20 transition-theme h-screen overflow-hidden">
            {/* TOP NAVBAR (Super Compact & Consistent) */}
            <header className="bg-theme-bg/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 transition-theme shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => navigate('/home')}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer shrink-0"
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
                        <span className="block font-black text-theme-text-primary text-sm md:text-base leading-none uppercase tracking-tighter truncate">
                            Cordon du {managedStructure?.type}
                        </span>
                        <span className="text-[9px] font-bold text-theme-accent-end uppercase tracking-wider truncate block mt-0.5">
                            {managedStructure?.name}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Forum Button */}
                    <button
                        onClick={() => navigate('/cordon/forum')}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-accent-start transition-all border border-theme-border cursor-pointer flex items-center gap-2"
                        title="Forum des Coordonnateurs"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Forum</span>
                    </button>
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
                        title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </button>
                    <div className="hidden md:flex flex-col items-end mr-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-theme-text-primary">{userProfile?.prenom} {userProfile?.nom}</span>
                        <span className="text-[8px] font-bold text-theme-accent-start uppercase tracking-tighter">Rôle: {userRole}</span>
                        <span className="text-[8px] font-bold text-theme-accent-end uppercase tracking-tighter ml-2">Coordon de la {managedStructure?.type} — {managedStructure?.name}</span>
                    </div>
                    <div className="w-9 h-9 bg-theme-surface border border-theme-border rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        <span className="text-[10px] font-black text-theme-text-primary">{userProfile?.prenom[0]}{userProfile?.nom[0]}</span>
                    </div>
                </div>
            </header>

            {/* TAB NAVIGATION - Dense & Economical */}
            <nav className="bg-theme-surface border-b border-theme-border p-2 flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar transition-theme">
                {[
                    { id: 'dashboard', icon: TrendingUp, label: 'Synthèse' },
                    { id: 'hierarchy', icon: LayoutDashboard, label: 'Hiérarchie' },
                    { id: 'branches', icon: Globe, label: 'Branches' },
                    { id: 'sexe', icon: PieChart, label: 'Sexe' },
                    { id: 'roles', icon: Briefcase, label: 'Rôles' },
                    { id: 'membres', icon: Users, label: 'Membres' },
                    { id: 'publications', icon: FileText, label: 'Pubs' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-1.5 px-4.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer ${activeTab === tab.id ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow shadow-theme-accent-start/15 scale-105' : 'text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text-primary'}`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            <main className="flex-1 overflow-y-auto no-scrollbar p-4">
                <div className="max-w-4xl mx-auto space-y-5">

                    {activeTab === 'dashboard' && (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-5">
                            {/* HERO BANNER COMPACT */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-theme-accent-start to-theme-accent-end p-6 rounded-2xl shadow-lg shadow-theme-accent-start/15 transition-theme">
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <Zap className="w-20 h-20 text-white" />
                                </div>
                                <div className="relative z-10 space-y-1">
                                    <h2 className="text-xl font-black text-white tracking-tighter leading-none">Statistiques de la stucture</h2>

                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {[
                                    { label: 'Effectif', value: stats.total, icon: Users },
                                    { label: 'Pubs', value: publications.length, icon: FileText },
                                    { label: 'Enfants', value: stats.branches['enfant'], icon: Users },
                                    { label: 'Sous-unités', value: subStructures.length, icon: Globe },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-theme-surface backdrop-blur-xl p-5 rounded-2xl border border-theme-border flex flex-col gap-2.5 transition-theme">
                                        <div className="w-9 h-9 bg-theme-bg border border-theme-border rounded-lg flex items-center justify-center text-theme-accent-start">
                                            <item.icon className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest">{item.label}</p>
                                            <p className="text-xl font-black text-theme-text-primary tracking-tighter mt-1 leading-none">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'hierarchy' && (
                        <div className="animate-in fade-in slide-in-from-left-6 duration-500 space-y-5">
                            <div className="relative overflow-hidden bg-gradient-to-br from-theme-accent-start to-theme-accent-end p-6 rounded-2xl shadow-lg shadow-theme-accent-start/15 transition-theme">
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <Zap className="w-20 h-20 text-white" />
                                </div>
                                <div className="relative z-10 space-y-1">
                                    <h2 className="text-xl font-black text-white tracking-tighter leading-none">Hiérarchie de la structure</h2>
                                    <p className="text-white/80 text-[9px] font-bold uppercase tracking-[0.2em]">{managedStructure?.type} - {managedStructure?.name}</p>
                                </div>
                            </div>

                            <div className="bg-theme-surface/20 border border-theme-border rounded-2xl p-4 md:p-6 space-y-3 transition-theme">
                                {structureTree ? (
                                    <StructureNode node={structureTree} members={members} />
                                ) : (
                                    <div className="py-12 text-center opacity-40 bg-theme-surface rounded-2xl border border-dashed border-theme-border transition-theme">
                                        <LayoutDashboard className="w-12 h-12 mx-auto mb-3 text-theme-text-secondary" />
                                        <p className="text-xs font-black uppercase tracking-[0.4em] text-theme-text-secondary">Aucune structure racine trouvée</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sexe' && (
                        <SexeStats stats={stats} />
                    )}

                    {activeTab === 'branches' && (
                        <div className="animate-in fade-in slide-in-from-right-6 duration-500 space-y-3.5">
                            <div className="bg-theme-surface p-4 rounded-xl border border-theme-border flex items-center justify-between transition-theme">
                                <h3 className="text-[10px] font-black uppercase tracking-wider text-theme-text-primary flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-theme-accent-start" /> Répartition par Branche
                                </h3>
                                <span className="text-[8px] font-black text-theme-text-secondary uppercase px-2.5 py-1 bg-theme-bg rounded-full border border-theme-border">3 Branches</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {[
                                    { key: 'enfant', label: 'Enfants (KA)', color: 'from-yellow-500 to-yellow-600' },
                                    { key: 'archange', label: 'Archanges', color: 'from-red-500 to-red-600' },
                                    { key: 'perame', label: 'Pérames', color: 'from-blue-500 to-blue-600' }
                                ].map(branch => (
                                    <div key={branch.key} className="group p-4 bg-theme-surface backdrop-blur-xl rounded-xl border border-theme-border flex items-center justify-between hover:bg-theme-surface-hover hover:border-theme-accent-start/30 transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 bg-gradient-to-br ${branch.color} rounded-lg border border-transparent flex items-center justify-center text-white text-[10px] font-black group-hover:scale-105 transition-transform shadow-md`}>
                                                {branch.label.substring(0, 1)}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-tight text-theme-text-primary block">{branch.label}</span>
                                                <span className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest mt-1 block">
                                                    {stats.total > 0 ? Math.round((stats.branches[branch.key] / stats.total) * 100) : 0}% de l'effectif
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-1 bg-theme-bg rounded-full overflow-hidden hidden sm:block">
                                                <div className={`h-full bg-gradient-to-r ${branch.color}`} style={{ width: `${stats.total > 0 ? (stats.branches[branch.key] / stats.total) * 100 : 0}%` }} />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-base font-black text-theme-text-primary block leading-none">{stats.branches[branch.key]}</span>
                                                <span className="text-[8px] font-bold text-theme-text-secondary uppercase">Membres</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <FonctionsStats functions={stats.functions} total={stats.total} />
                    )}

                    {activeTab === 'membres' && (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-3.5">
                            <div className="flex items-center justify-between p-3.5 bg-theme-surface rounded-xl border border-theme-border transition-theme">
                                <h3 className="text-[10px] font-black text-theme-text-primary uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-4 h-4 text-theme-accent-end" /> Nos Membres
                                </h3>
                                <span className="text-[8px] font-black text-theme-accent-end uppercase">{members.length} Profils actifs</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {members.map(m => {
                                    const branchNorm = (m.branche || 'enfant').toLowerCase();
                                    const isBranchEnfant = branchNorm === 'enfant' || branchNorm === 'ka' || branchNorm === 'anges';
                                    const isBranchArchange = branchNorm === 'archange' || branchNorm === 'archanges';
                                    const isBranchPerame = branchNorm === 'perame' || branchNorm === 'perames' || branchNorm === 'pÃ©rames';

                                    const branchLabel = isBranchEnfant ? 'Enfants (KA)' : isBranchArchange ? 'Archanges' : isBranchPerame ? 'Pérames' : 'Non défini';
                                    const branchColor = isBranchEnfant ? 'yellow' : isBranchArchange ? 'red' : isBranchPerame ? 'blue' : 'gray';

                                    return (
                                        <div key={m.id} className="p-3.5 bg-theme-surface backdrop-blur-xl rounded-xl border border-theme-border flex items-center justify-between group hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 bg-theme-bg rounded-lg flex items-center justify-center border border-theme-border text-theme-text-secondary group-hover:rotate-3 transition-all shrink-0">
                                                    <UserCircle className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-black text-theme-text-primary group-hover:text-theme-accent-end transition-colors leading-none truncate uppercase tracking-tight">{m.prenom} {m.nom}</p>
                                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase ${branchColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-600' : branchColor === 'red' ? 'bg-red-500/20 text-red-600' : branchColor === 'blue' ? 'bg-blue-500/20 text-blue-600' : 'bg-gray-500/20 text-gray-600'}`}>
                                                            {branchLabel.substring(0, 3)}
                                                        </span>
                                                        {m.fonction && (
                                                            <span className="text-[7px] font-bold text-theme-text-secondary bg-theme-bg px-1.5 py-0.5 rounded uppercase truncate">{m.fonction}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${m.sexe === 'M' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                                                <button className="p-2 bg-theme-bg rounded-lg text-theme-text-secondary hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer">
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'publications' && (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-4">
                            <div className="bg-theme-surface p-4 rounded-xl border border-theme-border flex items-center justify-between transition-theme">
                                <h3 className="text-[10px] font-black text-theme-text-primary uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-theme-accent-start" /> Flux de Publications
                                </h3>
                                <span className="text-[8px] font-black text-theme-text-secondary uppercase">{publications.length} Documents</span>
                            </div>
                            <div className="space-y-3.5">
                                {publications.length > 0 ? publications.map(pub => (
                                    <div key={pub.id} className="p-5 bg-theme-surface backdrop-blur-xl rounded-2xl border border-theme-border group hover:border-theme-accent-start/30 transition-all duration-300 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-theme-accent-start/[0.02] rounded-full -mr-10 -mt-10 transition-all group-hover:scale-150" />
                                        <div className="flex items-center justify-between mb-3 relative z-10">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 bg-theme-bg border border-theme-border rounded-lg flex items-center justify-center text-theme-accent-start shadow-sm">
                                                    <FileText className="w-4.5 h-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-theme-text-primary uppercase tracking-tight">{pub.titre}</p>
                                                    <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] mt-0.5">Par {pub.profile?.prenom} {pub.profile?.nom}</p>
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest">{new Date(pub.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-[11px] text-theme-text-secondary leading-relaxed line-clamp-2 relative z-10 font-medium">{pub.content || pub.contenu}</p>
                                    </div>
                                )) : (
                                    <div className="py-16 text-center opacity-40 bg-theme-surface rounded-2xl border border-dashed border-theme-border transition-theme">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-theme-text-secondary" />
                                        <p className="text-xs font-black uppercase tracking-[0.4em] text-theme-text-secondary">Archive Vide</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
export default CordonPage;
