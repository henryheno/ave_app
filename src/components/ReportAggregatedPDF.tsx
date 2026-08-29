import React from 'react';

export type ReportPDFData = {
  title: string;
  reportType: string;
  anneeInitiatique: string;
  authorName: string;
  structureName: string;
  structureType?: string;
  codiName?: string;
  comaName?: string;
  province?: string;
  effectifs: any;
  activites: any[];
  dateSoumission: string;
};

interface ReportPDFProps {
  data: ReportPDFData;
}

export const ReportAggregatedPDF: React.FC<ReportPDFProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const effectifReel = data.effectifs?.anges?.reel + data.effectifs?.archanges?.reel + data.effectifs?.perames?.reel || 0;
  const activitesPassees = data.activites.filter(a => a.type_activite === 'passee');
  const activitesFutures = data.activites.filter(a => a.type_activite === 'future');

  return (
    <div
      id="report-pdf-container"
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '0',
        zIndex: -9999,
        pointerEvents: 'none',
        width: '794px'
      }}
    >
      <div
        id="report-pdf-content"
        className="flex flex-col relative select-none"
        style={{
          width: '794px',
          minWidth: '794px',
          maxWidth: '794px',
          minHeight: '1122px', // Minimum height for A4, can grow if needed, html2pdf will handle page breaks
          backgroundColor: '#ffffff',
          color: '#000000',
          boxSizing: 'border-box',
          fontFamily: '"Times New Roman", serif',
          fontSize: '11.5pt',
          lineHeight: '1.6',
          paddingTop: '45px',
          paddingBottom: '35px',
          paddingLeft: '65px',
          paddingRight: '65px'
        }}
      >
        {/* FILIGRANE OCCUPANT TOUTE LA PAGE */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            opacity: 0.03,
            zIndex: 0,
            padding: '40px'
          }}
        >
          <img loading="lazy"
            src="/logo2.webp"
            alt="Filigrane Pleine Page"
            className="w-full h-full object-contain filter blur-[0.5px]"
          />
        </div>

        {/* CONTENU PRINCIPAL */}
        <div className="relative z-10 flex flex-col w-full" style={{ boxSizing: 'border-box' }}>

          {/* 1. EN-TÊTE PERSONNALISÉ */}
          <div className="flex flex-col items-center text-center mb-6 w-full">
            <img loading="lazy" src="/logo.webp" alt="Logo" className="w-20 h-20 object-contain mb-3" />

            {data.codiName && (
              <p className="uppercase font-black" style={{ fontSize: '14pt', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000000', margin: 0 }}>
                {data.codiName.toUpperCase()}
              </p>
            )}

            <p className="uppercase tracking-wide font-bold" style={{ fontSize: '12pt', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000000', margin: 0 }}>
              Pastorale des jeunes
            </p>
            <p className="uppercase font-black tracking-tight" style={{ fontSize: '12pt', color: '#dc2626', margin: '4px 0 2px 0' }}>
              Mouvement Armée des Petits Anges
            </p>

            {data.structureType === 'COMI' && (
              <>
                {data.comaName && (
                  <p className="uppercase font-bold" style={{ fontSize: '11pt', color: '#1d4ed8', margin: 0 }}>
                    {data.comaName.toUpperCase()}
                  </p>
                )}
                <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#ca8a04', margin: '2px 0 0 0' }}>
                  {data.structureName.toUpperCase()}
                </p>
              </>
            )}

            {data.structureType === 'COMA' && (
              <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#1d4ed8', margin: '2px 0 0 0' }}>
                {data.structureName.toUpperCase()}
              </p>
            )}

            {data.structureType === 'CORE' && (
              <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#1d4ed8', margin: '2px 0 0 0' }}>
                {data.structureName.toUpperCase()}
              </p>
            )}

            {/* If no type is provided or it's another type, fallback */}
            {!['COMI', 'COMA', 'CORE'].includes(data.structureType || '') && (
              <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#ca8a04', margin: '2px 0 0 0' }}>
                {data.structureName.toUpperCase()}
              </p>
            )}
          </div>

          {/* 2. OBJET ET DATE */}
          <div className="flex justify-between items-start mb-8 w-full" style={{ fontSize: '11.5pt', color: '#000000', boxSizing: 'border-box' }}>
            <div className="text-left font-bold uppercase pt-1" style={{ maxWidth: '400px' }}>
              OBJET : RAPPORT AGRÉGÉ {data.reportType.toUpperCase()} DES ACTIVITÉS
            </div>
            <div className="text-right flex flex-col max-w-[340px]">
              <p className="text-sm italic" style={{ margin: 0 }}>
                {data.province || 'Lubumbashi'}, le {formatDate(data.dateSoumission)}
              </p>
            </div>
          </div>

          {/* 3. CORPS DU TEXTE (PAS DE TABLEAUX) */}
          <div className="space-y-4 w-full" style={{ boxSizing: 'border-box', fontSize: '11.5pt', color: '#000000' }}>

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", margin: 0 }}>
              Nous venons par la présente vous soumettre le rapport agrégé <strong>{data.reportType}</strong> de la structure <strong>{data.structureName}</strong>, concernant l'année initiatique <strong>{data.anneeInitiatique}</strong>.
              Ce document présente l'état de nos effectifs globaux ainsi qu'une synthèse consolidée des activités réalisées et de celles à venir par nos sous-structures.
            </p>

            <h3 className="font-bold uppercase mt-6 mb-2" style={{ fontSize: '11.5pt' }}>1. État des effectifs</h3>
            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "12px" }}>
              Au cours de cette période, notre effectif réel total s'est élevé à <strong>{effectifReel}</strong> membres actifs. L'application (système) enregistre un total global de <strong>{(data.effectifs?.anges?.systeme || 0) + (data.effectifs?.archanges?.systeme || 0) + (data.effectifs?.perames?.systeme || 0)}</strong> membres pour notre structure. La répartition globale se présente comme suit :
            </p>

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "12px" }}>
              Pour la branche des <strong>Anges</strong>, l'effectif réel est de <strong>{data.effectifs?.anges?.reel || 0}</strong> membres (comprenant {data.effectifs?.anges?.garcons || 0} garçons et {data.effectifs?.anges?.filles || 0} filles).
              Dans le système informatique, <strong>{data.effectifs?.anges?.systeme || 0}</strong> membres sont formellement inscrits ({data.effectifs?.anges?.systeme_garcons || 0} garçons, {data.effectifs?.anges?.systeme_filles || 0} filles).
            </p>

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "12px" }}>
              En ce qui concerne les <strong>Archanges</strong>, nous comptons un effectif réel de <strong>{data.effectifs?.archanges?.reel || 0}</strong> membres ({data.effectifs?.archanges?.garcons || 0} garçons et {data.effectifs?.archanges?.filles || 0} filles).
              Le système enregistre quant à lui <strong>{data.effectifs?.archanges?.systeme || 0}</strong> membres inscrits ({data.effectifs?.archanges?.systeme_garcons || 0} garçons, {data.effectifs?.archanges?.systeme_filles || 0} filles).
            </p>

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "12px" }}>
              Enfin, pour les <strong>Pérames</strong>, l'effectif réel s'élève à <strong>{data.effectifs?.perames?.reel || 0}</strong> membres ({data.effectifs?.perames?.garcons || 0} garçons et {data.effectifs?.perames?.filles || 0} filles).
              Parmi eux, <strong>{data.effectifs?.perames?.systeme || 0}</strong> membres figurent dans la base de données du système ({data.effectifs?.perames?.systeme_garcons || 0} garçons, {data.effectifs?.perames?.systeme_filles || 0} filles).
            </p>

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "20px" }}>
              Par ailleurs, concernant la vitalité de nos structures, nous avons eu la joie d'accueillir <strong>{data.effectifs?.nouveaux_membres_reel || 0}</strong> nouveaux membres au total durant cette période. Parmi ces nouvelles recrues, <strong>{data.effectifs?.nouveaux_membres_systeme || 0}</strong> ont déjà achevé leur enregistrement officiel dans l'application.
            </p>

            {data.effectifs?.details_structures?.length > 0 && (
              <>
                <h4 className="font-bold uppercase mt-6 mb-2" style={{ fontSize: '11pt' }}>Répartition détaillée par structure</h4>
                <div style={{ marginLeft: '15px', marginBottom: '16px' }}>
                  {data.effectifs.details_structures.map((s: any, i: number) => {
                    const totalSReel = s.anges.reel + s.archanges.reel + s.perames.reel;
                    const totalSSystem = s.anges.systeme + s.archanges.systeme + s.perames.systeme;
                    return (
                      <p key={i} style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.6", marginBottom: "8px" }}>
                        <strong>• {s.structure_type} {s.structure_name}</strong> a compté un effectif réel de <strong>{totalSReel}</strong> membres,
                        dont {s.anges.reel} Anges, {s.archanges.reel} Archanges et {s.perames.reel} Pérames.
                        Dans le système, la structure enregistre <strong>{totalSSystem}</strong> membres
                        ({s.anges.systeme} Anges, {s.archanges.systeme} Archanges, {s.perames.systeme} Pérames).
                      </p>
                    );
                  })}
                </div>
              </>
            )}

            <div className="html2pdf__page-break"></div>

            <h3 className="font-bold uppercase mt-6 mb-2" style={{ fontSize: '11.5pt' }}>2. Synthèse des activités</h3>
            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "12px" }}>
              Sur le plan pastoral et organisationnel, nous avons planifié et exécuté un certain nombre d'activités pour l'édification de nos membres. Concernant les événements achevés, nous avons réalisé avec succès <strong>{activitesPassees.length}</strong> activité(s).
            </p>
            {activitesPassees.length > 0 && (
              <div style={{ marginLeft: '35px', marginBottom: '16px' }}>
                {activitesPassees.map((a, i) => (
                  <p key={i} style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.6", marginBottom: "8px" }}>
                    <strong>• {a.title}</strong>{a.source_structure ? <em style={{ fontWeight: 'normal' }}> [{a.source_structure}]</em> : ''} (organisée le {new Date(a.date).toLocaleDateString('fr-FR')}) : L'activité a été évaluée avec le statut <em>"{a.statut}"</em>.
                    {a.appreciation ? ` Sur le plan de l'appréciation générale, nous notons que : ${a.appreciation}` : ''}
                  </p>
                ))}
              </div>
            )}

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginBottom: "12px" }}>
              En ce qui concerne la suite de notre programme, nous avons actuellement <strong>{activitesFutures.length}</strong> événement(s) en préparation pour la période à venir :
            </p>
            {activitesFutures.length > 0 && (
              <div style={{ marginLeft: '35px', marginBottom: '16px' }}>
                {activitesFutures.map((a, i) => (
                  <p key={i} style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.6", marginBottom: "8px" }}>
                    <strong>• {a.title}</strong>{a.source_structure ? <em style={{ fontWeight: 'normal' }}> [{a.source_structure}]</em> : ''} (prévue pour le {new Date(a.date).toLocaleDateString('fr-FR')}) : L'état d'avancement actuel de la préparation est défini comme <em>"{a.statut}"</em>.
                  </p>
                ))}
              </div>
            )}

            <p style={{ textAlign: "justify", textJustify: "inter-word", lineHeight: "1.8", textIndent: "35px", marginTop: '24px' }}>
              Nous restons à votre entière disposition pour tout complément d'information et vous prions d'agréer, chers Coordinateurs, l'expression de nos salutations fraternelles.
            </p>
          </div>

          {/* 4. SIGNATURE */}
          <div className="flex justify-end mt-12 w-full text-center" style={{ color: '#000000' }}>
            <div>
              <p className="font-bold" style={{ margin: 0 }}>Pour le bureau paroissial</p>
              <p style={{ margin: '4px 0 0 0' }}>{data.authorName}</p>
            </div>
          </div>

          {/* 5. SLOGAN ET DEVISE */}
          <div className="flex flex-col items-center justify-center mt-12 w-full gap-1 mb-8">
            <p
              className="text-center font-bold tracking-widest"
              style={{
                fontSize: '10.5pt',
                color: '#000000',
                fontVariant: 'small-caps',
                letterSpacing: '0.15em',
                margin: 0
              }}
            >
              Service • Louange • Obéissance • Sainteté
            </p>
            <p className="font-black tracking-widest" style={{ fontSize: '11pt', color: '#000000', margin: 0 }}>
              S.L.O.S
            </p>
            <p className="font-black" style={{ fontSize: '16pt', letterSpacing: '0.1em', margin: 0 }}>
              <span style={{ color: '#dc2626' }}>A</span>
              <span style={{ color: '#1d4ed8' }}>V</span>
              <span style={{ color: '#ca8a04' }}>E</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
