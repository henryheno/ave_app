import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCurrentProfile } from '../../lib/profileCache';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import {
    ArrowLeft, Building2, CheckSquare, Square, Loader2,
    Info, Merge, CheckCircle2, ChevronRight
} from 'lucide-react';

const getInitiaticYear = (date = new Date()) => {
    const y = date.getFullYear(); const m = date.getMonth();
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const sumField = (reports: any[], path: string[]) =>
    reports.reduce((acc, r) => {
        let val: any = r.effectifs;
        for (const k of path) val = val?.[k];
        return acc + (Number(val) || 0);
    }, 0);

export const ReportAggregatedPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [myStructure, setMyStructure] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [childrenReports, setChildrenReports] = useState<Record<string, any[]>>({});

    const [anneeInitiatique, setAnneeInitiatique] = useState(getInitiaticYear());
    const [reportType, setReportType] = useState('mensuel');
    const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());

    const [navPath, setNavPath] = useState<any[]>([]);

    const loadInit = useCallback(async () => {
        setLoading(true);
        try {
            const profile = await getCurrentProfile();
            if (!profile) { navigate('/auth'); return; }
            setUserProfile(profile);

            const structures = await getStructures();
            const myStructId = profile.coordinated_structure_id ?? profile.comi_id;
            const myStruct = structures.find(s => s.id === myStructId);
            setMyStructure(myStruct ?? null);

            if (myStruct) {
                // BFS pour récupérer TOUS les descendants (fils, petits-fils, etc.)
                const allDescendants: any[] = [];
                const queue = [myStruct.id];
                const visited = new Set<string>();
                while (queue.length > 0) {
                    const pid = queue.shift()!;
                    if (visited.has(pid)) continue;
                    visited.add(pid);
                    const directKids = structures.filter(s => s.parent_id === pid);
                    allDescendants.push(...directKids);
                    queue.push(...directKids.map(s => s.id));
                }
                setChildren(allDescendants);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { loadInit(); }, [loadInit]);

    // Recharge les rapports des fils quand l'année ou le type change
    const loadChildReports = useCallback(async () => {
        if (!children.length) return;
        const childIds = children.map(c => c.id);
        const { data } = await supabase
            .from('reports')
            .select('*')
            .in('structure_id', childIds)
            .eq('annee_initiatique', anneeInitiatique)
            .eq('report_type', reportType)
            .eq('status', 'soumis');

        const grouped: Record<string, any[]> = {};
        childIds.forEach(id => { grouped[id] = []; });
        (data ?? []).forEach(r => { grouped[r.structure_id]?.push(r); });
        setChildrenReports(grouped);
        // Désélectionner les fils qui n'ont plus de rapport disponible
        setSelectedChildIds(prev => {
            const next = new Set<string>();
            prev.forEach(id => { if (grouped[id]?.length > 0) next.add(id); });
            return next;
        });
    }, [children, anneeInitiatique, reportType]);

    useEffect(() => { loadChildReports(); }, [loadChildReports]);

    const toggleChild = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedChildIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else if (childrenReports[id]?.length > 0) next.add(id);
            return next;
        });
    };

    const selectAllAvailable = () => {
        const allAvailable = children.filter(c => (childrenReports[c.id]?.length ?? 0) > 0).map(c => c.id);
        setSelectedChildIds(new Set(allAvailable));
    };

    const goToStructureRoot = () => setNavPath([]);
    const drillIntoStructure = (node: any) => setNavPath(prev => [...prev, node]);
    const goToBreadcrumb = (index: number) => setNavPath(prev => prev.slice(0, index + 1));

    // Calcule les effectifs agrégés en temps réel
    const selectedReports = children
        .filter(c => selectedChildIds.has(c.id))
        .map(c => childrenReports[c.id]?.[0])
        .filter(Boolean);

    const preview = {
        totalReel: sumField(selectedReports, ['anges', 'reel']) + sumField(selectedReports, ['archanges', 'reel']) + sumField(selectedReports, ['perames', 'reel']),
        angesReel: sumField(selectedReports, ['anges', 'reel']),
        archangesReel: sumField(selectedReports, ['archanges', 'reel']),
        peramesReel: sumField(selectedReports, ['perames', 'reel']),
        nouveaux: sumField(selectedReports, ['nouveaux_membres_reel']),
    };

    const handleGenerate = async () => {
        if (selectedChildIds.size === 0) {
            showNotification('Sélectionnez au moins un fil.', 'error');
            return;
        }
        if (!myStructure || !userProfile) return;
        setGenerating(true);

        try {
            const allStructures = await getStructures();
            // Agrégation des effectifs
            const effectifs = {
                anges: {
                    systeme: sumField(selectedReports, ['anges', 'systeme']),
                    systeme_garcons: sumField(selectedReports, ['anges', 'systeme_garcons']),
                    systeme_filles: sumField(selectedReports, ['anges', 'systeme_filles']),
                    systeme_fonctions: [],
                    reel: sumField(selectedReports, ['anges', 'reel']),
                    garcons: sumField(selectedReports, ['anges', 'garcons']),
                    filles: sumField(selectedReports, ['anges', 'filles']),
                    saga: sumField(selectedReports, ['anges', 'saga']),
                    sao: sumField(selectedReports, ['anges', 'sao']),
                    sara: sumField(selectedReports, ['anges', 'sara']),
                },
                archanges: {
                    systeme: sumField(selectedReports, ['archanges', 'systeme']),
                    systeme_garcons: sumField(selectedReports, ['archanges', 'systeme_garcons']),
                    systeme_filles: sumField(selectedReports, ['archanges', 'systeme_filles']),
                    systeme_fonctions: [],
                    reel: sumField(selectedReports, ['archanges', 'reel']),
                    garcons: sumField(selectedReports, ['archanges', 'garcons']),
                    filles: sumField(selectedReports, ['archanges', 'filles']),
                },
                perames: {
                    systeme: sumField(selectedReports, ['perames', 'systeme']),
                    systeme_garcons: sumField(selectedReports, ['perames', 'systeme_garcons']),
                    systeme_filles: sumField(selectedReports, ['perames', 'systeme_filles']),
                    systeme_fonctions: [],
                    reel: sumField(selectedReports, ['perames', 'reel']),
                    garcons: sumField(selectedReports, ['perames', 'garcons']),
                    filles: sumField(selectedReports, ['perames', 'filles']),
                },
                nouveaux_membres_systeme: sumField(selectedReports, ['nouveaux_membres_systeme']),
                nouveaux_membres_reel: sumField(selectedReports, ['nouveaux_membres_reel']),
                details_structures: selectedReports.map(r => {
                    const srcStruct = allStructures.find(s => s.id === r.structure_id);
                    return {
                        structure_id: r.structure_id,
                        structure_name: srcStruct?.name ?? 'Structure inconnue',
                        structure_type: srcStruct?.type ?? '',
                        anges: {
                            reel: r.effectifs?.anges?.reel || 0,
                            systeme: r.effectifs?.anges?.systeme || 0
                        },
                        archanges: {
                            reel: r.effectifs?.archanges?.reel || 0,
                            systeme: r.effectifs?.archanges?.systeme || 0
                        },
                        perames: {
                            reel: r.effectifs?.perames?.reel || 0,
                            systeme: r.effectifs?.perames?.systeme || 0
                        }
                    };
                }),
            };

            // Fusion des activités (avec source_structure)
            const activites: any[] = [];
            selectedReports.forEach(r => {
                const srcStruct = allStructures.find(s => s.id === r.structure_id);
                (r.activites ?? []).forEach((a: any) => {
                    activites.push({ ...a, source_structure: srcStruct?.name ?? '' });
                });
            });

            const { data: created, error } = await supabase
                .from('reports')
                .insert({
                    structure_id: myStructure.id,
                    author_id: userProfile.id,
                    title: `Rapport agrégé ${reportType} — ${anneeInitiatique}`,
                    report_type: reportType,
                    annee_initiatique: anneeInitiatique,
                    effectifs,
                    activites,
                    status: 'soumis',
                })
                .select()
                .single();

            if (error) throw error;
            showNotification('Rapport agrégé généré avec succès !', 'success');
            navigate(`/rapports/voir/${created.id}`);
        } catch (err: any) {
            console.error(err);
            showNotification('Erreur lors de la génération.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <PageLoader />;

    if (!myStructure || children.length === 0) {
        return (
            <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col items-center justify-center gap-4 p-8">
                <Info className="w-10 h-10 text-theme-text-secondary" />
                <p className="text-sm font-bold text-theme-text-secondary text-center">
                    Cette fonctionnalité est réservée aux coordonnateurs d'une structure ayant des fils.
                </p>
                <button onClick={() => navigate('/rapports')} className="px-4 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold cursor-pointer">
                    Retour
                </button>
            </div>
        );
    }

    const availableCount = children.filter(c => (childrenReports[c.id]?.length ?? 0) > 0).length;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-theme-bg/90 backdrop-blur-xl border-b border-theme-border">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => navigate('/rapports')} className="p-2.5 bg-theme-surface border border-theme-border rounded-xl cursor-pointer hover:bg-theme-surface-hover">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-sm uppercase tracking-widest truncate">Rapport Agrégé</h1>
                        <p className="text-[10px] font-bold text-theme-text-secondary truncate">{myStructure.type} {myStructure.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <Merge className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Agrégation</span>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-4 mt-2">
                {/* Paramètres */}
                <div className="bg-theme-surface border border-theme-border rounded-2xl p-4 space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary">Paramètres du rapport</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary mb-1">Année initiatique</p>
                            <select
                                value={anneeInitiatique}
                                onChange={e => setAnneeInitiatique(e.target.value)}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-text-primary outline-none appearance-none"
                            >
                                {(() => {
                                    const cur = getInitiaticYear();
                                    const y = new Date().getFullYear();
                                    const opts = [
                                        `${y - 2}-${y - 1}`,
                                        `${y - 1}-${y}`,
                                        `${y}-${y + 1}`,
                                    ];
                                    // Déduplique au cas où
                                    const unique = [...new Set([cur, ...opts])];
                                    return unique.map((yy, i) => (
                                        <option key={`year-${i}`} value={yy}>{yy}</option>
                                    ));
                                })()}
                            </select>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary mb-1">Type de rapport</p>
                            <select
                                value={reportType}
                                onChange={e => setReportType(e.target.value)}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-text-primary outline-none appearance-none"
                            >
                                {['Mensuel', 'Trimestriel', 'Annuel', 'Spécial'].map(t => (
                                    <option key={t} value={t.toLowerCase()}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border/50 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={goToStructureRoot}
                            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase shrink-0 transition-colors cursor-pointer ${navPath.length === 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-theme-bg text-theme-text-secondary hover:text-theme-text-primary'}`}
                        >
                            {myStructure?.name}
                        </button>
                        {navPath.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-1 shrink-0">
                                <ChevronRight className="w-3 h-3 text-theme-text-secondary/35" />
                                <button
                                    type="button"
                                    onClick={() => goToBreadcrumb(i)}
                                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-colors cursor-pointer ${i === navPath.length - 1 ? 'bg-purple-500/20 text-purple-400' : 'bg-theme-bg text-theme-text-secondary hover:text-theme-text-primary'}`}
                                >
                                    {p.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border/50 bg-theme-bg/50">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                                <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-theme-text-primary">Structures</p>
                                <p className="text-[9px] text-theme-text-secondary">{availableCount} rapports disponibles au total</p>
                            </div>
                        </div>
                        {availableCount > 0 && (
                            <button
                                onClick={selectAllAvailable}
                                className="text-[9px] font-black uppercase tracking-widest text-purple-400 cursor-pointer hover:text-purple-300"
                            >
                                Tout sélectionner
                            </button>
                        )}
                    </div>

                    <div className="divide-y divide-theme-border/40">
                        {(() => {
                            const currentParentId = navPath.length > 0 ? navPath[navPath.length - 1].id : myStructure?.id;
                            const displayedChildren = children.filter(c => c.parent_id === currentParentId);
                            
                            if (displayedChildren.length === 0) {
                                return (
                                    <div className="px-4 py-8 text-center">
                                        <Info className="w-6 h-6 mx-auto mb-2 text-theme-text-secondary" />
                                        <p className="text-xs font-bold text-theme-text-secondary">
                                            Aucune structure enfant à ce niveau.
                                        </p>
                                    </div>
                                );
                            }

                            return displayedChildren.map(child => {
                                const hasReport = (childrenReports[child.id]?.length ?? 0) > 0;
                                const isSelected = selectedChildIds.has(child.id);
                                const hasChildren = children.some(c => c.parent_id === child.id);

                                return (
                                    <div
                                        key={child.id}
                                        onClick={() => hasChildren ? drillIntoStructure(child) : null}
                                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${hasChildren ? 'cursor-pointer hover:bg-theme-bg/50' : ''}`}
                                    >
                                        <button 
                                            onClick={(e) => {
                                                if (hasReport) toggleChild(child.id, e);
                                            }}
                                            disabled={!hasReport}
                                            className={`p-1 shrink-0 ${hasReport ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                                        >
                                            {isSelected
                                                ? <CheckSquare className="w-4 h-4 text-purple-400" />
                                                : <Square className="w-4 h-4 text-theme-text-secondary" />
                                            }
                                        </button>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-black truncate ${isSelected ? 'text-purple-400' : 'text-theme-text-primary'}`}>
                                                {child.name}
                                            </p>
                                            <p className="text-[9px] text-theme-text-secondary">{child.type}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 shrink-0">
                                            {hasReport && (
                                                <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-[9px] font-bold text-emerald-400">Rapport dispo</span>
                                                </div>
                                            )}
                                            {hasChildren && (
                                                <ChevronRight className="w-4 h-4 text-theme-text-secondary" />
                                            )}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Aperçu agrégé */}
                {selectedChildIds.size > 0 && (
                    <div className="bg-theme-surface border border-purple-500/20 rounded-2xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-3">
                            Aperçu — {selectedChildIds.size} fils sélectionné(s)
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Total', val: preview.totalReel, color: 'text-theme-text-primary' },
                                { label: 'Anges', val: preview.angesReel, color: 'text-yellow-500' },
                                { label: 'Archanges', val: preview.archangesReel, color: 'text-cyan-500' },
                                { label: 'Pérames', val: preview.peramesReel, color: 'text-purple-500' },
                            ].map(({ label, val, color }) => (
                                <div key={label} className="bg-theme-bg rounded-xl p-2 text-center">
                                    <p className={`text-lg font-black ${color}`}>{val}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-theme-text-secondary">{label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-center">
                            <span className="text-[9px] text-theme-text-secondary">Nouveaux membres : <strong className="text-theme-text-primary">{preview.nouveaux}</strong></span>
                        </div>
                    </div>
                )}

                {/* Bouton de génération */}
                <button
                    onClick={handleGenerate}
                    disabled={generating || selectedChildIds.size === 0}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl text-white font-black text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20"
                >
                    {generating
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Merge className="w-4 h-4" />
                    }
                    {generating ? 'Génération en cours...' : `Générer le rapport agrégé (${selectedChildIds.size} fils)`}
                </button>
            </main>
        </div>
    );
};
