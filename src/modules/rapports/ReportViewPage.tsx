import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import {
    ArrowLeft, CalendarDays, Users, Play, FastForward, Building2, Download, Loader2
} from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { ReportPDF, type ReportPDFData } from '../../components/ReportPDF';
import { ReportAggregatedPDF } from '../../components/ReportAggregatedPDF';

const SectionCard = ({ title, icon: Icon, color, children }: any) => (
    <div className="bg-theme-surface border border-theme-border rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-border/50 bg-theme-bg/50">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <h2 className="font-black text-sm uppercase tracking-widest text-theme-text-primary">{title}</h2>
        </div>
        <div className="p-4 space-y-4">
            {children}
        </div>
    </div>
);

const StatBranche = ({ label, data, accent }: any) => (
    <div className={`p-4 rounded-xl border ${accent.border} ${accent.bg} flex flex-col gap-2`}>
        <div className="flex justify-between items-center">
            <span className={`text-[10px] font-black uppercase tracking-widest ${accent.text}`}>{label}</span>
            <span className={`text-xl font-black ${accent.text}`}>{data?.reel || 0}</span>
        </div>
        <div className="flex justify-between text-xs text-theme-text-secondary">
            <span>Garçons: <strong className="text-theme-text-primary">{data?.garcons || 0}</strong></span>
            <span>Filles: <strong className="text-theme-text-primary">{data?.filles || 0}</strong></span>
        </div>
        <div className="text-[9px] text-theme-text-secondary pt-2 border-t border-theme-border border-dashed">
            App: {data?.systeme || 0} (G:{data?.systeme_garcons || 0} F:{data?.systeme_filles || 0})
        </div>
        {label === 'Anges' && (
            <div className="text-[9px] text-theme-text-secondary flex justify-between">
                <span>SAGA: {data?.saga || 0}</span>
                <span>SAO: {data?.sao || 0}</span>
                <span>SARA: {data?.sara || 0}</span>
            </div>
        )}
    </div>
);

