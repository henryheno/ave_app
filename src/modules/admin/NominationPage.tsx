import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Home,
    ShieldCheck,
    MapPin,
    ChevronRight,
    Building2,
    Users,
    UserCircle,
    ArrowLeft,
    UserCog,
    Globe,
    Menu,
    X,
    Filter,
    Search,
    Building,
    LayoutGrid,
    Layers,
    Sun,
    Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { useTheme } from '../../monapp/ThemeContext';
import { useNotification } from '../../monapp/NotificationContext';

export const NominationPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Structures data
    const [allStructures, setAllStructures] = useState<any[]>([]);
    const [selectedStructure, setSelectedStructure] = useState<any>(null);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);

    // Members data
    const [members, setMembers] = useState<any[]>([]);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'role' | 'coord'>('role');
    // Rôle de l'utilisateur connecté
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [currentUserStructureId, setCurrentUserStructureId] = useState<string | null>(null);
    // Structures autorisées pour la nomination (même structure ou ancêtres)
    const allowedStructureIds = useMemo(() => {
        if (!currentUserStructureId) return [];
        return getAncestors(currentUserStructureId);
    }, [currentUserStructureId, allStructures]);
    
    // Charger le rôle du compte actuel
    useEffect(() => {
        const fetchCurrentUserInfo = async () => {
            const { data: user } = await supabase.auth.getUser();
            if (user?.user) {
                const { data: usr } = await supabase
                    .from('utilisateurs')
                    .select('role')
                    .eq('id', user.user.id)
                    .single();
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('comi_id')
                    .eq('id', user.user.id)
                    .single();
                if (usr) setCurrentUserRole(usr.role);
                if (profile) setCurrentUserStructureId(profile.comi_id);
            }
        };
        fetchCurrentUserInfo();
    }, []);


    // Initial Load
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: sData } = await supabase.from('structures').select('*').order('name');
            if (sData) setAllStructures(sData);
            setLoading(false);
        };
        init();
    }, []);

    // Tree Construction
    const structureTree = useMemo(() => {
        const buildTree = (parentId: string | null = null): any[] => {
            return allStructures
                .filter(s => s.parent_id === parentId)
                .map(s => ({
                    ...s,
                    children: buildTree(s.id)
                }));
        };
        return buildTree(null);
    }, [allStructures]);

    const getAllDescendantIds = (parentId: string, structures: any[]): string[] => {
        let ids = [parentId];
        const children = structures.filter(s => s.parent_id === parentId);
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, structures)];
        });
        return ids;
    };

    // Retourne la liste des ancêtres (incluant l'id lui-même) d'une structure donnée
    function getAncestors(structId: string): string[] {
        const ancestors: string[] = [];
        let currentId: string | null = structId;
        while (currentId) {
            ancestors.push(currentId);
            const struct = allStructures.find(s => s.id === currentId);
            if (!struct || !struct.parent_id) break;
            currentId = struct.parent_id;
        }
        return ancestors;
    }




    // Fetch Members
    const fetchMembers = async (search: string, structure: any, structures: any[]) => {
        setSearching(true);
        let query = supabase.from('profiles').select('*');

        if (search) {
            query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`);
        }

        if (structure) {
            const descendantIds = getAllDescendantIds(structure.id, structures);
            query = query.in('comi_id', descendantIds);
        }

        try {
            const [{ data: profilesData }, { data: usersData }] = await Promise.all([
                query.order('nom', { ascending: true }).limit(200),
                supabase.from('utilisateurs').select('id, role')
            ]);

            if (profilesData) {
                const merged = profilesData.map(p => ({
                    ...p,
                    utilisateurs: usersData?.find(u => u.id === p.id) || null
                }));
                setMembers(merged);
            }
        } catch (err) {
            console.error("Error fetching members:", err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMembers(searchTerm, selectedStructure, allStructures);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedStructure, allStructures]);

    const handleUpdateRole = async (memberId: string, newRole: string, structId?: string) => {
        setUpdating(true);
        try {
            // Vérifier la limite de coordonnateurs et la conformité à la hiérarchie de l'utilisateur
            if (newRole === 'coordonateur') {
                const targetStructId = structId || selectedStructure?.id;
                if (!targetStructId) {
                    showNotification('Veuillez sélectionner une structure pour la coordination.', 'error');
                    setUpdating(false);
                    return;
                }
                // Vérifier que la structure cible est autorisée (même structure ou ancêtre), sauf pour les admins
                if (currentUserRole !== 'admin' && !allowedStructureIds.includes(targetStructId)) {
                    showNotification('Vous ne pouvez nommer coordonnateur que dans votre structure ou ses ancêtres.', 'error');
                    setUpdating(false);
                    return;
                }
                const { count } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('coordinated_structure_id', targetStructId);
                if (count && count >= 3) {
                    showNotification('Cette structure a déjà le maximum de 3 coordonnateurs.', 'error');
                    setUpdating(false);
                    return;
                }
            }

            // Appeler la fonction sécurisée côté serveur pour changer le rôle
            const { error: rpcError } = await supabase.rpc('update_user_role', {
                p_target_user_id: memberId,
                p_new_role: newRole,
                p_structure_id: newRole === 'coordonateur' ? (structId || selectedStructure?.id) : null,
            });
            if (rpcError) throw rpcError;

            showNotification("Opération réussie !", "success");
            fetchMembers(searchTerm, selectedStructure, allStructures);
            setSelectedMember(null);
        } catch (error: any) {
            showNotification("Erreur: " + error.message, "error");
        } finally {
            setUpdating(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'PROV': return <Globe className="w-3.5 h-3.5" />;
            case 'CODI': return <Building2 className="w-3.5 h-3.5" />;
            case 'CORE': return <LayoutGrid className="w-3.5 h-3.5" />;
            case 'COMA': return <Layers className="w-3.5 h-3.5" />;
            case 'COMI': return <MapPin className="w-3.5 h-3.5" />;
            default: return <Building className="w-3.5 h-3.5" />;
        }
    };

    const StructureNode = ({ node, level = 0 }: { node: any, level?: number }) => {
        const [isExpanded, setIsExpanded] = useState(level < 1);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedStructure?.id === node.id;

        return (
            <div className="flex flex-col">
                <div
                    className={`
                        flex items-center justify-between p-2.5 rounded-xl mb-1 transition-all cursor-pointer group
                        ${isSelected ? 'bg-theme-accent-start text-white translate-x-1' : 'hover:bg-theme-surface-hover text-theme-text-secondary'}
                    `}
                >
                    <div
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                        onClick={() => {
                            setSelectedStructure(node);
                            if (window.innerWidth < 768) setShowSidebar(false);
                        }}
                    >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-white/20' : 'bg-theme-bg border border-theme-border text-theme-accent-end'}`}>
                            {getTypeIcon(node.type)}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-white' : 'text-theme-text-primary'}`}>{node.name}</p>
                            <p className={`text-[8px] font-bold uppercase opacity-80 ${isSelected ? 'text-white/80' : 'text-theme-accent-end'}`}>{node.type}</p>
                        </div>
                    </div>

                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className={`p-1.5 rounded-lg transition-all ${isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-theme-surface text-theme-text-secondary'}`}
                        >
                            <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className="ml-5 pl-2 border-l border-theme-border space-y-1 animate-in slide-in-from-left-2 duration-300">
                        {node.children.map((child: any) => (
                            <StructureNode key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const RecursiveStructureSelect = ({ node, level = 0 }: { node: any; level?: number }) => {
        const [isExpanded, setIsExpanded] = useState(level < 1);
        const nodeRef = useRef<HTMLDivElement>(null);
        const isSelected = selectedStructure?.id === node.id;
        const isAllowed = allowedStructureIds.includes(node.id);
        useEffect(() => {
            if (isSelected && nodeRef.current) {
                nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, [isSelected]);
        const hasChildren = node.children && node.children.length > 0;
        return (
            <div ref={nodeRef} className="flex flex-col ml-4">
                <div
                    className={`
                        flex items-center justify-between p-2 rounded hover:bg-theme-surface-hover cursor-pointer
                        ${isSelected ? 'bg-theme-surface border border-theme-accent-end shadow-sm' : ''}
                    `}
                    onClick={() => {
                        if (!isAllowed) return;
                        setSelectedStructure(node);
                        if (hasChildren) setIsExpanded(!isExpanded);
                        if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                >
                    <span className={`text-sm ${isSelected ? 'font-bold text-theme-accent-end' : 'text-theme-text-secondary'}`}>{node.name}</span>
                    {hasChildren && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="p-1 rounded"
                        >
                            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </div>
                {isExpanded && hasChildren && (
                    <div className="ml-4">
                        {node.children.map((child: any) => (
                            <RecursiveStructureSelect key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading && allStructures.length === 0) return <PageLoader />;

    return (
        <div className="h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans overflow-hidden transition-theme">
            {/* TOP NAVBAR */}
            <header className="bg-theme-bg/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 shrink-0 transition-theme">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border md:hidden shrink-0"
                        >
                            <ArrowLeft className="w-4.5 h-4.5" />
                        </button>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                            <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                        </div>
                        <div className="min-w-0">
                            <span className="block font-black text-theme-text-primary text-base leading-none uppercase tracking-tighter truncate">Nominations</span>
                            <span className="text-[9px] font-bold text-theme-accent-end uppercase tracking-[0.3em] truncate block mt-0.5">Administration</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer hidden sm:block"
                        title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </button>
                    <button
                        onClick={() => navigate('/admin')}
                        className="hidden md:flex p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border"
                        title="Retour Admin"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="p-2.5 bg-theme-surface text-theme-text-primary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border"
                        title="Accueil"
                    >
                        <Home className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`p-2.5 rounded-xl transition-all border border-theme-border ${showSidebar ? 'bg-theme-accent-start text-white' : 'bg-theme-surface text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* MOBILE BACKDROP */}
                {showSidebar && (
                    <div 
                        className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setShowSidebar(false)}
                    />
                )}

                {/* SIDEBAR */}
                <aside className={`
                    fixed inset-y-0 left-0 z-[60] md:relative md:z-auto
                    bg-theme-bg md:bg-theme-surface border-r border-theme-border flex flex-col shrink-0 overflow-hidden 
                    transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
                    ${showSidebar ? 'w-72 translate-x-0' : 'w-0 -translate-x-full'}
                    md:flex
                `}>
                    <div className="p-4 border-b border-theme-border bg-theme-surface-hover flex items-center justify-between shrink-0">
                        <div>
                            <div className="flex items-center gap-2.5 text-theme-text-primary mb-1">
                                <Building2 className="w-3.5 h-3.5 text-theme-accent-start" />
                                <h2 className="text-[10px] font-black uppercase tracking-widest">Unités</h2>
                            </div>
                            <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-tight">Navigation hiérarchique</p>
                        </div>
                        <button onClick={() => setShowSidebar(false)} className="md:hidden p-1.5 text-theme-text-secondary hover:bg-theme-surface rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                        <button
                            onClick={() => {
                                setSelectedStructure(null);
                                if (window.innerWidth < 768) setShowSidebar(false);
                            }}
                            className={`w-full text-left p-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 border border-transparent ${!selectedStructure ? 'bg-theme-accent-start text-white ' : 'text-theme-text-secondary hover:bg-theme-surface-hover border-theme-border'}`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Tous les Membres
                        </button>

                        <div className="space-y-1">
                            {structureTree.map((node: any) => (
                                <StructureNode key={node.id} node={node} />
                            ))}
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 flex flex-col bg-theme-bg transition-theme overflow-hidden w-full">
                    <div className="p-4 bg-theme-surface/50 border-b border-theme-border space-y-4 shrink-0">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative group">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searching ? 'text-theme-accent-start animate-pulse' : 'text-theme-text-secondary group-focus-within:text-theme-accent-start'}`} />
                                <input
                                    type="text"
                                    placeholder="Rechercher un membre par nom..."
                                    className="w-full bg-theme-surface border border-theme-border rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-theme-accent-start/20 focus:border-theme-accent-start/50 transition-all outline-none text-theme-text-primary placeholder:text-theme-text-secondary"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-[8px] font-black uppercase tracking-[0.2em] text-theme-text-secondary">
                            <Filter className="w-3 h-3 text-theme-accent-start" />
                            <span>Cible :</span>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full border ${selectedStructure ? 'bg-theme-accent-start/10 text-theme-accent-start border-theme-accent-start/20' : 'bg-theme-surface text-theme-text-secondary border-theme-border'}`}>
                                    {selectedStructure?.name || 'Globale'}
                                </span>
                                {selectedStructure && (
                                    <span className="bg-theme-surface text-theme-text-secondary border border-theme-border px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        Inclusion des descendants
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {members.map(m => (
                                <div key={m.id} className="p-4 bg-theme-surface backdrop-blur-xl rounded-2xl border border-theme-border flex items-center justify-between group hover:border-theme-accent-start/30 hover:bg-theme-surface-hover transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-theme-bg rounded-xl flex items-center justify-center border border-theme-border text-theme-text-secondary group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                                            <UserCircle className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-theme-text-primary group-hover:text-theme-accent-end transition-colors leading-none tracking-tight truncate capitalize">{m.prenom} {m.nom}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={`text-[7px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border ${m.utilisateurs?.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    m.utilisateurs?.role === 'coordonateur' ? 'bg-theme-accent-end/10 text-theme-accent-end border-theme-accent-end/20' :
                                                        'bg-theme-bg text-theme-text-secondary border-theme-border'
                                                    }`}>
                                                    {m.utilisateurs?.role}
                                                </span>
                                                {m.fonction && <span className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-tighter opacity-80 truncate max-w-[100px]">/ {m.fonction}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedMember(m)}
                                        className="w-10 h-10 bg-theme-bg text-theme-text-secondary hover:text-white hover:bg-theme-accent-start rounded-xl border border-theme-border transition-all flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                    >
                                        <UserCog className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {members.length === 0 && !searching && (
                            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40 py-16">
                                <div className="w-16 h-16 bg-theme-surface rounded-2xl flex items-center justify-center border border-theme-border">
                                    <Users className="w-8 h-8 text-theme-text-secondary" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-theme-text-primary uppercase tracking-[0.3em]">Aucun membre</p>
                                    <p className="text-[9px] text-theme-text-secondary font-bold uppercase mt-1.5">Utilisez la recherche ou sélectionnez une unité</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* NOMINATION MODAL */}
            {selectedMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-theme-bg/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-theme-surface rounded-2xl border border-theme-border shadow-2xl overflow-hidden animate-in zoom-in duration-300">

                        <div className="flex flex-col md:flex-row h-full min-h-[400px]">

                            {/* PARTIE GAUCHE (INFOS MEMBRE & ONGLETS DE SÉLECTION) */}
                            <div className="w-full md:w-2/5 p-6 text-theme-text-primary flex flex-col justify-between relative">
                                <div className="text-center md:text-left">
                                    <div className="w-16 h-16 bg-theme-bg/50 rounded-xl flex items-center justify-center mx-auto md:mx-0 mb-4 backdrop-blur-md border border-theme-border shadow-inner">
                                        <ShieldCheck className="w-8 h-8 text-theme-accent-start" />
                                    </div>
                                    <h3 className="text-xl font-black tracking-tighter leading-tight capitalize">{selectedMember.prenom} {selectedMember.nom}</h3>
                                    <p className="text-theme-text-secondary text-[9px] mt-1.5 uppercase tracking-[0.2em] font-black italic">Rôle Actuel : {selectedMember.utilisateurs?.role}</p>
                                </div>

                                {/* Sélecteur d'onglets vertical sur le côté gauche */}
                                <div className="flex flex-row md:flex-col gap-2 mt-6 md:mt-0 border-t md:border-t-0 md:border-l border-theme-border pt-4 md:pt-0 md:pl-4">
                                    <button
                                        className={`flex-1 md:flex-none text-left px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'role' ? 'bg-theme-bg text-theme-accent-start shadow-md' : 'text-theme-text-secondary hover:bg-theme-surface-hover border border-transparent'}`}
                                        onClick={() => setActiveTab('role')}
                                    >
                                        Gestion des Rôles
                                    </button>
                                    <button
                                        className={`flex-1 md:flex-none text-left px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'coord' ? 'bg-theme-bg text-theme-accent-start shadow-md' : 'text-theme-text-secondary hover:bg-theme-surface-hover border border-transparent'}`}
                                        onClick={() => setActiveTab('coord')}
                                    >
                                        Coordination
                                    </button>
                                </div>
                            </div>

                            {/* PARTIE DROITE (CONTENU DYNAMIQUE DE L'ONGLET SÉLECTIONNÉ) */}
                            <div className="w-full md:w-3/5 p-6 flex flex-col justify-between bg-theme-bg/50">
                                <div className="flex-1 flex flex-col justify-center">
                                    {activeTab === 'role' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-300">
                                            <button
                                                disabled={updating}
                                                onClick={() => handleUpdateRole(selectedMember.id, 'membre')}
                                                className="py-4 bg-theme-surface text-theme-text-secondary font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all flex items-center justify-center gap-2 border border-theme-border"
                                            >
                                                <Users className="w-4 h-4" /> Membre Standard
                                            </button>
                                            <button
                                                disabled={updating}
                                                onClick={() => handleUpdateRole(selectedMember.id, 'admin')}
                                                className={`py-4 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${currentUserRole === 'admin' || currentUserRole === 'superadmin' ? '' : 'opacity-40 pointer-events-none'}`}
                                            >
                                                <ShieldCheck className="w-4 h-4" /> Promouvoir Admin
                                            </button>
                                            <button
                                                disabled={updating}
                                                onClick={() => handleUpdateRole(selectedMember.id, 'superadmin')}
                                                className={`py-4 bg-gradient-to-r from-[#4B6AEE] to-[#9A71FF] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${currentUserRole === 'superadmin' ? '' : 'opacity-40 pointer-events-none'}`}
                                            >
                                                <UserCog className="w-4 h-4" /> Promouvoir Superadmin
                                            </button>
                                            <button
                                                disabled={updating}
                                                onClick={() => handleUpdateRole(selectedMember.id, 'membre')}
                                                className="py-4 bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                                            >
                                                <X className="w-4 h-4" /> Retirer Tous les Rôles
                                            </button>
                                        </div>
                                    )}

                                    {activeTab === 'coord' && (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="max-h-48 overflow-y-auto pr-2 border border-theme-border rounded-xl p-3 bg-theme-surface/30">
                                                <p className="text-[10px] font-bold text-theme-text-secondary mb-2 sticky top-0 bg-theme-bg py-1">Choisir la structure à coordonner :</p>
                                                {(() => {
                                                    // Construire la chaîne ancestrale du membre (sa comi jusqu'à la racine)
                                                    const memberStructId = selectedMember.comi_id;
                                                    if (!memberStructId) return (
                                                        <p className="text-[9px] text-red-500 font-bold">Ce membre n'est rattaché à aucune structure.</p>
                                                    );

                                                    // Chemin du membre vers la racine
                                                    const chain: any[] = [];
                                                    let currentId: string | null = memberStructId;
                                                    while (currentId) {
                                                        const struct = allStructures.find(s => s.id === currentId);
                                                        if (!struct) break;
                                                        chain.unshift(struct); // ajouter au début pour ordre racine → feuille
                                                        currentId = struct.parent_id ?? null;
                                                    }

                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            {chain.map((s, i) => {
                                                                const isSelected = selectedStructure?.id === s.id;
                                                                return (
                                                                    <button
                                                                        key={s.id}
                                                                        onClick={() => setSelectedStructure(s)}
                                                                        style={{ paddingLeft: `${8 + i * 12}px` }}
                                                                        className={`flex items-center gap-2 py-2 pr-2.5 rounded-lg text-left transition-all ${
                                                                            isSelected
                                                                                ? 'bg-theme-accent-end/10 border border-theme-accent-end/30 text-theme-accent-end'
                                                                                : 'text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text-primary'
                                                                        }`}
                                                                    >
                                                                        {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />}
                                                                        <span className="text-[8px] font-black uppercase tracking-wider opacity-80 shrink-0">{s.type}</span>
                                                                        <span className="text-[10px] font-bold truncate">{s.name}</span>
                                                                        {isSelected && <span className="ml-auto text-[7px] font-black uppercase tracking-wider bg-theme-accent-end/20 px-1.5 py-0.5 rounded border border-theme-accent-end/20 shrink-0">Sélectionné</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button
                                                    disabled={updating}
                                                    onClick={() => handleUpdateRole(selectedMember.id, 'coordonateur')}
                                                    className="py-4 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <UserCog className="w-4 h-4" /> Nommer Coordonnateur
                                                </button>
                                                <button
                                                    disabled={updating}
                                                    onClick={() => handleUpdateRole(selectedMember.id, 'membre')}
                                                    className="py-4 bg-theme-surface text-theme-text-secondary border border-theme-border font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all flex items-center justify-center gap-2"
                                                >
                                                    <X className="w-4 h-4" /> Retirer Coordination
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* BOUTON ANNULER TOUT EN BAS DE LA SECTION DROITE */}
                                <div className="mt-4 pt-3 border-t border-theme-border flex justify-end">
                                    <button
                                        onClick={() => setSelectedMember(null)}
                                        className="w-full sm:w-auto px-4 py-2 text-theme-text-secondary font-black text-[9px] uppercase tracking-[0.3em] hover:text-theme-text-primary hover:bg-theme-surface rounded-lg transition-all"
                                    >
                                        Annuler la modification
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

