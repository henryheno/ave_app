import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Mail, MessageCircle, GitBranch } from 'lucide-react';

// Tableau mis à jour selon la structure réelle de votre dossier public
const DEVELOPER_IMAGES = [
  '/protrait.webp',
  '/2.webp',
  '/3.webp',
  '/4.webp',
  '/5.webp'
];

export function BiographiePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'about' | 'contact'>('about');

  // État pour suivre l'index de l'image affichée
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Effet pour faire défiler les images toutes les 10 secondes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % DEVELOPER_IMAGES.length);
    }, 10000); // 10000 ms = 10 secondes

    // Nettoyage de l'intervalle lors du démontage du composant
    return () => clearInterval(timer);
  }, []);

  const renderContent = () => {
    switch (tab) {
      case 'about':
        return (
          <div className="space-y-4">
            <p className="text-zinc-300 leading-relaxed text-[15px]">
              Passionné par l'innovation numérique, je suis développeur et concepteur de systèmes d'information. Actuellement étudiant à l’<strong className="text-white">Université Catholique du Congo (UCC)</strong>, je mets mon savoir technique au service de la création de solutions technologiques modernes.
            </p>
            <p className="text-zinc-300 leading-relaxed text-[15px]">
              Fortement ancré dans les valeurs de partage et de transmission, mon équilibre de vie repose sur un engagement apostolique profond au sein du mouvement de l'A.P.A.
            </p>
            <p className="text-zinc-300 leading-relaxed text-[15px]">
              En tant que membre dévoué, je suis <span className="text-white font-semibold bg-[#FF3D71]/20 px-1.5 py-0.5 rounded">Ya SARA Henry</span> du COMI Sainte Rita, et j'assume également le rôle de chargé de formation adjoint au COMA Sainte Marie de Kimwenza / CODI Kisantu. Cette vocation me permet d'allier ma rigueur professionnelle à ma passion pour l'encadrement et au  developpement .
            </p>
            <div className="pt-4 pb-2">
              <a href="https://henodev.vercel.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors text-sm shadow-lg shadow-white/10">
                <Globe className="w-4 h-4" /> Visiter mon Portfolio
              </a>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-3 pb-2">
            <a href="https://henodev.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 transition-all group">
              <span className="text-sm text-zinc-400 font-medium flex items-center gap-2"><Globe className="w-4 h-4" /> Portfolio</span>
              <span className="text-sm text-zinc-200 underline decoration-zinc-700 group-hover:decoration-zinc-400 font-mono mt-1 sm:mt-0">henodev.vercel.app</span>
            </a>
            <a href="mailto:henrybosale10@gmail.com" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 transition-all group">
              <span className="text-sm text-zinc-400 font-medium flex items-center gap-2"><Mail className="w-4 h-4" /> Email professionnel</span>
              <span className="text-sm text-zinc-200 underline decoration-zinc-700 group-hover:decoration-zinc-400 font-mono mt-1 sm:mt-0">henrybosale10@gmail.com</span>
            </a>
            <a href="https://wa.me/243859009681" target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 transition-all group">
              <span className="text-sm text-zinc-400 font-medium flex items-center gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp Direct</span>
              <span className="text-sm text-zinc-200 underline decoration-zinc-700 group-hover:decoration-zinc-400 font-mono mt-1 sm:mt-0">+243 859 009 681</span>
            </a>
            <a href="https://github.com/henryheno" target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 transition-all group">
              <span className="text-sm text-zinc-400 font-medium flex items-center gap-2"><GitBranch className="w-4 h-4" /> GitHub</span>
              <span className="text-sm text-zinc-200 underline decoration-zinc-700 group-hover:decoration-zinc-400 font-mono mt-1 sm:mt-0">henry-heno</span>
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col items-center py-6 md:py-10 font-sans relative overflow-x-hidden">

      {/* Arrière-plan avec halos colorés */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[130px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 z-10 w-full flex flex-col">

        {/* Bouton Retour */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center w-fit text-sm text-zinc-400 hover:text-white mb-4 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transform group-hover:-translate-x-0.5 transition-transform" /> Retour
        </button>

        {/* Conteneur principal Glassmorphism */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 md:p-6 lg:p-8 shadow-2xl w-full">

          <div className="w-full">
            {/* Conteneur principal (sans flex-row) pour utiliser le float */}
            <div className="block pb-4 relative">

              {/* Zone d'image avec float-left sur TOUS les écrans */}
              <div className="relative shrink-0 w-32 sm:w-40 md:w-56 aspect-[3/4] float-left mr-4 sm:mr-6 md:mr-8 mb-3 sm:mb-4">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-2xl blur-md" />
                <img loading="lazy"
                  src={DEVELOPER_IMAGES[currentImageIndex]}
                  alt={`Portrait de Bosale Mangi Henry - vue ${currentImageIndex + 1}`}
                  className="w-full h-full rounded-2xl object-cover border-2 border-zinc-700/60 shadow-xl relative z-10 transition-all duration-500"
                />
              </div>

              {/* Titre et sous-titre (toujours aligné à gauche) */}
              <div className="text-left mb-4 pt-1 sm:pt-2">
                <h2 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  Bosale Mangi Henry
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-zinc-400 mt-1 sm:mt-2">CEO de Heno dev & Concepteur SI</p>
              </div>

              {/* Sélecteur d'onglets premium (aligné à gauche) */}
              <div className="bg-zinc-950/60 p-1 rounded-xl inline-flex space-x-1 border border-zinc-800/60 w-[180px] sm:w-[300px] mb-5 relative z-20">
                <button
                  className={`flex-1 text-center py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${tab === 'about'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                    }`}
                  onClick={() => setTab('about')}
                >
                  Bio
                </button>
                <button
                  className={`flex-1 text-center py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${tab === 'contact'
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                    }`}
                  onClick={() => setTab('contact')}
                >
                  Contacts
                </button>
              </div>

              {/* Contenu dynamique (qui s'enroulera autour de l'image) */}
              <div className="w-full pb-8">
                {renderContent()}
              </div>

              {/* Clearfix pour s'assurer que le parent englobe tout le contenu flotté */}
              <div className="clear-both"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BiographiePage;