export const ReportViewPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any>(null);
    const [structure, setStructure] = useState<any>(null);
    const [authorName, setAuthorName] = useState<string>('');
    const { showNotification } = useNotification();
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [pdfData, setPdfData] = useState<ReportPDFData | null>(null);

    const loadData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data: r } = await supabase
                .from('reports')
                .select('*')
                .eq('id', id)
                .single();
                
            if (!r) { navigate('/rapports'); return; }
            setReport(r);

            const allStructures = await getStructures();
            setStructure(allStructures.find(s => s.id === r.structure_id) ?? null);
            
            const { data: author } = await supabase
                .from('profiles')
                .select('prenom, nom')
                .eq('id', r.author_id)
                .maybeSingle();
                
            if (author) {
                setAuthorName(`${author.prenom} ${author.nom}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading || !report) return <PageLoader />;

    const activitesPassees = report.activites?.filter((a: any) => a.type_activite !== 'future') ?? [];
    const activitesFutures = report.activites?.filter((a: any) => a.type_activite === 'future') ?? [];

    const handleDownloadPdf = async () => {
        if (!report || !structure) return;
        setGeneratingPdf(true);
        try {
            const allStructures = await getStructures();
            
            let resolvedComa = null;
            let resolvedCodi = null;
            let currentStruct = structure;

            while (currentStruct && currentStruct.parent_id) {
                const parent = allStructures.find(s => s.id === currentStruct.parent_id);
                if (!parent) break;
                if (parent.type === 'COMA') resolvedComa = parent;
                if (parent.type === 'CODI') resolvedCodi = parent;
                currentStruct = parent;
            }

            const pdfPayload: ReportPDFData = {
                title: report.title,
                reportType: report.report_type,
                anneeInitiatique: report.annee_initiatique,
                authorName,
                structureName: structure.name,
                structureType: structure.type,
                codiName: resolvedCodi?.name || (structure.type === 'CODI' ? structure.name : undefined),
                comaName: resolvedComa?.name || (structure.type === 'COMA' ? structure.name : undefined),
                province: structure.province,
                effectifs: report.effectifs,
                activites: report.activites || [],
                dateSoumission: report.updated_at || report.created_at || new Date().toISOString()
            };

            setPdfData(pdfPayload);

            setTimeout(async () => {
                const element = document.getElementById('report-pdf-content');
                if (element) {
                    const html2pdf = (await import('html2pdf.js')).default;
                    await html2pdf().from(element).set({
                        margin: 0,
                        filename: `Rapport_${report.report_type}_${structure.name}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: {
                            scale: 2,
                            width: 794,
                            windowWidth: 794,
                            useCORS: true
                        },
                        pagebreak: { mode: ['css', 'legacy'] },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    } as any).save();
                }
                setPdfData(null);
                setGeneratingPdf(false);
                showNotification('Le rapport a été téléchargé.', 'success');
            }, 500);
        } catch (err) {
            console.error(err);
            showNotification('Erreur lors de la génération du PDF.', 'error');
            setPdfData(null);
            setGeneratingPdf(false);
        }
    };
    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary pb-24">
            <header className="sticky top-0 z-40 bg-theme-bg/90 backdrop-blur-xl border-b border-theme-border">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-theme-surface border border-theme-border rounded-xl cursor-pointer hover:bg-theme-surface-hover">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-sm uppercase tracking-widest truncate">Lecture du Rapport</h1>
                        <p className="text-[10px] font-bold text-theme-text-secondary truncate">{structure?.type} {structure?.name}</p>
                    </div>
                    <button 
                        onClick={handleDownloadPdf} 
                        disabled={generatingPdf}
                        className="p-2.5 bg-theme-accent-start/10 text-theme-accent-start border border-theme-accent-start/20 rounded-xl cursor-pointer hover:bg-theme-accent-start/20 transition-all flex items-center gap-2 disabled:opacity-50"
                        title="Télécharger en PDF"
                    >
                        {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export PDF</span>
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 mt-2">
                {/* En-tête du Rapport */}
                <div className="mb-8 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                            report.status === 'soumis' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                            {report.status}
                        </span>
                        <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider bg-theme-surface border border-theme-border text-theme-text-secondary">
                            {report.report_type}
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-theme-text-primary">{report.title}</h1>
                    <div className="flex items-center gap-4 text-xs font-bold text-theme-text-secondary">
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {report.annee_initiatique}
                        </div>
                        {authorName && (
                            <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                Par {authorName}
                            </div>
                        )}
                    </div>
                </div>

                <SectionCard title="Effectifs" icon={Users} color="bg-indigo-500/15 text-indigo-400">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <StatBranche label="Anges" data={report.effectifs?.anges || {}} accent={{ bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-500' }} />
                        <StatBranche label="Archanges" data={report.effectifs?.archanges || {}} accent={{ bg: 'bg-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-500' }} />
                        <StatBranche label="Pérames" data={report.effectifs?.perames || {}} accent={{ bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-500' }} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-theme-border text-xs flex justify-between">
                        <span className="font-bold text-theme-text-secondary">Nouveaux membres :</span>
                        <span className="font-black text-theme-text-primary">{report.effectifs?.nouveaux_membres_reel ?? 0}</span>
                    </div>
                </SectionCard>

                {activitesPassees.length > 0 && (
                    <SectionCard title="Activités Écoulées" icon={Play} color="bg-blue-500/15 text-blue-400">
                        <div className="space-y-3">
                            {activitesPassees.map((a: any) => (
                                <div key={a.event_id} className="p-3 bg-theme-bg border border-theme-border rounded-xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-black text-sm">{a.title}</p>
                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-theme-surface border border-theme-border text-theme-text-secondary">
                                            {a.statut}
                                        </span>
                                    </div>
                                    <p className="text-xs text-theme-text-secondary leading-relaxed">
                                        {a.appreciation || <span className="italic opacity-50">Aucune appréciation fournie.</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {activitesFutures.length > 0 && (
                    <SectionCard title="Activités à Venir" icon={FastForward} color="bg-emerald-500/15 text-emerald-400">
                        <div className="space-y-3">
                            {activitesFutures.map((a: any) => (
                                <div key={a.event_id} className="p-3 bg-theme-bg border border-theme-border rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <p className="font-black text-sm">{a.title}</p>
                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-theme-surface border border-theme-border text-theme-text-secondary">
                                            {a.statut}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}
            </main>

            {pdfData && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden', height: 0, width: 0 }}>
                    {pdfData.effectifs?.details_structures ? (
                        <ReportAggregatedPDF data={pdfData} />
                    ) : (
                        <ReportPDF data={pdfData} />
                    )}
                </div>
            )}
        </div>
    );
};
