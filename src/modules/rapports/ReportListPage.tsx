import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCurrentProfile } from '../../lib/profileCache';
import { getStructures } from '../../lib/structureCache';
import { Navbar } from '../../monapp/components/Navbar';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import {
    Plus, FileText, ChevronRight, CheckCircle2,
    Clock, Trash2, Pencil, Loader2, Info, Building2, X, Merge
} from 'lucide-react';

interface Report {
    id: string;
    structure_id: string;
    author_id: string;
    title: string;
    report_type: string;
    annee_initiatique: string;
    start_date: string | null;
    end_date: string | null;
    effectifs: any;
    activites: any[];
    status: 'brouillon' | 'soumis';
    created_at: string;
    updated_at: string;
}

export const ReportListPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    
    const [myReports, setMyReports] = useState<Report[]>([]);
    const [childReports, setChildReports] = useState<{ structure: any; reports: Report[] }[]>([]);
    
    const [myStructure, setMyStructure] = useState<any>(null);
    const [allStructures, setAllStructures] = useState<any[]>([]);
    const [relatedStructures, setRelatedStructures] = useState<{ ancestors: any[], children: any[] }>({ ancestors: [], children: [] });
    
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

    // Explorer state
    const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
    const [showStructureModal, setShowStructureModal] = useState(false);
    const [navPath, setNavPath] = useState<any[]>([]);

    const goToStructureRoot = () => setNavPath([]);
    const drillIntoStructure = (struct: any) => setNavPath(prev => [...prev, struct]);
    const goToBreadcrumb = (index: number) => setNavPath(prev => prev.slice(0, index + 1));
    const selectStructureAndClose = (id: string) => {
        setSelectedStructureId(id);
        setShowStructureModal(false);
        setSelectedChildId(null);
    };

    const loadInit = useCallback(async () => {
        setLoading(true);
        try {
            const profile = await getCurrentProfile();
            if (!profile) { navigate('/auth'); return; }

            const structures = await getStructures();
            setAllStructures(structures);

            const myStructId = profile.coordinated_structure_id ?? profile.comi_id;
            const myStruct = structures.find(s => s.id === myStructId);
            setMyStructure(myStruct ?? null);

            if (myStruct) {
                const ancestors: any[] = [];
                let cur = structures.find(s => s.id === myStruct.parent_id) ?? null;
                const visited = new Set<string>();
                while (cur && !visited.has(cur.id)) {
                    visited.add(cur.id);
                    ancestors.push(cur);
                    cur = structures.find(s => s.id === cur.parent_id) ?? null;
                }
                ancestors.reverse();

                const descendants: any[] = [];
                const queue = [myStruct.id];
                while (queue.length > 0) {
                    const pid = queue.shift();
                    const directChildren = structures.filter(s => s.parent_id === pid);
                    descendants.push(...directChildren);
                    queue.push(...directChildren.map(s => s.id));
                }
                setRelatedStructures({ ancestors, children: descendants });
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { loadInit(); }, [loadInit]);

    const loadReports = useCallback(async () => {
        if (!myStructure || !allStructures.length) return;
        setLoading(true);

        const targetStructId = selectedStructureId ?? myStructure.id;
        const targetStruct = allStructures.find(s => s.id === targetStructId);
        
        if (!targetStruct) { setLoading(false); return; }

        try {
            const directChildren = allStructures.filter(s => s.parent_id === targetStructId);

            const myRQuery = supabase
                .from('reports')
                .select('*')
                .eq('structure_id', targetStructId)
                .order('created_at', { ascending: false });
                
            if (targetStructId !== myStructure.id) {
                myRQuery.eq('status', 'soumis');
            }
            
            const { data: myR } = await myRQuery;
            setMyReports(myR ?? []);

            if (directChildren.length > 0) {
                const childIds = directChildren.map(s => s.id);
                const { data: childR } = await supabase
                    .from('reports')
                    .select('*')
                    .in('structure_id', childIds)
                    .eq('status', 'soumis')
                    .order('created_at', { ascending: false });

                const grouped = directChildren.map(s => ({
                    structure: s,
                    reports: (childR ?? []).filter(r => r.structure_id === s.id),
                }));
                setChildReports(grouped);
            } else {
                setChildReports([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [myStructure, allStructures, selectedStructureId]);

    useEffect(() => { loadReports(); }, [loadReports]);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const { error } = await supabase.from('reports').delete().eq('id', id);
        if (error) showNotification('Erreur lors de la suppression.', 'error');
        else { showNotification('Rapport supprimé.', 'success'); loadReports(); }
        setDeletingId(null);
    };

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading && !myStructure) return <PageLoader />;
    
    const targetStructId = selectedStructureId ?? myStructure?.id;
    const isViewingMine = targetStructId === myStructure?.id;
    const displayStruct = allStructures.find(s => s.id === targetStructId) ?? myStructure;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary pb-24">
            <Navbar 
                mode="subpage" 
                title="Rapports" 
                subtitle={myStructure ? `${myStructure.type} ${myStructure.name}` : undefined} 
                showLogo={true} 
                onBack={() => navigate('/home')}
                rightActions={
                    isViewingMine ? (
                        <div className="flex items-center gap-2">
                            {relatedStructures.children.length > 0 && (
                                <button
                                    onClick={() => navigate('/rapports/agrege')}
                                    className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl cursor-pointer hover:bg-purple-500/20 transition-colors"
                                    title="Rapport Agrégé"
                                >
                                    <Merge className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/rapports/nouveau')}
                                className="p-2.5 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                title="Nouveau rapport"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    ) : undefined
                }
            />

                {/* Bouton de sélection de structure */}
                {myStructure && (relatedStructures.ancestors.length > 0 || relatedStructures.children.length > 0) && (
                    <div className="px-4 py-3 bg-theme-surface border-t border-theme-border flex items-center justify-between gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary shrink-0">
                            Affichage :
                        </span>
                        <button
                            onClick={() => setShowStructureModal(true)}
                            className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-4 py-2 flex items-center justify-between hover:border-theme-accent-start/50 transition-colors cursor-pointer"
                        >
                            <div className="text-left truncate mr-2">
                                <span className="block text-xs font-bold text-theme-text-primary truncate">
                                    {isViewingMine
                                        ? `Mes Rapports (${myStructure.type} ${myStructure.name})`
                                        : `${displayStruct?.type} ${displayStruct?.name}`}
                                </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-theme-text-secondary shrink-0" />
                        </button>
                    </div>
                )}


            <main className="max-w-xl mx-auto p-4 space-y-6">
                {loading && myStructure ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-theme-accent-start" /></div>
                ) : (
                    <>
                        {/* Rapports de la structure selectionnée */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-theme-accent-start/20 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-theme-accent-start" />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-theme-text-primary">
                                    {isViewingMine ? 'Mes Rapports' : `Rapports (${displayStruct?.type} ${displayStruct?.name})`}
                                </h2>
                            </div>
                            
                            {myReports.length === 0 ? (
                                <div className="p-8 text-center bg-theme-surface/40 rounded-2xl border border-theme-border/50 border-dashed">
                                    <FileText className="w-8 h-8 mx-auto mb-2 text-theme-text-secondary/40" />
                                    <p className="text-xs font-bold text-theme-text-secondary">Aucun rapport pour le moment.</p>
                                    {isViewingMine && (
                                        <button onClick={() => navigate('/rapports/nouveau')} className="mt-3 text-xs text-theme-accent-start font-bold hover:underline cursor-pointer">
                                            Créer mon premier rapport
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myReports.map(r => (
                                        <div key={r.id} className="bg-theme-surface border border-theme-border rounded-2xl p-4 flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                r.status === 'soumis' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                                            }`}>
                                                {r.status === 'soumis' ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Clock className="w-4.5 h-4.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm text-theme-text-primary truncate">{r.title}</p>
                                                <p className="text-[10px] text-theme-text-secondary mt-0.5">
                                                    {r.annee_initiatique} · {r.report_type}
                                                    {r.start_date && ` · ${formatDate(r.start_date)}`}
                                                </p>
                                                <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                    r.status === 'soumis'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {r.status === 'soumis' ? 'Soumis' : 'Brouillon'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isViewingMine || r.status === 'soumis' ? (
                                                    <button
                                                        onClick={() => navigate(isViewingMine && r.status === 'brouillon' ? `/rapports/modifier/${r.id}` : `/rapports/voir/${r.id}`)}
                                                        className="p-2 rounded-xl bg-theme-bg border border-theme-border hover:border-theme-accent-start/50 text-theme-text-secondary hover:text-theme-accent-start transition-all cursor-pointer"
                                                    >
                                                        {isViewingMine && r.status === 'brouillon' ? <Pencil className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    </button>
                                                ) : null}
                                                
                                                {isViewingMine && (
                                                    <button
                                                        onClick={() => handleDelete(r.id)}
                                                        disabled={deletingId === r.id}
                                                        className="p-2 rounded-xl bg-theme-bg border border-theme-border hover:border-red-500/50 text-theme-text-secondary hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                                                    >
                                                        {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Rapports des Fils */}
                        {childReports.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-theme-text-primary">
                                        Rapports des Sous-Structures (Fils directs)
                                    </h2>
                                </div>

                                {/* Sélecteur de structure fille */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <button
                                        onClick={() => setSelectedChildId(null)}
                                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                            selectedChildId === null
                                                ? 'bg-theme-accent-start/20 text-theme-accent-start border-theme-accent-start/30'
                                                : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:border-theme-accent-start/30'
                                        }`}
                                    >
                                        Tous
                                    </button>
                                    {childReports.map(c => (
                                        <button
                                            key={c.structure.id}
                                            onClick={() => setSelectedChildId(c.structure.id)}
                                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                                selectedChildId === c.structure.id
                                                    ? 'bg-theme-accent-start/20 text-theme-accent-start border-theme-accent-start/30'
                                                    : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:border-theme-accent-start/30'
                                            }`}
                                        >
                                            {c.structure.name}
                                            {c.reports.length > 0 && (
                                                <span className="ml-1.5 bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full text-[7px]">
                                                    {c.reports.length}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Rapports filtrés */}
                                <div className="space-y-3">
                                    {(selectedChildId ? [childReports.find(c => c.structure.id === selectedChildId)!] : childReports)
                                        .filter(Boolean)
                                        .flatMap(c => c.reports.map(r => ({ ...r, _structure: c.structure })))
                                        .length === 0 ? (
                                        <div className="p-6 text-center bg-theme-surface/40 rounded-2xl border border-theme-border/50 border-dashed">
                                            <Info className="w-6 h-6 mx-auto mb-2 text-theme-text-secondary/40" />
                                            <p className="text-xs font-bold text-theme-text-secondary">Aucun rapport soumis par cette structure.</p>
                                        </div>
                                    ) : (
                                        (selectedChildId ? [childReports.find(c => c.structure.id === selectedChildId)!] : childReports)
                                            .filter(Boolean)
                                            .flatMap(c => c.reports.map(r => ({ ...r, _structure: c.structure })))
                                            .map(r => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => navigate(`/rapports/voir/${r.id}`)}
                                                    className="w-full text-left bg-theme-surface border border-theme-border rounded-2xl p-4 flex items-center gap-3 hover:border-theme-accent-start/40 transition-all cursor-pointer group"
                                                >
                                                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4.5 h-4.5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm text-theme-text-primary truncate">{r.title}</p>
                                                        <p className="text-[10px] text-theme-text-secondary mt-0.5">
                                                            {(r as any)._structure.type} {(r as any)._structure.name} · {r.annee_initiatique}
                                                            {r.start_date && ` · ${formatDate(r.start_date)}`}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-theme-text-secondary/50 group-hover:text-theme-accent-start transition-colors shrink-0" />
                                                </button>
                                            ))
                                    )}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            {/* Modale d'Exploration */}
            {showStructureModal && myStructure && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-theme-bg border border-theme-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-theme-border shrink-0">
                            <h2 className="font-black text-theme-text-primary text-base">Explorateur de Réseau</h2>
                            <button onClick={() => setShowStructureModal(false)} className="p-2 rounded-xl bg-theme-surface border border-theme-border cursor-pointer hover:bg-theme-surface-hover">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Breadcrumb / Navigation */}
                        <div className="p-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-theme-border shrink-0">
                            <button
                                type="button"
                                onClick={goToStructureRoot}
                                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase shrink-0 transition-colors cursor-pointer ${
                                    navPath.length === 0 
                                        ? 'bg-theme-accent-start/20 text-theme-accent-start border border-theme-accent-start/30' 
                                        : 'bg-theme-surface text-theme-text-secondary hover:text-theme-accent-start border border-transparent'
                                }`}
                            >
                                RACINE
                            </button>
                            {navPath.map((p, i) => (
                                <div key={p.id} className="flex items-center gap-1 shrink-0">
                                    <ChevronRight className="w-3 h-3 text-theme-text-secondary/35" />
                                    <button
                                        type="button"
                                        onClick={() => goToBreadcrumb(i)}
                                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase shrink-0 transition-colors cursor-pointer ${
                                            i === navPath.length - 1
                                                ? 'bg-theme-accent-start/20 text-theme-accent-start border border-theme-accent-start/30'
                                                : 'bg-theme-surface text-theme-text-secondary hover:text-theme-accent-start border border-transparent'
                                        }`}
                                    >
                                        {p.type} {p.name}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-5 p-4">
                            {navPath.length === 0 ? (
                                <>
                                    {/* Racine : Ma Structure, Parents, Enfants directs */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Moi</p>
                                        <button
                                            onClick={() => selectStructureAndClose(myStructure.id)}
                                            className="w-full text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all flex items-center justify-between group cursor-pointer"
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">Ma Structure</p>
                                                <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{myStructure.type} {myStructure.name}</p>
                                            </div>
                                            {(selectedStructureId === myStructure.id || !selectedStructureId) && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                        </button>
                                    </div>

                                    {relatedStructures.ancestors.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Hiérarchie (Parents)</p>
                                            {relatedStructures.ancestors.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => selectStructureAndClose(s.id)}
                                                    className="w-full text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all flex items-center justify-between group cursor-pointer"
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{s.name}</p>
                                                        <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{s.type}</p>
                                                    </div>
                                                    {selectedStructureId === s.id && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {relatedStructures.children.filter(s => s.parent_id === myStructure.id).length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Structures Filles</p>
                                            {relatedStructures.children.filter(s => s.parent_id === myStructure.id).map(s => {
                                                const hasGrandchildren = relatedStructures.children.some(c => c.parent_id === s.id);
                                                return (
                                                    <div key={s.id} className="flex gap-2 group">
                                                        <button
                                                            onClick={() => selectStructureAndClose(s.id)}
                                                            className="flex-1 text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all cursor-pointer flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{s.name}</p>
                                                                <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{s.type}</p>
                                                            </div>
                                                            {selectedStructureId === s.id && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                                        </button>
                                                        {hasGrandchildren && (
                                                            <button
                                                                onClick={() => drillIntoStructure(s)}
                                                                className="px-3 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:bg-theme-surface-hover hover:border-theme-text-secondary/50 text-[9px] font-black uppercase text-theme-text-secondary hover:text-theme-text-primary flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer w-20"
                                                            >
                                                                Explorer
                                                                <ChevronRight className="w-4 h-4 mt-0.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Dans une sous-structure */}
                                    {(() => {
                                        const currentParent = navPath[navPath.length - 1];
                                        const subChildren = relatedStructures.children.filter(s => s.parent_id === currentParent.id);
                                        return (
                                            <div className="space-y-5">
                                                <div className="p-4 rounded-2xl bg-theme-accent-start/5 border border-theme-accent-start/20 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-theme-accent-start" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary">Structure courante</p>
                                                    <p className="font-black text-theme-text-primary text-base mt-1">{currentParent.type} {currentParent.name}</p>
                                                    <button
                                                        onClick={() => selectStructureAndClose(currentParent.id)}
                                                        className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                            selectedStructureId === currentParent.id
                                                                ? 'bg-theme-accent-start text-white shadow-md shadow-theme-accent-start/20'
                                                                : 'bg-theme-surface border border-theme-border text-theme-text-primary hover:border-theme-accent-start/50'
                                                        }`}
                                                    >
                                                        {selectedStructureId === currentParent.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                        Voir ses rapports
                                                    </button>
                                                </div>

                                                {subChildren.length > 0 ? (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Sous-structures</p>
                                                        {subChildren.map(s => {
                                                            const hasGrandchildren = relatedStructures.children.some(c => c.parent_id === s.id);
                                                            return (
                                                                <div key={s.id} className="flex gap-2 group">
                                                                    <button
                                                                        onClick={() => selectStructureAndClose(s.id)}
                                                                        className="flex-1 text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all cursor-pointer flex items-center justify-between"
                                                                    >
                                                                        <div>
                                                                            <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{s.name}</p>
                                                                            <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{s.type}</p>
                                                                        </div>
                                                                        {selectedStructureId === s.id && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                                                    </button>
                                                                    {hasGrandchildren && (
                                                                        <button
                                                                            onClick={() => drillIntoStructure(s)}
                                                                            className="px-3 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:bg-theme-surface-hover hover:border-theme-text-secondary/50 text-[9px] font-black uppercase text-theme-text-secondary hover:text-theme-text-primary flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer w-20"
                                                                        >
                                                                            Explorer
                                                                            <ChevronRight className="w-4 h-4 mt-0.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="p-8 text-center bg-theme-surface/50 rounded-2xl border border-theme-border/50 border-dashed">
                                                        <Info className="w-6 h-6 mx-auto mb-2 text-theme-text-secondary/50" />
                                                        <p className="text-xs font-bold text-theme-text-secondary">Aucune sous-structure</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
