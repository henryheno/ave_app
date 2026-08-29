import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCurrentProfile } from '../../lib/profileCache';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import {
    ArrowLeft, Save, Send, Loader2, CalendarDays,
    Users, Info, Check, CheckCircle2, AlertTriangle, ArrowRight, Play, FastForward
} from 'lucide-react';

const getInitiaticYear = (date = new Date()) => {
    const y = date.getFullYear(); const m = date.getMonth();
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const ACTIVITE_STATUS_PAST = ['Réussi','Bien déroulé','Partiellement réussi','Reporté','Annulé'];
const ACTIVITE_STATUS_FUTURE = ['Prévu','Confirmé','En attente','À planifier'];

interface BrancheData {
    systeme: number; systeme_garcons?: number; systeme_filles?: number;
    systeme_fonctions?: { nom: string; count: number }[];
    reel: number; garcons: number; filles: number;
}
interface EffectifsData {
    anges: BrancheData & { saga: number; sao: number; sara: number };
    archanges: BrancheData; perames: BrancheData;
    nouveaux_membres_systeme: number; nouveaux_membres_reel: number;
}
const defaultEffectifs = (): EffectifsData => ({
    anges: { systeme: 0, systeme_garcons: 0, systeme_filles: 0, systeme_fonctions: [], reel: 0, garcons: 0, filles: 0, saga: 0, sao: 0, sara: 0 },
    archanges: { systeme: 0, systeme_garcons: 0, systeme_filles: 0, systeme_fonctions: [], reel: 0, garcons: 0, filles: 0 },
    perames: { systeme: 0, systeme_garcons: 0, systeme_filles: 0, systeme_fonctions: [], reel: 0, garcons: 0, filles: 0 },
    nouveaux_membres_systeme: 0, nouveaux_membres_reel: 0,
});

// Compact number input
const N = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex-1">
        <p className="text-[8px] font-black uppercase tracking-widest text-theme-text-secondary mb-0.5">{label}</p>
        <input type="number" min={0} value={value}
            onChange={e => onChange(parseInt(e.target.value) || 0)}
            className="w-full bg-theme-bg border border-theme-border rounded-lg px-2 py-1.5 text-xs font-bold text-theme-text-primary focus:ring-1 focus:ring-theme-accent-start/30 outline-none text-center"
        />
    </div>
);

