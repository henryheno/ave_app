import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PageLoader } from '../../monapp/Branding';
import { useTheme } from '../../monapp/ThemeContext';
import {
    ArrowLeft,
    Download,
    FileText,
    Users,
    User as UserIcon,
    ChevronDown,
    Edit2,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { FormationPdfTemplate } from './FormationPdfTemplate';
import { useAuth } from '../../monapp/AuthContext';
import { useNotification } from '../../monapp/NotificationContext';

export const FormationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    useTheme();
    const contentRef = useRef<HTMLDivElement>(null);
    const pdfTemplateRef = useRef<HTMLDivElement>(null);
    const [downloadTroupe, setDownloadTroupe] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const queryClient = useQueryClient();
    const { role } = useAuth();
    const { showNotification } = useNotification();
    const canEdit = role === 'admin' || role === 'superadmin';

    const { data: lecon, isLoading } = useQuery({
        queryKey: ['formations_lecons', id],
        queryFn: async () => {
            const { data: leconData, error: leconError } = await supabase
                .from('formations_lecons')
                .select('*')
                .eq('id', id)
                .single();

            if (leconError) throw leconError;

            if (leconData.type_lecon === 'troupe') {
                const { data: troupes, error: troupesError } = await supabase
                    .from('formations_troupes_contenus')
                    .select('*')
                    .eq('lecon_id', id);
                if (troupesError) throw troupesError;
                leconData.troupes = troupes;
            }

            return leconData;
        },
    });

    const triggerDownload = (troupeName: string | null) => {
        setDownloadTroupe(troupeName);
        setIsDropdownOpen(false);

        // Attendre que le composant React se mette à jour avec la bonne troupe avant de capturer
        setTimeout(async () => {
            if (!pdfTemplateRef.current || !lecon) return;

            const element = pdfTemplateRef.current;
            const filename = troupeName
                ? `Lecon_${lecon.numero}_${troupeName}_${lecon.theme_general.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
                : `Lecon_${lecon.numero}_${lecon.theme_general.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;

            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 794, // 210mm ≈ 794px à 96dpi
                    onclone: (clonedDoc: Document) => {
                        const fix = clonedDoc.createElement('style');
                        fix.textContent = `
                            :root, * {
                                --color-white: #ffffff !important;
                                --color-black: #000000 !important;
                                --color-gray-50: #f9fafb !important;
                                --color-gray-100: #f3f4f6 !important;
                                --color-gray-200: #e5e7eb !important;
                                --color-gray-300: #d1d5db !important;
                                --color-gray-400: #9ca3af !important;
                                --color-gray-500: #6b7280 !important;
                                --color-gray-600: #4b5563 !important;
                                --color-gray-700: #374151 !important;
                                --color-gray-800: #1f2937 !important;
                                --color-gray-900: #111827 !important;
                                --color-blue-50: #eff6ff !important;
                                --color-blue-100: #dbeafe !important;
                                --color-blue-500: #3b82f6 !important;
                                --color-blue-600: #2563eb !important;
                                --color-slate-50: #f8fafc !important;
                                --color-slate-900: #0f172a !important;
                            }
                        `;
                        clonedDoc.head.insertBefore(fix, clonedDoc.head.firstChild);
                    },
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };

            const html2pdf = (await import('html2pdf.js')).default;
            html2pdf().from(element).set(opt).save();
        }, 150);
    };

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('formations_lecons').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['formations_lecons'] });
            showNotification('Leçon supprimée avec succès', 'success');
            navigate('/formation');
        },
        onError: () => {
            showNotification('Erreur lors de la suppression', 'error');
        }
    });

    const handleDelete = () => {
        if (window.confirm('Voulez-vous vraiment supprimer cette leçon ? Cette action est irréversible.')) {
            deleteMutation.mutate();
        }
    };

    if (isLoading) return <PageLoader />;
    if (!lecon) return <div className="p-8 text-center">Leçon introuvable</div>;

    const isUnique = lecon.type_lecon === 'unique';

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
            {/* HEADER */}
            <header className="bg-theme-bg/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/formation')} className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <span className="block font-black text-theme-text-primary text-base leading-none uppercase tracking-tighter">Leçon {lecon.numero}</span>
                        <span className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest">{lecon.categorie}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Actions d'édition (Admin) */}
                    {canEdit && (
                        <>
                            <button
                                onClick={() => navigate(`/formation/modifier/${lecon.id}`)}
                                className="flex items-center gap-2 p-2.5 bg-theme-surface border border-theme-border text-theme-text-primary rounded-xl hover:bg-theme-surface-hover transition-all cursor-pointer"
                                title="Modifier la leçon"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                                className="flex items-center gap-2 p-2.5 bg-theme-surface border border-theme-border text-red-500 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer"
                                title="Supprimer la leçon"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-theme-border mx-1" />
                        </>
                    )}

                    {isUnique ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => triggerDownload(null)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl font-black text-xs shadow hover:opacity-90 transition-all cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden md:inline">PDF</span>
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex items-center gap-2">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-xl font-black text-xs shadow hover:opacity-90 transition-all cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden md:inline">PDF</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-theme-surface border border-theme-border rounded-xl shadow-xl overflow-hidden z-50">
                                    {/* Option : toutes les troupes */}
                                    <button
                                        onClick={() => triggerDownload('all')}
                                        className="w-full text-left px-4 py-3 text-sm font-bold text-theme-text-primary hover:bg-theme-surface-hover transition-colors border-b border-theme-border flex items-center gap-2"
                                    >
                                        <Download className="w-3.5 h-3.5 text-theme-accent-start" />
                                        Tout télécharger
                                    </button>
                                    {/* Option : par troupe */}
                                    {lecon.troupes?.map((t: any) => (
                                        <button
                                            key={t.id}
                                            onClick={() => triggerDownload(t.nom_troupe)}
                                            className="w-full text-left px-4 py-3 text-sm font-bold text-theme-text-primary hover:bg-theme-surface-hover transition-colors border-b border-theme-border last:border-0"
                                        >
                                            Troupe {t.nom_troupe} uniquement
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto w-full p-4 pb-28 space-y-6">

                {/* Template PDF caché */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <FormationPdfTemplate ref={pdfTemplateRef} lecon={lecon} selectedTroupe={downloadTroupe} />
                </div>

                {/* Contenu visible de la page */}
                <div
                    ref={contentRef}
                    className="bg-theme-surface rounded-xl border border-theme-border p-4 md:p-5 space-y-5 print:bg-white print:text-black print:border-none"
                >
                    {/* En-tête de la leçon */}
                    <div className="space-y-3 border-b border-theme-border pb-4 print:border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-theme-bg border border-theme-border shrink-0 print:bg-gray-100 print:border-gray-300">

                                    <span className="text-xs font-black text-theme-text-primary leading-none print:text-black">N°{lecon.numero}</span>
                                </div>
                                <div>
                                    <h1 className="font-black text-lg text-theme-text-primary leading-tight print:text-black">{lecon.theme_general}</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-theme-bg border border-theme-border text-theme-text-secondary print:bg-gray-100 print:border-gray-300 print:text-gray-600">
                                            {isUnique ? <FileText className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                            {isUnique ? 'Leçon Unique' : 'Par Troupe'}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-theme-bg border border-theme-border text-theme-text-secondary print:bg-gray-100 print:border-gray-300 print:text-gray-600">
                                            Catégorie : {lecon.categorie}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {lecon.animateur && (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-theme-surface-hover flex items-center justify-center shrink-0 overflow-hidden print:bg-gray-200">
                                    <UserIcon className="w-3 h-3 text-theme-text-secondary print:text-gray-500" />
                                </div>
                                <span className="text-xs font-bold text-theme-text-secondary print:text-gray-600">
                                    Animée par : <span className="text-theme-text-primary print:text-black">{lecon.animateur}</span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Objectif */}
                    <div className="space-y-1.5">
                        <h2 className="text-[10px] font-black text-theme-text-primary uppercase tracking-widest print:text-black">Objectif de la leçon</h2>
                        <div className="p-3 rounded-lg bg-theme-bg border border-theme-border print:bg-gray-50 print:border-gray-200">
                            <p className="text-xs text-theme-text-secondary leading-relaxed italic print:text-gray-700">"{lecon.objectif}"</p>
                        </div>
                    </div>

                    {/* Contenu */}
                    <div className="space-y-3">
                        <h2 className="text-[10px] font-black text-theme-text-primary uppercase tracking-widest print:text-black">Contenu</h2>

                        {isUnique ? (
                            <div
                                className="prose prose-sm md:prose-base prose-invert max-w-none text-theme-text-secondary print:prose-p:text-black print:prose-headings:text-black"
                                dangerouslySetInnerHTML={{ __html: lecon.contenu_unique }}
                            />
                        ) : (
                            <div className="space-y-4">
                                {lecon.troupes?.map((troupe: any) => (
                                    <div key={troupe.id} className="space-y-2 p-3 rounded-lg border border-theme-border bg-theme-bg/50 print:border-gray-300 print:bg-white print:break-inside-avoid">
                                        <div className="border-b border-theme-border pb-1.5 print:border-gray-200">
                                            <h3 className="text-xs font-black text-theme-accent-start uppercase tracking-wider print:text-black">
                                                Troupe : {troupe.nom_troupe}
                                            </h3>
                                            <p className="text-[10px] text-theme-text-secondary font-bold print:text-gray-600">
                                                Sous-thème : {troupe.sous_theme}
                                            </p>
                                        </div>
                                        <div
                                            className="prose prose-sm prose-invert max-w-none text-theme-text-secondary print:prose-p:text-black print:prose-headings:text-black"
                                            dangerouslySetInnerHTML={{ __html: troupe.contenu }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer PDF */}
                    <div className="pt-8 mt-8 border-t border-theme-border text-center print:border-gray-200">
                        <p className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest print:text-gray-500">
                            Armée de Petits Anges — Formation
                        </p>
                    </div>

                </div>
            </main>
        </div>
    );
};
