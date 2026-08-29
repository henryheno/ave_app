import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building2,
  ChevronRight,
  Loader2,
  ChevronLeft,
  X
} from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { PageLoader } from '../../monapp/Branding';
import {
  fetchStructureChildren,
  isSelectableComi,
  shouldDrillInto,
  type StructureNode,
} from '../../lib/structureTree';

export const NewTransferPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    nom: '',
    prenom: '',
    telephone: '',
    date_naissance: '',
    sexe: 'M',
    branche: '',
    fonction: '',
    current_comi_id: '',
  });

  const [currentStructureName, setCurrentStructureName] = useState('');
  
  // New structure selection
  const [newComiId, setNewComiId] = useState('');
  const [newStructureName, setNewStructureName] = useState('');
  
  // Modal states
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structures, setStructures] = useState<StructureNode[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setFormData({
          nom: profile.nom || '',
          prenom: profile.prenom || '',
          telephone: profile.telephone || '',
          date_naissance: profile.date_naissance || '',
          sexe: profile.sexe || 'M',
          branche: profile.branche || '',
          fonction: profile.fonction || '',
          current_comi_id: profile.comi_id || '',
        });
        
        if (profile.comi_id) {
          const allStructures = await getStructures();
          const comi = allStructures.find(s => s.id === profile.comi_id);
          if (comi?.name) setCurrentStructureName(comi.name);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStructures = async (parentId: string | null) => {
    setStructuresLoading(true);
    const { data, error } = await fetchStructureChildren(parentId);
    if (error) {
      showNotification('Impossible de charger les structures', 'error');
      setStructures([]);
    } else {
      setStructures(data);
    }
    setStructuresLoading(false);
  };

  const openStructureModal = () => {
    setShowStructureModal(true);
    loadStructures(null);
  };

  const drillIntoStructure = (node: StructureNode) => {
    loadStructures(node.id);
  };

  const selectComi = (node: StructureNode) => {
    if (node.id === formData.current_comi_id) {
      showNotification('Vous êtes déjà dans cette structure.', 'error');
      return;
    }
    setNewComiId(node.id);
    setNewStructureName(node.name);
    setShowStructureModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComiId) {
      showNotification('Veuillez sélectionner votre NOUVELLE paroisse (COMI).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');
      
      const { data: newTransfer, error } = await supabase.from('transfer_requests').insert({
        user_id: user.id,
        from_comi_id: formData.current_comi_id,
        to_comi_id: newComiId,
      }).select().single();

      if (error) throw error;
      
      // Récupérer les admins/superadmins
      const { data: admins } = await supabase
        .from('utilisateurs')
        .select('id')
        .in('role', ['admin', 'superadmin']);
      const adminIds = admins?.map(a => a.id) || [];

      // Récupérer le coordonnateur de la structure de départ uniquement
      let coordIds: string[] = [];
      if (formData.current_comi_id) {
        const { data: profilesInComi } = await supabase.from('profiles').select('id').eq('comi_id', formData.current_comi_id);
        if (profilesInComi && profilesInComi.length > 0) {
          const { data: coords } = await supabase.from('utilisateurs').select('id').in('id', profilesInComi.map(p => p.id)).eq('role', 'coordonateur');
          coordIds = coords?.map(c => c.id) || [];
        }
      }

      const targetIds = Array.from(new Set([...adminIds, ...coordIds])).filter(tid => tid !== user.id);
      if (targetIds.length > 0) {
        const notifications = targetIds.map(tid => ({
          user_id: tid,
          actor_id: user.id,
          title: 'Nouvelle demande de transfert',
          content: `${formData.prenom} ${formData.nom} demande un transfert vers ${newStructureName}.`,
          type: 'transfer_request',
          entity_type: 'transfer_request',
          entity_id: newTransfer.id,
          is_read: false,
          metadata: { target_role: adminIds.includes(tid) ? 'admin' : 'coordonateur' }
        }));
        await supabase.from('notifications').insert(notifications);
      }

      showNotification('Demande de transfert envoyée avec succès !', 'success');
      navigate('/profil/transfert');
    } catch (err: any) {
      showNotification('Erreur lors de la demande : ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme pb-24">
      <header className="bg-theme-bg/85 backdrop-blur-xl px-6 py-5 border-b border-theme-border sticky top-0 z-40 flex items-center gap-3">
        <button onClick={() => navigate('/profil/transfert')} className="p-2 -ml-2 bg-theme-surface rounded-full">
          <ChevronLeft className="w-5 h-5 text-theme-text-primary" />
        </button>
        <div>
          <h1 className="text-xl font-black text-theme-text-primary uppercase tracking-tighter">
            Nouveau Transfert
          </h1>
          <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] mt-1">
            Changer de paroisse
          </p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-700">
          
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
            <p className="text-xs text-orange-600 font-medium">
              Vos informations actuelles sont grisées et non modifiables. Vous devez uniquement choisir votre nouvelle structure.
            </p>
          </div>

          <div className="space-y-3 opacity-60 pointer-events-none">
            <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest px-2">
              Identité Actuelle
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group">
                <User className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type="text"
                  readOnly
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm text-theme-text-primary"
                  value={formData.nom}
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type="text"
                  readOnly
                  className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm text-theme-text-primary"
                  value={formData.prenom}
                />
              </div>
            </div>
            
            <div className="relative group">
              <Building2 className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
              <input
                type="text"
                readOnly
                className="w-full bg-theme-surface border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm text-theme-text-primary"
                value={`Paroisse actuelle : ${currentStructureName}`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-theme-accent-start uppercase tracking-widest px-2">
              Nouvelle Paroisse (Destination)
            </p>
            <button
              type="button"
              onClick={openStructureModal}
              className="w-full p-4 bg-theme-surface rounded-2xl border-2 border-dashed border-theme-accent-start/50 flex items-center justify-between hover:bg-theme-surface-hover transition-all group text-left shadow-lg shadow-theme-accent-start/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-theme-accent-start text-white rounded-xl flex items-center justify-center shadow-inner">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-theme-text-primary leading-none">
                    {newStructureName || 'Choisir ma nouvelle paroisse'}
                  </p>
                  <p className="text-[8px] font-bold text-theme-text-secondary uppercase mt-1 tracking-wider">
                    {newStructureName ? 'Cliquer pour modifier' : 'Action requise'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-theme-accent-start group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !newComiId}
              className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer la Demande'}
            </button>
          </div>
        </form>
      </main>

      {/* Structure Modal - Reuse logic */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-theme-bg border border-theme-border w-full max-w-md rounded-3xl p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase">Destination</h3>
              <button onClick={() => setShowStructureModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {structuresLoading ? (
               <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-theme-accent-start" /></div>
            ) : (
              <div className="grid gap-2">
                {structures.map((s) => {
                  const drill = shouldDrillInto(s);
                  const selectable = isSelectableComi(s);
                  return (
                    <button
                      key={s.id}
                      onClick={() => drill ? drillIntoStructure(s) : (selectable ? selectComi(s) : null)}
                      className={`w-full p-4 bg-theme-surface border rounded-2xl flex items-center justify-between ${selectable ? 'border-theme-accent-start/30' : 'border-theme-border'}`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-8 h-8 flex items-center justify-center bg-theme-bg rounded text-[8px] font-bold">{s.type}</div>
                        <div>
                          <p className="text-xs font-black uppercase">{s.name}</p>
                          <p className="text-[8px] font-bold text-theme-text-secondary uppercase">{drill ? '↳ Explorer' : (selectable ? '✓ Choisir' : 'Non sélectionnable')}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-theme-text-secondary" />
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