// Compact branche block
const BlocBranche = ({ label, textColor, bgColor, borderColor, data, onChange, children, errorMsg }: {
    label: string; textColor: string; bgColor: string; borderColor: string;
    data: BrancheData; onChange: (d: BrancheData) => void; children?: React.ReactNode; errorMsg?: string;
}) => (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
        {/* Header: système info */}
        <div className={`${bgColor} px-3 py-2 flex items-center justify-between`}>
            <div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${textColor}`}>{label}</p>
                <div className="flex gap-2 mt-0.5">
                    <span className="text-[8px] text-blue-400">G:{data.systeme_garcons ?? 0}</span>
                    <span className="text-[8px] text-pink-400">F:{data.systeme_filles ?? 0}</span>
                    {data.systeme_fonctions && data.systeme_fonctions.length > 0 && (
                        <span className="text-[8px] text-theme-text-secondary">{data.systeme_fonctions.map(f => `${f.nom}:${f.count}`).join(' ')}</span>
                    )}
                </div>
            </div>
            <span className={`text-lg font-black ${textColor}`}>{data.systeme}</span>
        </div>
        {/* Saisie */}
        <div className="p-2 bg-theme-bg space-y-2">
            {errorMsg && (
                <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                    <p className="text-[9px] font-bold text-red-400 leading-tight">{errorMsg}</p>
                </div>
            )}
            <div className="flex gap-2">
                <N label="Réel" value={data.reel} onChange={v => onChange({ ...data, reel: v })} />
                <N label="Garçons" value={data.garcons} onChange={v => onChange({ ...data, garcons: v })} />
                <N label="Filles" value={data.filles} onChange={v => onChange({ ...data, filles: v })} />
            </div>
            {children}
        </div>
    </div>
);

// Step header compact
const StepHeader = ({ icon: Icon, color, title, subtitle }: any) => (
    <div className="flex items-center gap-2.5 pb-3 border-b border-theme-border/50 mb-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <h2 className="text-sm font-black text-theme-text-primary leading-tight">{title}</h2>
            <p className="text-[10px] text-theme-text-secondary leading-tight">{subtitle}</p>
        </div>
    </div>
);

// Compact text input
const TextInput = ({ label, value, onChange, placeholder }: any) => (
    <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary mb-1">{label}</p>
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-sm font-bold text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none"
        />
    </div>
);

// Compact select
const Select = ({ label, value, onChange, children }: any) => (
    <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary mb-1">{label}</p>
        <select value={value} onChange={e => onChange(e.target.value)}
            className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-text-primary outline-none appearance-none"
        >{children}</select>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const ReportFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const { showNotification } = useNotification();

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [myStructure, setMyStructure] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [, setLastReportDate] = useState<string | null>(null);

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    const [title, setTitle] = useState('');
    const [reportType, setReportType] = useState<'mensuel' | 'trimestriel' | 'annuel'>('mensuel');
    const [anneeInitiatique, setAnneeInitiatique] = useState(getInitiaticYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [effectifs, setEffectifs] = useState<EffectifsData>(defaultEffectifs());
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [activites, setActivites] = useState<{ event_id: string; title: string; date: string; appreciation: string; statut: string; type_activite: 'passee' | 'future' }[]>([]);

    const init = useCallback(async () => {
        setLoading(true);
        try {
            const profile = await getCurrentProfile();
            if (!profile) { navigate('/auth'); return; }
            setUserProfile(profile);
            const allStructures = await getStructures();
            const myStructId = profile.coordinated_structure_id ?? profile.comi_id;
            const myStruct = allStructures.find(s => s.id === myStructId);
            setMyStructure(myStruct ?? null);
            if (!myStruct) return;

            const { data: events } = await supabase.from('calendar_events')
                .select('id, title, start_date, event_type, annee_initiatique')
                .eq('structure_id', myStruct.id).order('start_date', { ascending: false }).limit(50);
            setCalendarEvents(events ?? []);

            const { data: lastReport } = await supabase.from('reports')
                .select('created_at').eq('structure_id', myStruct.id).eq('status', 'soumis')
                .order('created_at', { ascending: false }).limit(1).maybeSingle();
            setLastReportDate(lastReport?.created_at ?? null);

            let newMembersQuery = supabase.from('profiles').select('id').eq('comi_id', myStruct.id);
            if (lastReport?.created_at) newMembersQuery = (newMembersQuery as any).gte('created_at', lastReport.created_at);
            const { data: newMembersData } = await newMembersQuery;

            const { data: allProfiles } = await supabase.from('profiles').select('id, branche, sexe, fonction').eq('comi_id', myStruct.id);
            const profs = allProfiles ?? [];

            const computeStats = (branche: string) => {
                const list = profs.filter(p => p.branche === branche);
                const garcons = list.filter(p => ['m','h','masculin','garçon','garcon'].includes((p.sexe||'').toLowerCase())).length;
                const filles = list.filter(p => ['f','féminin','feminin','fille'].includes((p.sexe||'').toLowerCase())).length;
                const fnMap: Record<string, number> = {};
                list.forEach(p => { if (p.fonction) fnMap[p.fonction] = (fnMap[p.fonction] || 0) + 1; });
                return { systeme: list.length, systeme_garcons: garcons, systeme_filles: filles, systeme_fonctions: Object.entries(fnMap).map(([nom, count]) => ({ nom, count })) };
            };

            if (id) {
                const { data: existing } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
                if (existing) {
                    setTitle(existing.title); setReportType(existing.report_type);
                    setAnneeInitiatique(existing.annee_initiatique);
                    setEffectifs({ ...defaultEffectifs(), ...existing.effectifs });
                    setActivites(existing.activites ?? []);
                    return;
                }
            }

            setEffectifs(prev => ({
                ...prev,
                anges: { ...prev.anges, ...computeStats('ange') },
                archanges: { ...prev.archanges, ...computeStats('archange') },
                perames: { ...prev.perames, ...computeStats('perame') },
                nouveaux_membres_systeme: newMembersData?.length ?? 0,
            }));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [id, navigate]);

    useEffect(() => { init(); }, [init]);

    useEffect(() => {
        if (!title && reportType === 'mensuel') setTitle(`Rapport de ${MONTHS_FR[selectedMonth]} ${selectedYear}`);
    }, [reportType, selectedMonth, selectedYear]);

    const validateEffectifs = () => {
        const errs: Record<string, string> = {};
        if (effectifs.anges.garcons + effectifs.anges.filles !== effectifs.anges.reel)
            errs.anges = "G+F ≠ Total Réel (Anges)";
        else if (effectifs.anges.saga + effectifs.anges.sao + effectifs.anges.sara !== effectifs.anges.reel)
            errs.anges = "SAGA+SAO+SARA ≠ Total Réel (Anges)";
        if (effectifs.archanges.garcons + effectifs.archanges.filles !== effectifs.archanges.reel)
            errs.archanges = "G+F ≠ Total Réel (Archanges)";
        if (effectifs.perames.garcons + effectifs.perames.filles !== effectifs.perames.reel)
            errs.perames = "G+F ≠ Total Réel (Pérames)";
        return errs;
    };

    const effectifsErrors = validateEffectifs();

    const toggleActivite = (event: any, type: 'passee' | 'future') => {
        const exists = activites.find(a => a.event_id === event.id && a.type_activite === type);
        if (exists) setActivites(prev => prev.filter(a => !(a.event_id === event.id && a.type_activite === type)));
        else setActivites(prev => [...prev, { event_id: event.id, title: event.title, date: event.start_date, appreciation: '', statut: type === 'passee' ? 'Réussi' : 'Prévu', type_activite: type }]);
    };

    const updateActivite = (eventId: string, type: 'passee'|'future', field: 'appreciation' | 'statut', value: string) => {
        setActivites(prev => prev.map(a => a.event_id === eventId && a.type_activite === type ? { ...a, [field]: value } : a));
    };

    const handleSave = async (saveStatus: 'brouillon' | 'soumis') => {
        if (!myStructure || !userProfile) return;
        if (saveStatus === 'soumis') {
            if (!title.trim()) { showNotification('Le titre est obligatoire.', 'error'); return; }
            const errs = validateEffectifs();
            if (Object.keys(errs).length > 0) { showNotification("Corrigez les effectifs avant de soumettre.", 'error'); return; }
        }
        setIsSaving(true);
        try {
            const payload = { structure_id: myStructure.id, author_id: userProfile.id, title, report_type: reportType, annee_initiatique: anneeInitiatique, effectifs, activites, status: saveStatus, updated_at: new Date().toISOString() };
            let reportId = id;
            if (id) {
                const { error } = await supabase.from('reports').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { data: newReport, error } = await supabase.from('reports').insert(payload).select().single();
                if (error) throw error;
                reportId = newReport.id;
            }

            if (saveStatus === 'soumis' && reportId) {
                const { getAncestorIds } = await import('../../lib/structureAncestors');
                const ancestorIds = await getAncestorIds(myStructure.id);
                
                const { data: adminsData } = await supabase.from('utilisateurs').select('id').in('role', ['admin', 'superadmin']);
                const adminIds = adminsData?.map(a => a.id) || [];
                
                let coordIds: string[] = [];
                if (ancestorIds.length > 0) {
                    const { data: profilesInAncestors } = await supabase.from('profiles').select('id').in('comi_id', ancestorIds);
                    if (profilesInAncestors && profilesInAncestors.length > 0) {
                        const { data: coords } = await supabase.from('utilisateurs').select('id').in('id', profilesInAncestors.map(p => p.id)).eq('role', 'coordonateur');
                        coordIds = coords?.map(c => c.id) || [];
                    }
                }
                
                const targetIds = Array.from(new Set([...adminIds, ...coordIds])).filter(tid => tid !== userProfile.id);
                if (targetIds.length > 0) {
                    const notifications = targetIds.map(tid => ({
                        user_id: tid,
                        actor_id: userProfile.id,
                        title: 'Nouveau rapport',
                        content: `La structure ${myStructure.name} a envoyé son rapport.`,
                        type: 'report_submitted',
                        entity_type: 'report',
                        entity_id: reportId,
                        is_read: false
                    }));
                    await supabase.from('notifications').insert(notifications);
                }
            }

            showNotification(saveStatus === 'soumis' ? 'Rapport soumis !' : 'Brouillon sauvegardé.', 'success');
            navigate('/rapports');
        } catch (err) { showNotification('Erreur lors de la sauvegarde.', 'error'); console.error(err); }
        finally { setIsSaving(false); }
    };

    if (loading) return <PageLoader />;

    const STEP_LABELS = ['Général', 'Effectifs', 'Activités', 'Validation'];

    // ── Compact Event Item ───────────────────────────────────────────────────
    const EventItem = ({ ev, type }: { ev: any; type: 'passee' | 'future' }) => {
        const selected = activites.find(a => a.event_id === ev.id && a.type_activite === type);
        const accentSel = type === 'passee' ? 'border-emerald-500 bg-emerald-500/5' : 'border-amber-500 bg-amber-500/5';
        const accentCheck = type === 'passee' ? 'bg-emerald-500 border-emerald-500' : 'bg-amber-500 border-amber-500';
        const accentBtn = type === 'passee' ? 'bg-emerald-500' : 'bg-amber-500';
        const statuses = type === 'passee' ? ACTIVITE_STATUS_PAST : ACTIVITE_STATUS_FUTURE;
        return (
            <div className={`border rounded-xl overflow-hidden transition-all ${selected ? accentSel : 'border-theme-border bg-theme-bg'}`}>
                <button type="button" onClick={() => toggleActivite(ev, type)} className="w-full flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? `${accentCheck} text-white` : 'border-theme-border'}`}>
                        {selected && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-xs text-theme-text-primary truncate">{ev.title}</p>
                        <p className="text-[9px] text-theme-text-secondary">{new Date(ev.start_date).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })} · {ev.event_type}</p>
                    </div>
                </button>
                {selected && (
                    <div className="px-3 pb-3 space-y-2">
                        <div className="flex flex-wrap gap-1">
                            {statuses.map(s => (
                                <button key={s} type="button" onClick={() => updateActivite(ev.id, type, 'statut', s)}
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${selected.statut === s ? `${accentBtn} text-white` : 'bg-theme-surface border border-theme-border text-theme-text-secondary'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {type === 'passee' && (
                            <textarea value={selected.appreciation} onChange={e => updateActivite(ev.id, type, 'appreciation', e.target.value)} rows={1}
                                placeholder="Appréciation..."
                                className="w-full bg-theme-bg border border-theme-border rounded-lg px-2 py-1 text-[10px] text-theme-text-primary outline-none resize-none focus:ring-1 focus:ring-emerald-500/30"
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col">
            {/* Header compact */}
            <header className="sticky top-0 z-40 bg-theme-bg/95 backdrop-blur-xl border-b border-theme-border">
                <div className="flex items-center gap-3 px-4 py-2.5">
                    <button onClick={() => navigate(-1)} className="p-2 bg-theme-surface border border-theme-border rounded-xl cursor-pointer hover:bg-theme-surface-hover">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-xs uppercase tracking-widest truncate">{id ? 'Modifier' : 'Nouveau rapport'} — <span className="text-theme-accent-start">{myStructure?.name}</span></p>
                    </div>
                    {/* Step indicators inline */}
                    <div className="flex items-center gap-1">
                        {[1,2,3,4].map(s => (
                            <button key={s} onClick={() => setCurrentStep(s)}
                                className={`w-7 h-7 rounded-full text-[10px] font-black transition-all cursor-pointer border ${
                                    s === currentStep ? 'bg-theme-accent-start text-white border-theme-accent-start' :
                                    s < currentStep ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                    'bg-theme-surface text-theme-text-secondary border-theme-border'
                                }`}>
                                {s < currentStep ? <Check className="w-3 h-3 mx-auto" /> : s}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Step label bar */}
                <div className="flex border-t border-theme-border/50">
                    {STEP_LABELS.map((label, i) => (
                        <button key={i} onClick={() => setCurrentStep(i+1)}
                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
                                currentStep === i+1 ? 'text-theme-accent-start border-b-2 border-theme-accent-start bg-theme-accent-start/5' :
                                'text-theme-text-secondary hover:text-theme-text-primary'
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto pb-24">
                <div className="max-w-xl mx-auto px-4 py-4 space-y-3">

                    {/* ── Étape 1 : Général ── */}
                    {currentStep === 1 && (
                        <div className="space-y-3">
                            <StepHeader icon={Info} color="bg-blue-500/15 text-blue-400" title="Informations Générales" subtitle="Titre, type et période du rapport" />
                            <TextInput label="Titre du rapport" value={title} onChange={setTitle} placeholder="Ex: Rapport de Mars..." />
                            <div className="grid grid-cols-2 gap-3">
                                <Select label="Type" value={reportType} onChange={setReportType}>
                                    <option value="mensuel">Mensuel</option>
                                    <option value="trimestriel">Trimestriel</option>
                                    <option value="annuel">Annuel</option>
                                </Select>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary mb-1">Année Initiatique</p>
                                    <input type="text" value={anneeInitiatique} onChange={e => setAnneeInitiatique(e.target.value)}
                                        className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-text-primary outline-none"
                                    />
                                </div>
                            </div>
                            {reportType === 'mensuel' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <Select label="Mois" value={selectedMonth} onChange={(v: any) => setSelectedMonth(Number(v))}>
                                        {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </Select>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary mb-1">Année</p>
                                        <input type="number" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value) || 2024)}
                                            className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-text-primary outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Étape 2 : Effectifs ── */}
                    {currentStep === 2 && (
                        <div className="space-y-3">
                            <StepHeader icon={Users} color="bg-indigo-500/15 text-indigo-400" title="Effectifs Réels" subtitle="Saisir les chiffres réels par branche" />

                            <BlocBranche label="Anges" textColor="text-yellow-500" bgColor="bg-yellow-500/10" borderColor="border-yellow-500/25"
                                data={effectifs.anges} onChange={d => setEffectifs(prev => ({ ...prev, anges: { ...prev.anges, ...d } }))} errorMsg={effectifsErrors.anges}>
                                <div className="flex gap-2 pt-1">
                                    <N label="SAGA" value={effectifs.anges.saga} onChange={v => setEffectifs(prev => ({ ...prev, anges: { ...prev.anges, saga: v } }))} />
                                    <N label="SAO" value={effectifs.anges.sao} onChange={v => setEffectifs(prev => ({ ...prev, anges: { ...prev.anges, sao: v } }))} />
                                    <N label="SARA" value={effectifs.anges.sara} onChange={v => setEffectifs(prev => ({ ...prev, anges: { ...prev.anges, sara: v } }))} />
                                </div>
                            </BlocBranche>

                            <BlocBranche label="Archanges" textColor="text-cyan-500" bgColor="bg-cyan-500/10" borderColor="border-cyan-500/25"
                                data={effectifs.archanges} onChange={d => setEffectifs(prev => ({ ...prev, archanges: { ...prev.archanges, ...d } }))} errorMsg={effectifsErrors.archanges} />

                            <BlocBranche label="Pérames" textColor="text-purple-500" bgColor="bg-purple-500/10" borderColor="border-purple-500/25"
                                data={effectifs.perames} onChange={d => setEffectifs(prev => ({ ...prev, perames: { ...prev.perames, ...d } }))} errorMsg={effectifsErrors.perames} />

                            <div className="flex items-center justify-between gap-3 p-3 bg-theme-surface border border-theme-border rounded-xl">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary">Nouveaux membres</p>
                                    <p className="text-[10px] text-theme-text-secondary">Système : <strong className="text-theme-text-primary">{effectifs.nouveaux_membres_systeme}</strong></p>
                                </div>
                                <div className="w-28">
                                    <N label="Réels" value={effectifs.nouveaux_membres_reel} onChange={v => setEffectifs(prev => ({ ...prev, nouveaux_membres_reel: v }))} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Étape 3 : Activités ── */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <StepHeader icon={CalendarDays} color="bg-blue-500/15 text-blue-400" title="Activités" subtitle="Passées et à venir" />

                            {/* Phase passée */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0"><Play className="w-3 h-3" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Phase Passée</span>
                                    <div className="flex-1 h-px bg-emerald-500/20" />
                                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-bold">
                                        {activites.filter(a => a.type_activite === 'passee').length}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {calendarEvents.length === 0
                                        ? <p className="text-xs text-theme-text-secondary text-center py-4">Aucun événement dans le calendrier</p>
                                        : calendarEvents.map(ev => <EventItem key={ev.id} ev={ev} type="passee" />)
                                    }
                                </div>
                            </div>

                            {/* Séparateur */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-theme-border" />
                                <span className="text-[9px] font-black text-theme-text-secondary px-2 uppercase tracking-widest">Puis</span>
                                <div className="flex-1 h-px bg-theme-border" />
                            </div>

                            {/* Phase future */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0"><FastForward className="w-3 h-3" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Phase à Venir</span>
                                    <div className="flex-1 h-px bg-amber-500/20" />
                                    <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold">
                                        {activites.filter(a => a.type_activite === 'future').length}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {calendarEvents.map(ev => <EventItem key={ev.id} ev={ev} type="future" />)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Étape 4 : Validation ── */}
                    {currentStep === 4 && (
                        <div className="space-y-3">
                            <StepHeader icon={CheckCircle2} color="bg-theme-accent-start/15 text-theme-accent-start" title="Validation Finale" subtitle="Vérification avant soumission" />

                            {/* Résumé compact */}
                            <div className="bg-theme-bg border border-theme-border rounded-xl divide-y divide-theme-border">
                                {[
                                    { label: 'Titre', val: title || 'Non renseigné' },
                                    { label: 'Type', val: `${reportType} (${anneeInitiatique})` },
                                    { label: 'Effectif total réel', val: effectifs.anges.reel + effectifs.archanges.reel + effectifs.perames.reel },
                                    { label: 'Activités sélectionnées', val: `${activites.filter(a => a.type_activite==='passee').length} passées · ${activites.filter(a => a.type_activite==='future').length} à venir` },
                                ].map(({ label, val }) => (
                                    <div key={label} className="flex items-center justify-between px-3 py-2">
                                        <span className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest">{label}</span>
                                        <span className="text-xs font-black text-theme-text-primary">{val}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Erreurs effectifs */}
                            {Object.keys(effectifsErrors).length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 space-y-1">
                                    <div className="flex items-center gap-2 text-red-400 mb-1">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-xs font-black">Erreurs d'effectifs</span>
                                    </div>
                                    {Object.entries(effectifsErrors).map(([, msg]) => (
                                        <p key={msg} className="text-[10px] text-red-400 font-bold pl-6">• {msg}</p>
                                    ))}
                                </div>
                            )}

                            {/* Effectifs mini-résumé */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Anges', val: effectifs.anges.reel, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/25' },
                                    { label: 'Archanges', val: effectifs.archanges.reel, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/25' },
                                    { label: 'Pérames', val: effectifs.perames.reel, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/25' },
                                ].map(({ label, val, color, bg }) => (
                                    <div key={label} className={`border rounded-xl p-2.5 text-center ${bg}`}>
                                        <p className={`text-lg font-black ${color}`}>{val}</p>
                                        <p className="text-[8px] font-bold text-theme-text-secondary uppercase">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-theme-bg/95 backdrop-blur-xl border-t border-theme-border z-40 px-4 py-3">
                <div className="max-w-xl mx-auto flex gap-2.5">
                    {currentStep > 1 && (
                        <button type="button" onClick={() => setCurrentStep(p => p - 1)}
                            className="px-4 py-2.5 bg-theme-surface border border-theme-border rounded-xl text-sm font-black text-theme-text-primary flex items-center gap-1.5 cursor-pointer hover:bg-theme-surface-hover transition-all">
                            <ArrowLeft className="w-4 h-4" /> Préc.
                        </button>
                    )}
                    {currentStep < totalSteps ? (
                        <button type="button" onClick={() => setCurrentStep(p => p + 1)}
                            className="flex-1 py-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition-all">
                            Suivant <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="flex-1 flex gap-2">
                            <button type="button" onClick={() => handleSave('brouillon')} disabled={isSaving}
                                className="flex-1 py-2.5 bg-theme-surface border border-theme-border rounded-xl text-sm font-black text-theme-text-primary flex items-center justify-center gap-1.5 cursor-pointer hover:bg-theme-surface-hover disabled:opacity-50">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Brouillon
                            </button>
                            <button type="button" onClick={() => handleSave('soumis')} disabled={isSaving || Object.keys(effectifsErrors).length > 0}
                                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:from-gray-600 disabled:to-gray-700">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Soumettre
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
