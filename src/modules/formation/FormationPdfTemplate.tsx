import React from 'react';

interface FormationPdfTemplateProps {
    lecon: any;
    selectedTroupe: string | null;
}

// Dimensions: A4 = 210mm x 297mm. Marges: 15mm. Zone utile ≈ 267mm
// On simule les pages avec des divs de hauteur fixe
const PAGE_STYLE: React.CSSProperties = {
    width: '210mm',
    height: '277mm', // 297mm - 20mm (marges haut+bas)
    padding: '10mm 15mm',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontFamily: 'Arial, Helvetica, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    position: 'relative',
    pageBreakAfter: 'always',
    overflow: 'hidden',
};

// ─── EN-TÊTE commun à toutes les pages ───────────────────────────────────────
const PageHeader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '8px',
        marginBottom: '12px',
        flexShrink: 0,
    }}>
        <img loading="lazy" src="/logo.webp" alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#111827' }}>
                Armée de Petits Anges
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600, marginTop: '2px' }}>
                Module de Formation
            </div>
        </div>
        <img loading="lazy" src="/logo2.webp" alt="Logo2" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
    </div>
);

// ─── PIED DE PAGE commun ──────────────────────────────────────────────────────
const PageFooter = ({ pageNum, total, dateStr, categorie }: {
    pageNum: number; total: number; dateStr: string; categorie: string;
}) => (
    <div style={{
        marginTop: 'auto',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
    }}>
        <span style={{ fontSize: '8px', color: '#9ca3af', fontStyle: 'italic' }}>
            Formation des catégories : {categorie.toUpperCase()} — générée par l'application en date du {dateStr}
        </span>
        <span style={{ fontSize: '8px', color: '#9ca3af', fontWeight: 700 }}>
            Page {pageNum} / {total}
        </span>
    </div>
);

// ─── PAGE 1 : Fiche d'informations ───────────────────────────────────────────
const InfoPage = ({ lecon, pageNum, total, dateStr }: any) => (
    <div style={PAGE_STYLE}>
        <PageHeader />

        {/* Titre de la leçon */}
        <div style={{
            textAlign: 'center',
            marginBottom: '16px',
            flexShrink: 0,
        }}>
            <div style={{
                display: 'inline-block',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 24px',
            }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    Leçon
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                    N° {lecon.numero}
                </div>
            </div>
        </div>

        {/* Tableau d'informations */}
        <div style={{
            border: '1.5px solid #e5e7eb',
            borderRadius: '10px',
            overflow: 'hidden',
            flexShrink: 0,
        }}>
            {/* Ligne 1 : Numéro | Catégorie | Animateur */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
            }}>
                {[
                    { label: 'Numéro', value: lecon.numero },
                    { label: 'Catégorie', value: lecon.categorie },
                    { label: 'Animateur', value: lecon.animateur || '—' },
                ].map((item, i) => (
                    <div key={i} style={{
                        padding: '10px 14px',
                        borderRight: i < 2 ? '1px solid #e5e7eb' : 'none',
                    }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>
                            {item.label}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#111827' }}>
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Ligne 2 : Thème général */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                    Thème Général
                </div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#111827' }}>
                    {lecon.theme_general}
                </div>
            </div>

            {/* Ligne 3 : Objectif */}
            <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                    Objectif de la leçon
                </div>
                <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#374151', lineHeight: 1.5 }}>
                    « {lecon.objectif} »
                </div>
            </div>
        </div>

        <PageFooter pageNum={pageNum} total={total} dateStr={dateStr} categorie={lecon.categorie} />
    </div>
);

// ─── PAGE CONTENU (leçon unique ou troupe) ────────────────────────────────────
const ContentPage = ({ lecon, pageNum, total, dateStr, html, troupeNom, sousTheme }: any) => (
    <div style={PAGE_STYLE}>
        <PageHeader />

        {/* Sous-titre de la page */}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            flexShrink: 0,
        }}>
            <div style={{
                width: '4px',
                height: '36px',
                background: 'linear-gradient(to bottom, #6366f1, #ec4899)',
                borderRadius: '4px',
                flexShrink: 0,
            }} />
            <div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#111827' }}>
                    {troupeNom ? `Troupe ${troupeNom}` : 'Contenu de la leçon'}
                </div>
                {sousTheme && (
                    <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>
                        Sous-thème : {sousTheme}
                    </div>
                )}
            </div>
        </div>

        {/* Contenu HTML */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
                style={{
                    fontSize: '11px',
                    lineHeight: '1.6',
                    color: '#374151',
                }}
                dangerouslySetInnerHTML={{ __html: html || '<p style="color:#9ca3af;font-style:italic">Aucun contenu</p>' }}
            />
        </div>

        <PageFooter pageNum={pageNum} total={total} dateStr={dateStr} categorie={lecon.categorie} />
    </div>
);

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export const FormationPdfTemplate = React.forwardRef<HTMLDivElement, FormationPdfTemplateProps>(
    ({ lecon, selectedTroupe }, ref) => {
        if (!lecon) return null;

        const isUnique = lecon.type_lecon === 'unique';
        const showAll = selectedTroupe === 'all';
        const dateStr = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // Calculer le nombre total de pages
        let totalPages = 1; // page info toujours présente
        if (isUnique) {
            totalPages = 2; // info + contenu
        } else if (showAll) {
            totalPages = 1 + (lecon.troupes?.length || 0); // info + une page par troupe
        } else {
            totalPages = 2; // info + contenu troupe
        }

        // Trouver les données de la troupe sélectionnée (cas unique troupe)
        const selectedTroupeData = !isUnique && !showAll && selectedTroupe
            ? lecon.troupes?.find((t: any) => t.nom_troupe === selectedTroupe)
            : null;

        return (
            <div ref={ref} style={{ backgroundColor: '#ffffff' }}>
                {/* Page 1 : Informations */}
                <InfoPage lecon={lecon} pageNum={1} total={totalPages} dateStr={dateStr} />

                {/* Page 2+ : Contenu */}
                {isUnique && (
                    <ContentPage
                        lecon={lecon}
                        pageNum={2}
                        total={totalPages}
                        dateStr={dateStr}
                        html={lecon.contenu_unique}
                    />
                )}

                {!isUnique && showAll && lecon.troupes?.map((t: any, idx: number) => (
                    <ContentPage
                        key={t.id}
                        lecon={lecon}
                        pageNum={2 + idx}
                        total={totalPages}
                        dateStr={dateStr}
                        html={t.contenu}
                        troupeNom={t.nom_troupe}
                        sousTheme={t.sous_theme}
                    />
                ))}

                {!isUnique && !showAll && selectedTroupeData && (
                    <ContentPage
                        lecon={lecon}
                        pageNum={2}
                        total={totalPages}
                        dateStr={dateStr}
                        html={selectedTroupeData.contenu}
                        troupeNom={selectedTroupeData.nom_troupe}
                        sousTheme={selectedTroupeData.sous_theme}
                    />
                )}
            </div>
        );
    }
);
