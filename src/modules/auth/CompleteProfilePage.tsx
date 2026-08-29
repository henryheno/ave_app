import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  ChevronRight,
  Loader2,
  Users,
  LogOut,
  Camera,
} from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { PageLoader } from '../../monapp/Branding';
import { useTheme } from '../../monapp/ThemeContext';
import {
  DEFAULT_MEMBRE_BRANCHE,
  MEMBRE_BRANCHE_OPTIONS,
  type MembreBranche,
  normalizeMembreBranche,
} from '../../lib/membreBranche';
import {
  fetchStructureChildren,
  isSelectableComi,
  shouldDrillInto,
  type StructureNode,
} from '../../lib/structureTree';

type ProfileFormData = {
  nom: string;
  prenom: string;
  telephone: string;
  date_naissance: string;
  sexe: string;
  branche: MembreBranche;
  fonction: string;
  comi_id: string;
};

export const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { setBranch } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    nom: '',
    prenom: '',
    telephone: '',
    date_naissance: '',
    sexe: 'M',
    branche: DEFAULT_MEMBRE_BRANCHE,
    fonction: '',
    comi_id: '',
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const [userId, setUserId] = useState<string | null>(null);

  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structures, setStructures] = useState<StructureNode[]>([]);
  const [navPath, setNavPath] = useState<StructureNode[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(false);
  const [selectedStructureName, setSelectedStructureName] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        await checkUser();
      } catch (err) {
        console.error('checkUser init error:', err);
      }
    };
    init();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const branche = normalizeMembreBranche(profile.branche);
        setFormData((prev) => ({
          ...prev,
          nom: profile.nom || '',
          prenom: profile.prenom || '',
          telephone: profile.telephone || '',
          date_naissance: profile.date_naissance || '',
          sexe: profile.sexe || 'M',
          branche,
          fonction: profile.fonction || '',
          comi_id: profile.comi_id || '',
        }));
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (profile.comi_id) {
          const allStructures = await getStructures();
          const comi = allStructures.find(s => s.id === profile.comi_id);
          if (comi?.name) setSelectedStructureName(comi.name);
        }
        setBranch(branche);
      }
    } catch (err) {
      console.error('Error in CompleteProfilePage checkUser:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStructures = async (parentId: string | null) => {
    setStructuresLoading(true);
    const { data, error } = await fetchStructureChildren(parentId);
    if (error) {
      console.error('loadStructures error:', error);
      showNotification('Impossible de charger les structures : ' + error.message, 'error');
      setStructures([]);
    } else {
      setStructures(data);
    }
    setStructuresLoading(false);
  };

  const openStructureModal = () => {
    setNavPath([]);
    setShowStructureModal(true);
    loadStructures(null);
  };

  const drillIntoStructure = (node: StructureNode) => {
    setNavPath((prev) => [...prev, node]);
    loadStructures(node.id);
  };

  const goToStructureRoot = () => {
    setNavPath([]);
    loadStructures(null);
  };

  const goToStructureParent = () => {
    setNavPath((prev) => {
      const next = prev.slice(0, -1);
      const parentId = next.length > 0 ? next[next.length - 1].id : null;
      loadStructures(parentId);
      return next;
    });
  };

  const goToBreadcrumb = (index: number) => {
    setNavPath((prev) => {
      const next = prev.slice(0, index + 1);
      loadStructures(next[next.length - 1].id);
      return next;
    });
  };

  const selectComi = (node: StructureNode) => {
    setFormData((prev) => ({ ...prev, comi_id: node.id }));
    setSelectedStructureName(node.name);
    setShowStructureModal(false);
  };

  const handleStructureClick = (node: StructureNode) => {
    if (shouldDrillInto(node)) {
      drillIntoStructure(node);
      return;
    }
    if (isSelectableComi(node)) {
      selectComi(node);
      return;
    }
    showNotification(
      `« ${node.name} » (${node.type}) n'a pas de paroisse enfant. Remontez ou choisissez une autre branche.`,
      'error',
    );
  };

  const handleBrancheChange = (branche: MembreBranche) => {
    setFormData((prev) => ({ ...prev, branche, fonction: '' }));
    setBranch(branche);
  };

  const handleSexeChange = (sexe: string) => {
    setFormData((prev) => ({ ...prev, sexe, fonction: '' }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showNotification('Déconnexion réussie.', 'success');
    navigate('/auth');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        setAvatarUrl(data.secure_url);
        await supabase.from('profiles').update({ avatar_url: data.secure_url }).eq('id', userId);
        showNotification('Photo de profil mise à jour !', 'success');
      }
    } catch (err: any) {
      showNotification('Erreur lors de l\'upload : ' + err.message, 'error');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.comi_id) {
      showNotification('Veuillez sélectionner votre paroisse (COMI).', 'error');
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        nom: formData.nom,
        prenom: formData.prenom,
        telephone: formData.telephone || null,
        date_naissance: formData.date_naissance || null,
        sexe: formData.sexe,
        branche: formData.branche,
        fonction: formData.fonction,
        comi_id: formData.comi_id,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showNotification('Erreur lors de la sauvegarde : ' + error.message, 'error');
      } else {
        const role = (user.user_metadata as any)?.role ?? 'membre';
        const { error: utilError } = await supabase
          .from('utilisateurs')
          .upsert(
            {
              id: user.id,
              nom: formData.nom,
              email: user.email,
              role,
            },
            { onConflict: 'id' },
          );

        if (utilError) {
          showNotification('Erreur lors de la synchronisation du rôle : ' + utilError.message, 'error');
        }

        setBranch(formData.branche);
        showNotification('Profil complété avec succès !', 'success');
        window.location.href = '/home';
      }
    }
    setIsSubmitting(false);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme pb-24">
      <header className="bg-theme-bg/85 backdrop-blur-xl px-6 py-5 border-b border-theme-border sticky top-0 z-40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-center md:text-left">
          <h1 className="text-xl font-black text-theme-text-primary uppercase tracking-tighter">
            Finaliser mon Profil
          </h1>
          <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] mt-1">
            Armée de petits anges — Étape obligatoire
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase"
        >
          <LogOut className="w-4.5 h-4.5" />
          Déconnecter
        </button>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          {/* PHOTO DE PROFIL */}
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest">
              Photo de profil
            </p>
            <div className="relative w-24 h-24 group">
              <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-theme-border bg-theme-surface shadow-xl">
                {avatarUrl ? (
                  <img loading="lazy" src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-theme-accent-start/20 to-theme-accent-end/20 flex items-center justify-center">
                    <span className="font-black text-2xl uppercase tracking-tighter text-theme-accent-end">
                      {formData.prenom?.[0]}{formData.nom?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer"
              >
                {avatarUploading
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />
                }
              </button>
            </div>
            <p className="text-[8px] text-theme-text-secondary font-bold">
              Survolez pour changer la photo
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest px-2">
              Identité
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <User className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Nom"
                  required
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Prénom"
                  required
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest px-2">
              Ma Paroisse (COMI)
            </p>
            <button
              type="button"
              onClick={openStructureModal}
              className="w-full p-4 bg-theme-surface rounded-2xl border-2 border-dashed border-theme-border flex items-center justify-between hover:bg-theme-surface-hover transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-theme-bg border border-theme-border text-theme-accent-start rounded-xl flex items-center justify-center shadow-inner group-hover:bg-gradient-to-br group-hover:from-theme-accent-start group-hover:to-theme-accent-end group-hover:text-white transition-all">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-theme-text-primary leading-none">
                    {selectedStructureName || 'Sélectionner une paroisse'}
                  </p>
                  <p className="text-[8px] font-bold text-theme-accent-start uppercase mt-1 tracking-wider">
                    Requis
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-theme-text-secondary group-hover:text-theme-text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest px-2">
              Ma Branche & Infos
            </p>
            <div className="space-y-3">
              <div className="bg-theme-surface border border-theme-border rounded-2xl p-4">
                <p className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-wider mb-3">Sexe</p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sexe"
                      value="M"
                      checked={formData.sexe === 'M'}
                      onChange={(e) => handleSexeChange(e.target.value)}
                      className="w-4 h-4 text-theme-accent-start bg-theme-bg border-theme-border focus:ring-theme-accent-start/20"
                    />
                    <span className="text-sm font-bold text-theme-text-primary">Masculin</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sexe"
                      value="F"
                      checked={formData.sexe === 'F'}
                      onChange={(e) => handleSexeChange(e.target.value)}
                      className="w-4 h-4 text-theme-accent-start bg-theme-bg border-theme-border focus:ring-theme-accent-start/20"
                    />
                    <span className="text-sm font-bold text-theme-text-primary">Féminin</span>
                  </label>
                </div>
              </div>

              <div className="relative group">
                <Users className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <select
                  required
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none appearance-none cursor-pointer"
                  value={formData.branche}
                  onChange={(e) => handleBrancheChange(e.target.value as MembreBranche)}
                >
                  {MEMBRE_BRANCHE_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-theme-bg text-theme-text-primary"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-4 pointer-events-none text-theme-text-secondary/50">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>

              <div className="relative group">
                <Briefcase className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                {(() => {
                  let options: string[] = [];
                  if (formData.branche === 'ange') {
                    options = ['ADI', 'MEDI', 'ELUDI', 'MON PREMIER'];
                  } else if (formData.branche === 'archange') {
                    options = ['SAMIC', 'SAGA', 'SAO', 'SARA', 'AGA', 'ASA', 'ARO', 'AJO', 'ARCHANGES'];
                  } else if (formData.branche === 'perame') {
                    options = formData.sexe === 'M' ? ['PERANGE'] : ['MERANGE'];
                  }

                  if (options.length > 0) {
                    return (
                      <>
                        <select
                          required
                          className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none appearance-none cursor-pointer"
                          value={formData.fonction}
                          onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                        >
                          <option value="" disabled>Sélectionner la fonction</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt} className="bg-theme-bg text-theme-text-primary">{opt}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-4 pointer-events-none text-theme-text-secondary/50">
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </div>
                      </>
                    );
                  }

                  return (
                    <input
                      type="text"
                      placeholder="Fonction (ex: Responsable)"
                      required
                      className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none"
                      value={formData.fonction}
                      onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                    />
                  );
                })()}
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  required
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
              <div className="relative group">
                <Calendar className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type="date"
                  required
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none"
                  value={formData.date_naissance}
                  onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-theme-accent-start/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Enregistrer mon Profil'
              )}
            </button>
          </div>
        </form>
      </main>

      {showStructureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-theme-bg border border-theme-border w-full max-w-md rounded-3xl p-6 space-y-5 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-theme-text-primary uppercase tracking-tighter">
                Choisir une Structure
              </h3>
              <button
                onClick={() => setShowStructureModal(false)}
                className="p-2 bg-theme-surface rounded-full text-theme-text-secondary hover:text-theme-text-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                type="button"
                onClick={goToStructureRoot}
                className="px-3 py-1.5 bg-theme-surface rounded-full text-[8px] font-black uppercase text-theme-text-secondary hover:text-theme-accent-start shrink-0"
              >
                RACINE
              </button>
              {navPath.map((p, i) => (
                <div key={p.id} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="w-3 h-3 text-theme-text-secondary/35" />
                  <button
                    type="button"
                    onClick={() => goToBreadcrumb(i)}
                    className="px-3 py-1.5 bg-theme-surface border border-theme-accent-start/20 text-theme-accent-start rounded-full text-[8px] font-black uppercase"
                  >
                    {p.name}
                  </button>
                </div>
              ))}
            </div>

            {navPath.length > 0 && (
              <button
                type="button"
                onClick={goToStructureParent}
                className="w-full px-4 py-2.5 bg-theme-surface hover:bg-theme-surface-hover text-theme-text-primary border border-theme-border rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Retour au niveau parent
              </button>
            )}

            <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest px-1">
              {navPath.length === 0
                ? 'Choisissez une structure, puis descendez jusqu’à votre paroisse (COMI)'
                : `Sous-structures de « ${navPath[navPath.length - 1].name} »`}
            </p>

            {structuresLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-theme-accent-start" />
              </div>
            ) : structures.length === 0 ? (
              <p className="text-center text-sm text-theme-text-secondary py-8">
                Aucune sous-structure à ce niveau.
              </p>
            ) : (
              <div className="grid gap-2">
                {structures.map((s) => {
                  const drill = shouldDrillInto(s);
                  const selectable = isSelectableComi(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStructureClick(s)}
                      className={`w-full p-4 bg-theme-surface border rounded-2xl flex items-center justify-between group transition-all cursor-pointer ${selectable
                        ? 'border-theme-accent-start/30 hover:border-theme-accent-start hover:bg-theme-surface-hover'
                        : 'border-theme-border hover:border-theme-accent-start/40 hover:bg-theme-surface-hover'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[9px] shadow-sm transition-all ${selectable
                            ? 'bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white group-hover:scale-105'
                            : 'bg-theme-bg border border-theme-border text-theme-text-secondary'
                            }`}
                        >
                          {s.type}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black text-theme-text-primary uppercase">{s.name}</p>
                          <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest">
                            {drill
                              ? '↳ Descendre vers les fils'
                              : selectable
                                ? '✓ Sélectionner cette paroisse'
                                : `Feuille (${s.type}) — non sélectionnable`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-all ${drill
                          ? 'text-theme-text-secondary group-hover:text-theme-accent-start group-hover:translate-x-1'
                          : selectable
                            ? 'text-theme-accent-start'
                            : 'text-theme-text-secondary/40'
                          }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
