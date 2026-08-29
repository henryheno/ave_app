import { useNavigate } from 'react-router-dom';
import { ArrowRight, Book, Users, Star, GraduationCap, CheckCircle2, HeartHandshake, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../monapp/AuthContext';
import { PageLoader } from '../../monapp/Branding';

export function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'identite' | 'structure' | 'rites_formation'>('identite');
  const { user, profileAccess, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      if (profileAccess?.kind === 'complete') {
        navigate('/home', { replace: true });
      } else if (profileAccess?.kind === 'incomplete') {
        navigate('/complete-profile', { replace: true });
      }
    }
  }, [user, profileAccess, isLoading, navigate]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-white selection:bg-[#FF3D71] selection:text-white pb-12 overflow-x-hidden font-sans relative">

      {/* Background subtil et économique */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] bg-[#FF3D71]/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]"></div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md border-b border-white/5 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-md rounded-full"></div>
            <img loading="lazy" src="/logo2.webp" alt="Logo APA" className="w-10 h-10 object-contain relative z-10 drop-shadow-lg" />
          </div>
          <div className="text-xl font-black tracking-widest drop-shadow-md">
            <span className="text-[#FF3D71]">A</span>.
            <span className="text-blue-500">P</span>.
            <span className="text-yellow-500">A</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-28 relative z-10">

        {/* Hero Compact */}
        <div className="flex flex-col items-center text-center mb-10">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight drop-shadow-sm whitespace-nowrap">
            <span className="text-[#FF3D71]">Armée</span>{' '}
            <span className="text-blue-500">de Petits</span>{' '}
            <span className="text-yellow-500">Anges</span>
          </h1>

          <p className="text-gray-400 text-sm md:text-base max-w-2xl mb-6 leading-relaxed">
            Mouvement catholique d'encadrement intégral des enfants âgés d'au plus 9 ans.
          </p>

          <button
            onClick={() => navigate('/home')}
            className="group relative flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/10 text-white font-semibold py-2.5 px-6 rounded-full text-sm backdrop-blur-md transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_25px_rgba(255,61,113,0.15)]"
          >
            Accéder à son espace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Onglets (Tabs) */}
        <div className="flex flex-wrap justify-center gap-2 mb-6 p-1.5 bg-black/40 backdrop-blur-sm border border-white/5 rounded-full w-fit mx-auto shadow-inner">
          <button
            onClick={() => setActiveTab('identite')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'identite' ? 'bg-white/15 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Book className="w-4 h-4" /> Identité
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'structure' ? 'bg-white/15 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Users className="w-4 h-4" /> Structure
          </button>
          <button
            onClick={() => setActiveTab('rites_formation')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === 'rites_formation' ? 'bg-white/15 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Star className="w-4 h-4" /> Formation
          </button>
          <div className="w-px h-6 bg-white/10 self-center hidden sm:block mx-1"></div>
          <button
            onClick={() => navigate('/install-guide')}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
          >
            <Download className="w-4 h-4" /> Installer
          </button>
          <button
            onClick={() => navigate('/biographie')}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
          >
            <Users className="w-4 h-4" /> Contact
          </button>
        </div>

        {/* Contenu des Onglets */}
        <div className="bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl min-h-[280px]">

          {/* Tab: Identité */}
          {activeTab === 'identite' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-bold mb-4 text-white/90 flex items-center gap-2">
                <Book className="w-5 h-5 text-[#FF3D71]" /> Fondements et Identité
              </h2>
              <div className="space-y-4 text-sm text-gray-300">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#FF3D71] mt-0.5 shrink-0" />
                  <p><strong className="text-white">Historique :</strong> Conçu en 1983 par l'Abbé Florentin Iyanza (« Ya IF »), avec la collaboration des Abbés Tony Aïmba et Papy Ndubula. Le Mouvement est officiellement sorti le 5 novembre 1995 dans l'Archidiocèse de Kinshasa.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <p><strong className="text-white">Appellation :</strong> L'appellation « Armée de Petits Anges » s'inspire de l'armée céleste des anges, serviteurs et messagers de Dieu. Le Mouvement forme les enfants à devenir des chrétiens engagés, au service de Dieu, de l'Église et de la société.</p>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-white">Devise S.L.O.S :</strong>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-2">
                      <div className="bg-black/20 px-3 py-2 rounded-md border border-white/5"><strong className="text-[#FF3D71]">S</strong>ervice : Se mettre au service de Dieu et des plus petits.</div>
                      <div className="bg-black/20 px-3 py-2 rounded-md border border-white/5"><strong className="text-blue-500">L</strong>ouange : Glorifier Dieu par la prière et la vie chrétienne.</div>
                      <div className="bg-black/20 px-3 py-2 rounded-md border border-white/5"><strong className="text-yellow-500">O</strong>béissance : Observer les commandements de Dieu, les lois de l'Église et du Mouvement.</div>
                      <div className="bg-black/20 px-3 py-2 rounded-md border border-white/5"><strong className="text-white">S</strong>ainteté : Vivre dans la pureté, la piété et la fidélité à Dieu.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Structure */}
          {activeTab === 'structure' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-lg font-bold mb-4 text-white/90 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" /> Organisation et Structure
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <h3 className="font-bold text-white mb-3">Nos Branches</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-2 items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></span> <span><strong className="text-yellow-400">Petits Anges :</strong> enfants âgés d'au plus 9 ans.</span></li>
                    <li className="flex gap-2 items-center"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span> <span><strong className="text-red-400">Archange :</strong> 15 à 25 ans.</span></li>
                    <li className="flex gap-2 items-start"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></span> <span><strong className="text-blue-400">Perame :</strong> Perange, Mérange et Religieux engagés dans la pastorale des enfants.</span></li>
                  </ul>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <h3 className="font-bold text-white mb-3">Nos Troupes (Enfants)</h3>
                  <div className="space-y-2 text-gray-300">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <strong className="text-white">SAGA</strong> <span>Au plus 5 ans</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-1">
                      <strong className="text-white">SAO</strong> <span>6 à 7 ans</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <strong className="text-white">SARA</strong> <span>8 à 9 ans</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Rites & Formation */}
          {activeTab === 'rites_formation' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Rites */}
                <div>
                  <h2 className="text-lg font-bold mb-4 text-white/90 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" /> Signes & Rites
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-4 items-center bg-black/20 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <HeartHandshake className="w-5 h-5 text-[#FF3D71] shrink-0" />
                      <div>
                        <strong className="text-white block">Salutation "AVE"</strong>
                        <span className="text-gray-400">La salutation « AVE » est inspirée du salut de l'Ange Gabriel à la Vierge Marie lors de l'Annonciation.</span>
                      </div>
                    </div>
                    <div className="flex gap-4 items-center bg-black/20 p-3 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <Star className="w-5 h-5 text-yellow-500 shrink-0" />
                      <div>
                        <strong className="text-white block">Foulards (Scarfs)</strong>
                        <span className="text-gray-400 block mt-1">Tous les foulards de l'A.P.A. ont un fond blanc avec une étoile rouge. Les accessoires sont jaunes pour les Petits Anges et les Mon Ier, rouges pour les Archanges et bleus pour les Perame. L'étoile rouge représente Jésus-Christ, premier Martyr et Lumière du monde.</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Formation */}
                <div>
                  <h2 className="text-lg font-bold mb-4 text-white/90 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-white/80" /> Formation
                  </h2>
                  <p className='mb-4 text-gray-300'>La formation à l'A.P.A. est <span className="text-[#FF3D71] font-bold">intégrale</span>. Elle vise le développement harmonieux de l'enfant dans les dimensions suivantes :</p>

                  <div className="flex flex-col gap-2 text-sm text-gray-300">
                    <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 flex gap-2 items-start hover:bg-white/10 transition-colors">
                      <span className="text-[#FF3D71] font-bold mt-0.5">1.</span> <span><strong className="text-white">Spirituel :</strong> Développer la foi, la prière et la vie sacramentelle.</span>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 flex gap-2 items-start hover:bg-white/10 transition-colors">
                      <span className="text-blue-500 font-bold mt-0.5">2.</span> <span><strong className="text-white">Intellectuel :</strong> Développer les connaissances et l'esprit de réflexion.</span>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 flex gap-2 items-start hover:bg-white/10 transition-colors">
                      <span className="text-yellow-500 font-bold mt-0.5">3.</span> <span><strong className="text-white">Moral :</strong> Former au respect des valeurs chrétiennes et à une bonne conduite.</span>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 flex gap-2 items-start hover:bg-white/10 transition-colors">
                      <span className="text-white font-bold mt-0.5">4.</span> <span><strong className="text-white">Civique :</strong> Former des citoyens responsables, respectueux de leur pays et des lois.</span>
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/5 flex gap-2 items-start hover:bg-white/10 transition-colors">
                      <span className="text-[#FF3D71] font-bold mt-0.5">5.</span> <span><strong className="text-white">Humain :</strong> Développer les qualités humaines, le sens du partage et de la fraternité.</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>


      </div>
    </div>
  );
}
