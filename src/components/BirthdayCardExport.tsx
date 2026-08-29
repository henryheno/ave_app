import React, { useRef, useState, useEffect } from 'react';
import { toBlob } from 'html-to-image';
import { Download, Share2, X, PartyPopper } from 'lucide-react';
import { getBirthdayTitle } from '../lib/birthdayUtils';

interface BirthdayCardExportProps {
  profile: any;
  onClose: () => void;
}

export const BirthdayCardExport: React.FC<BirthdayCardExportProps> = ({ profile, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

  const generateCanvasBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      return await toBlob(cardRef.current, {
        pixelRatio: 2, // Réduit à 2 pour moins de charge mémoire sur mobile
        style: {
          backgroundColor: 'transparent',
          transform: 'scale(1)', // Force le scale à 1 pour la génération
          transformOrigin: 'top left',
          margin: '0'
        }
      });
    } catch (e) {
      console.error('Erreur html-to-image:', e);
      return null;
    }
  };

  useEffect(() => {
    // Génère l'image silencieusement dès l'ouverture pour éviter les timeouts (surtout sur iOS Safari)
    // et pour permettre à l'utilisateur de faire un appui long pour sauvegarder.
    const timer = setTimeout(async () => {
      try {
        const blob = await generateCanvasBlob();
        if (blob) {
          setGeneratedBlob(blob);
          setGeneratedUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.error('Erreur pré-génération:', err);
      }
    }, 800); // Laisse le temps aux images de charger
    return () => clearTimeout(timer);
  }, []);

  const handleShare = async () => {
    setIsExporting(true);
    try {
      const blob = generatedBlob || await generateCanvasBlob();
      if (!blob) throw new Error("Génération impossible");
      const file = new File([blob], `anniversaire_${profile?.prenom || 'apa'}.png`, { type: 'image/png' });
      
      // On teste d'abord si on peut partager le fichier
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Joyeux Anniversaire !',
          text: `Joyeux anniversaire ${titleName} !`
        });
      } else if (navigator.share) {
        // Fallback texte si le partage de fichier n'est pas supporté (vieux navigateurs mobiles)
        await navigator.share({
          title: 'Joyeux Anniversaire !',
          text: `Joyeux anniversaire ${titleName} !`
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erreur de partage', err);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const blob = generatedBlob || await generateCanvasBlob();
      if (!blob) throw new Error("Génération impossible");
      const image = generatedUrl || URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = image;
      link.download = `carte_anniversaire_${profile?.prenom || 'apa'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!generatedUrl) URL.revokeObjectURL(image);
    } catch (err) {
      console.error('Erreur de téléchargement', err);
    } finally {
      setIsExporting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const titleName = getBirthdayTitle(profile);

  // Vérifie si l'API de partage est dispo (généralement sur mobile)
  const canShare = !!(navigator.share);

  // Thème de la bannière selon la branche (mêmes couleurs que ThemeContext)
  const brancheKey = (profile?.branche || 'enfant').toLowerCase().trim();
  const BRANCH_COLORS: Record<string, string> = {
    enfant: '#FFFF00', ange: '#FFFF00', anges: '#FFFF00', ka: '#FFFF00',
    archange: '#FF0000', archanges: '#FF0000',
    perame: '#0000FF', perames: '#0000FF', 'érame': '#0000FF', pérames: '#0000FF',
  };
  const bannerColor = BRANCH_COLORS[brancheKey] || '#FFFF00';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-theme-surface border border-theme-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-theme-border">
          <h3 className="font-black text-theme-text-primary flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-pink-500" />
            Carte d'anniversaire
          </h3>
          <button onClick={onClose} className="p-2 bg-theme-bg rounded-lg hover:bg-theme-surface-hover text-theme-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Preview Container */}
        <div className="p-4 sm:p-6 bg-theme-bg flex justify-center items-center overflow-x-auto custom-scrollbar">
          <div className="relative shrink-0">
            {/* The actual HTML card to export */}
            <div
              ref={cardRef}
              className="relative w-[500px] h-[340px] shrink-0 overflow-hidden shadow-2xl"
              style={{
                backgroundColor: '#E8E1D5', // Couleur papier kraft clair
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`
              }}
            >
              {/* Ligne verticale de séparation */}
              <div className="absolute left-1/2 top-8 bottom-8 w-[1.5px] bg-zinc-700/40"></div>

              {/* PARTIE GAUCHE */}
              <div className="absolute left-0 top-0 w-1/2 h-full p-6 flex flex-col">

                {/* Bannière "JOYEUX" */}
                <div className="relative mt-2 mb-8 transform -rotate-3">
                  {/* Petit badge jaune */}
                  <div className="absolute -top-3 left-4 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-sm border border-black transform -rotate-2">
                    A.P.A
                  </div>
                  {/* Panneau aux couleurs de la branche */}
                  <div className="text-white px-4 py-2 shadow-sm rounded-sm border" style={{ backgroundColor: bannerColor, borderColor: bannerColor }}>
                    <h2 className="text-xl font-serif font-bold tracking-widest text-center uppercase drop-shadow-md">
                      Joyeux
                    </h2>
                  </div>
                  {/* Flèche droite */}
                  <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[18px] border-t-transparent border-b-[18px] border-b-transparent border-l-[12px]" style={{ borderLeftColor: bannerColor }}></div>
                </div>

                {/* Texte manuscrit */}
                <div className="flex-1 space-y-4 pr-4">
                  <p className="text-zinc-800 text-[15px] leading-relaxed italic" style={{ fontFamily: 'Georgia, serif' }}>
                    Nous te souhaitons un très bel anniversaire, rempli de grâces et de bénédictions !
                  </p>
                  <p className="text-zinc-800 text-[15px] leading-relaxed italic" style={{ fontFamily: 'Georgia, serif' }}>
                    Que cette nouvelle année t'apporte plein de bonheur et d'épanouissement !
                  </p>
                  <div className="pt-4">
                    <p className="text-zinc-800 text-sm font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>
                      À bientôt !
                    </p>
                    <p className="text-zinc-800 text-sm font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>
                      Toute la famille A.P.A
                    </p>
                  </div>
                </div>
              </div>

              {/* PARTIE DROITE */}
              <div className="absolute right-0 top-0 w-1/2 h-full p-6">

                {/* Zone Timbre + Cachet */}
                <div className="relative flex justify-end mb-12">
                  {/* Logo APA (remplace le cachet postal) */}
                  <div className="absolute right-24 top-0">
                    <img src="/logo2.webp" alt="APA" crossOrigin="anonymous" className="w-[65px] h-[65px] object-contain opacity-50 transform -rotate-6" />
                  </div>

                  {/* Le Timbre Photo */}
                  <div className="bg-white p-1.5 shadow-sm transform rotate-2 relative z-10" style={{ border: '3px dashed #ef4444' }}>
                    <div className="w-[70px] h-[90px] bg-zinc-200 overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" crossOrigin="anonymous" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-2xl font-black bg-zinc-100">
                          {profile?.prenom?.[0]}{profile?.nom?.[0]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lignes d'adresse */}
                <div className="mt-6 space-y-7 pl-4 relative">
                  {/* Ligne 1 : Titre complet */}
                  <div className="border-b border-zinc-700/40 relative pb-1">
                    <span className="absolute bottom-1 left-2 text-zinc-900 font-bold uppercase text-[14px]" style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
                      {titleName}
                    </span>
                  </div>
                  {/* Ligne 2 : Mouvement */}
                  <div className="border-b border-zinc-700/40 relative pb-1">
                    <span className="absolute bottom-1 left-2 text-zinc-700/60 text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
                      Mouvement A.P.A
                    </span>
                  </div>
                </div>

              </div>

              {/* Année en bas à droite */}
              <div className="absolute bottom-3 right-5 text-zinc-700/40 font-black text-sm">{currentYear}</div>
            </div>
            
            {/* L'image générée est superposée pour permettre l'appui long natif (Sauvegarder l'image) sur mobile */}
            {generatedUrl && (
               <img 
                 src={generatedUrl} 
                 alt="Carte d'anniversaire générée" 
                 className="absolute inset-0 w-full h-full z-10 cursor-pointer pointer-events-auto"
                 style={{ WebkitTouchCallout: 'default' }}
                 title="Appuyez longuement pour sauvegarder"
               />
            )}
          </div>
        </div>

        <div className="p-3 text-center bg-theme-bg/50 border-b border-theme-border text-[10px] text-theme-text-secondary">
            Astuce mobile : Appuyez longuement sur l'image pour la sauvegarder directement dans vos photos.
        </div>

        <div className="p-4 border-t border-theme-border flex flex-wrap justify-end gap-3 bg-theme-surface">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-theme-text-secondary hover:text-theme-text-primary">
            Fermer
          </button>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-4 py-2 bg-theme-bg border border-theme-border text-theme-text-primary rounded-xl text-sm font-black flex items-center gap-2 hover:bg-theme-surface-hover transition-all"
          >
            <Download className="w-4 h-4" /> Enregistrer
          </button>

          {canShare && (
            <button
              onClick={handleShare}
              disabled={isExporting}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {isExporting ? <span className="animate-pulse">Patientez...</span> : <><Share2 className="w-4 h-4" /> Partager</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
