import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export type TransferLetterData = {
  nom: string;
  prenom: string;
  sexe: string;
  branche: string;
  fonction: string;
  fromStructureName: string;
  fromStructureType?: string;
  fromCodiName?: string;
  fromComaName?: string;
  fromProvince?: string;
  toStructureName: string;
  requestDate: string;
  approvedDate: string;
  approvedByName: string;
  qrToken: string;
};

interface TransferLetterPDFProps {
  data: TransferLetterData;
  verifyUrl: string;
}

export const TransferLetterPDF: React.FC<TransferLetterPDFProps> = ({ data, verifyUrl }) => {
  // Formatage de la date en version textuelle classique
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      id="transfer-letter-container"
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
        id="transfer-letter-content"
        className="flex flex-col justify-between relative select-none"
        style={{
          width: '794px',
          minWidth: '794px',
          maxWidth: '794px',
          height: '1122px',
          minHeight: '1122px',
          maxHeight: '1122px',
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
            opacity: 0.03, // Opacité très douce pour garantir la lisibilité du texte sur toute la surface
            zIndex: 0,
            padding: '40px' // Évite que le filigrane ne colle trop aux bords physiques de la feuille
          }}
        >
          <img loading="lazy"
            src="/logo2.webp"
            alt="Filigrane Pleine Page"
            className="w-full h-full object-contain filter blur-[0.5px]"
          />
        </div>

        {/* CONTENU PRINCIPAL DE LA LETTRE */}
        <div className="relative z-10 flex flex-col justify-between h-full w-full" style={{ boxSizing: 'border-box' }}>
          <div>

            {/* 1. EN-TÊTE PERSONNALISÉ */}
            <div className="flex flex-col items-center text-center mb-6 w-full">
              <img loading="lazy" src="/logo.webp" alt="Logo" className="w-20 h-20 object-contain mb-3" />

              {data.fromCodiName && (
                <p className="uppercase font-black" style={{ fontSize: '14pt', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000000', margin: 0 }}>
                  {data.fromCodiName.toUpperCase()}
                </p>
              )}

              <p className="uppercase tracking-wide font-bold" style={{ fontSize: '12pt', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000000', margin: 0 }}>
                Pastorale des jeunes
              </p>
              <p className="uppercase font-black tracking-tight" style={{ fontSize: '12pt', color: '#dc2626', margin: '4px 0 2px 0' }}>
                Mouvement Armée des Petits Anges
              </p>

              {data.fromStructureType === 'COMI' && (
                <>
                  {data.fromComaName && (
                    <p className="uppercase font-bold" style={{ fontSize: '11pt', color: '#1d4ed8', margin: 0 }}>
                      {data.fromComaName.toUpperCase()}
                    </p>
                  )}
                  <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#ca8a04', margin: '2px 0 0 0' }}>
                    {data.fromStructureName.toUpperCase()}
                  </p>
                </>
              )}

              {data.fromStructureType === 'COMA' && (
                <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#1d4ed8', margin: '2px 0 0 0' }}>
                  {data.fromStructureName.toUpperCase()}
                </p>
              )}

              {data.fromStructureType === 'CORE' && (
                <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#1d4ed8', margin: '2px 0 0 0' }}>
                  {data.fromStructureName.toUpperCase()}
                </p>
              )}

              {/* Fallback */}
              {!['COMI', 'COMA', 'CORE'].includes(data.fromStructureType || '') && (
                <p className="uppercase font-bold" style={{ fontSize: '12pt', fontFamily: 'Verdana, Geneva, sans-serif', color: '#ca8a04', margin: '2px 0 0 0' }}>
                  {data.fromStructureName.toUpperCase()}
                </p>
              )}
            </div>

            {/* 3. ALIGNEMENT DE L'OBJET ET DU DESTINATAIRE SUR LA MÊME LIGNE */}
            <div className="flex justify-between items-start mb-8 w-full" style={{ fontSize: '11.5pt', color: '#000000', boxSizing: 'border-box' }}>
              {/* Gauche : Objet en gras et majuscules */}
              <div className="text-left font-bold uppercase pt-1" style={{ maxWidth: '320px' }}>
                OBJET : LETTRE DE TRANSFERT
              </div>

              {/* Droite : Informations du destinataire */}
              <div className="text-right flex flex-col max-w-[340px]">
                <p className="text-sm font-medium" style={{ margin: '0 0 2px 0' }}>À l'attention de</p>
                <p className="text-sm font-bold" style={{ margin: '0 0 1px 0' }}>La Coordination de</p>
                <p className="text-sm font-bold" style={{ margin: 0 }}>COMI {data.toStructureName}</p>
              </div>
            </div>

            {/* 4. SALUTATION CENTRÉE AU MILIEU DE LA PAGE */}
            <div className="text-center mb-6 w-full" style={{ fontSize: '11.5pt', color: '#000000' }}>
              <p style={{ margin: 0 }}>Ave, Chers Coordinateurs,</p>
            </div>

            {/* 5. CORPS DE LA LETTRE (ENTIÈREMENT JUSTIFIÉ ET ALIGNÉ) */}
            <div className="space-y-3 w-full" style={{ boxSizing: 'border-box', fontSize: '11.5pt', color: '#000000' }}>
              <p
                style={{
                  textAlign: "justify",
                  textJustify: "inter-word",
                  lineHeight: "1.8",
                  textIndent: "35px",
                  margin: 0
                }}
              >
                Nous avons l'honneur de vous présenter le membre <span className="font-bold italic">{data.prenom} {data.nom}</span>, de la branche <strong>{data.branche}</strong>, exerçant le Rôle  de <strong>{data.fonction || 'Responsable'}</strong>, en provenance du COMI <strong>{data.fromStructureName}</strong>, qui a reçu l'autorisation de rejoindre le COMI <strong>{data.toStructureName}</strong> afin d'y poursuivre son engagement au sein du Mouvement Armée des Petits Anges.
              </p>

              <p
                style={{
                  textAlign: "justify",
                  textJustify: "inter-word",
                  lineHeight: "1.8",
                  textIndent: "35px",
                  margin: 0
                }}
              >
                Après examen de sa demande introduite le {formatDate(data.requestDate)} et approuvée le {formatDate(data.approvedDate)} par <strong>{data.approvedByName}</strong>, nous vous prions de bien vouloir lui réserver un accueil fraternel et de lui permettre de poursuivre sa mission conformément aux dispositions du mouvement.
              </p>

              <p
                style={{
                  textAlign: "justify",
                  textJustify: "inter-word",
                  lineHeight: "1.8",
                  textIndent: "35px",
                  margin: 0
                }}
              >
                En foi de quoi, la présente lettre lui est délivrée pour servir et valoir ce que de droit.
              </p>
            </div>

            {/* 6. DATE (ALIGNÉE À DROITE) DÉPLACÉE ICI */}
            <div className="flex justify-end mt-4 mb-4 w-full text-right" style={{ color: '#000000' }}>
              <p className="text-sm italic" style={{ margin: 0 }}>
                {data.fromProvince || 'Lubumbashi'}, le {formatDate(data.approvedDate)}
              </p>
            </div>

            {/* 7. SLOGAN ET DEVISE */}
            <div className="flex flex-col items-center justify-center mt-6 w-full gap-1">
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

          {/* 7. PIED DE PAGE : COMPRENANT LE SCAN ET LA SIGNATURE MANUSCRITE DU CURÉ */}
          <div
            className="flex justify-between items-start pt-6 w-full"
            style={{ boxSizing: 'border-box' }}
          >

            {/* Gauche : Bloc Scan sous la ligne imaginaire du Slogan */}
            <div className="flex flex-col items-start max-w-[280px]">
              <div
                className="p-1 bg-white border rounded mb-2"
                style={{ borderColor: '#000000' }}
              >
                <QRCodeSVG value={verifyUrl} size={110} level="H" />
              </div>
              <p className="leading-tight text-left font-bold" style={{ fontSize: '8pt', color: '#000000', margin: '0 0 4px 0' }}>
                Scanner ce QR Code pour vérifier<br />l'authenticité de cette lettre.
              </p>
              <p className="leading-tight text-left italic" style={{ fontSize: '7pt', color: '#b91c1c', margin: 0 }}>
                * Même si le document est scanné et déclaré authentique par l'application, <strong>la signature manuscrite et le sceau du curé sont obligatoires</strong> pour sa validité finale.
              </p>
            </div>

            {/* Droite : Bloc de Signature unique réservé au Curé */}
            <div
              className="text-center flex flex-col items-center"
              style={{ minWidth: '280px', boxSizing: 'border-box' }}
            >
              <p
                className="font-bold"
                style={{ fontSize: '11.5pt', color: '#000000', margin: '0 0 2px 0' }}
              >
                Pour le Curé de la Paroisse,
              </p>
              <p
                className="text-xs italic"
                style={{ color: '#000000', margin: 0 }}
              >
                Sceau et Signature
              </p>

              {/* Espace libre pour l'apposition physique du cachet paroissial et de la signature */}
              <div style={{ height: '55px' }}></div>

              {/* Ligne de délimitation pour la signature manuscrite */}
              <div className="w-52 border-b border-black"></div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};