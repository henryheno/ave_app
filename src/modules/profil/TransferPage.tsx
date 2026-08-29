import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Plus, X, Download, Clock, CheckCircle2, XCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { PageLoader } from '../../monapp/Branding';
import { getStructures } from '../../lib/structureCache';
import { TransferLetterPDF, type TransferLetterData } from '../../components/TransferLetterPDF';

export const TransferPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);

  // States pour la génération de PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfData, setPdfData] = useState<TransferLetterData | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Récupération du cache des structures
      const allStructures = await getStructures();
      setStructures(allStructures);

      // Récupération de l'historique des requêtes
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching transfers:', err);
      showNotification('Erreur lors du chargement des transferts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStructureName = (id: string) => {
    return structures.find(s => s.id === id)?.name || 'Structure inconnue';
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;
    try {
      const { error } = await supabase
        .from('transfer_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      showNotification('Demande annulée avec succès.', 'success');
      fetchData();
    } catch (err: any) {
      showNotification('Erreur lors de l\'annulation.', 'error');
    }
  };

  const generatePDF = async (request: any) => {
    try {
      setGeneratingPdf(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Récupération des informations de profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (!profile) throw new Error('Profil introuvable');

      let approverName = 'Coordinateur';
      if (request.approved_by) {
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', request.approved_by)
          .single();
        if (approverProfile) {
          approverName = `${approverProfile.nom} ${approverProfile.prenom}`;
        }
      }

      const fromStruct = structures.find(s => s.id === request.from_comi_id);
      
      let resolvedComa = null;
      let resolvedCodi = null;
      let currentStruct = fromStruct;

      while (currentStruct && currentStruct.parent_id) {
          const parent = structures.find(s => s.id === currentStruct.parent_id);
          if (!parent) break;
          if (parent.type === 'COMA') resolvedComa = parent;
          if (parent.type === 'CODI') resolvedCodi = parent;
          currentStruct = parent;
      }

      const letterData: TransferLetterData = {
        nom: profile.nom,
        prenom: profile.prenom,
        sexe: profile.sexe,
        branche: profile.branche,
        fonction: profile.fonction,
        fromStructureName: getStructureName(request.from_comi_id),
        fromStructureType: fromStruct?.type,
        fromCodiName: resolvedCodi?.name || (fromStruct?.type === 'CODI' ? fromStruct?.name : undefined),
        fromComaName: resolvedComa?.name || (fromStruct?.type === 'COMA' ? fromStruct?.name : undefined),
        fromProvince: fromStruct?.province,
        toStructureName: getStructureName(request.to_comi_id),
        requestDate: request.created_at,
        approvedDate: request.approved_at || new Date().toISOString(),
        approvedByName: approverName,
        qrToken: request.qr_token,
      };

      setPdfData(letterData);

      // Attente du cycle de rendu React pour l'élément du DOM virtuel
      setTimeout(async () => {
        const element = document.getElementById('transfer-letter-content');
        if (element) {
          const html2pdf = (await import('html2pdf.js')).default;
          await html2pdf().from(element).set({
            margin: 0,
            filename: `Transfert_${profile.nom}_${profile.prenom}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              width: 794,
              windowWidth: 794,
              useCORS: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }).save();
        }
        setPdfData(null);
        setGeneratingPdf(false);
      }, 500);

    } catch (err: any) {
      console.error(err);
      showNotification('Erreur lors de la génération du PDF.', 'error');
      setPdfData(null);
      setGeneratingPdf(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full text-xs font-bold"><Clock className="w-3 h-3" /> Reçue (En attente)</div>;
      case 'approved':
        return <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-full text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Effectué</div>;
      case 'rejected':
        return <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-1 rounded-full text-xs font-bold"><XCircle className="w-3 h-3" /> Rejeté</div>;
      case 'cancelled':
        return <div className="flex items-center gap-1 text-gray-500 bg-gray-500/10 px-2 py-1 rounded-full text-xs font-bold"><X className="w-3 h-3" /> Annulé</div>;
      default:
        return null;
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary pb-24">
      <header className="bg-theme-bg/85 backdrop-blur-xl px-6 py-5 border-b border-theme-border sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2 bg-theme-surface rounded-full">
            <ChevronLeft className="w-5 h-5 text-theme-text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Mes Transferts</h1>
            <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] mt-1">
              Suivi de mes demandes
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profil/transfert/nouveau')}
          className="w-10 h-10 bg-theme-accent-start text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-20 bg-theme-surface rounded-3xl border border-theme-border">
            <ArrowRightLeft className="w-12 h-12 text-theme-text-secondary/50 mx-auto mb-4" />
            <p className="text-theme-text-secondary text-sm">Aucune demande de transfert</p>
            <button
              onClick={() => navigate('/profil/transfert/nouveau')}
              className="mt-6 px-6 py-2 bg-theme-accent-start text-white rounded-xl text-sm font-bold shadow-lg"
            >
              Demander un transfert
            </button>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-theme-surface border border-theme-border rounded-2xl p-5 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                {getStatusDisplay(req.status)}
                <span className="text-[10px] text-theme-text-secondary font-bold">
                  {new Date(req.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex-1 text-center">
                  <p className="text-[10px] text-theme-text-secondary uppercase tracking-wider mb-1">De</p>
                  <p className="text-sm font-black text-theme-text-primary line-clamp-2">
                    {getStructureName(req.from_comi_id)}
                  </p>
                </div>

                <div className="shrink-0 flex items-center justify-center bg-theme-bg w-10 h-10 rounded-full border border-theme-border text-theme-accent-start">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>

                <div className="flex-1 text-center">
                  <p className="text-[10px] text-theme-text-secondary uppercase tracking-wider mb-1">Vers</p>
                  <p className="text-sm font-black text-theme-text-primary line-clamp-2">
                    {getStructureName(req.to_comi_id)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {req.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(req.id)}
                    className="flex-1 py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    Annuler
                  </button>
                )}

                {req.status === 'approved' && (
                  <button
                    onClick={() => generatePDF(req)}
                    disabled={generatingPdf}
                    className="flex-1 py-2.5 bg-theme-accent-start/10 text-theme-accent-start rounded-xl text-xs font-black uppercase tracking-wider border border-theme-accent-start/20 hover:bg-theme-accent-start/20 transition-colors flex items-center justify-center gap-2"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Télécharger Lettre
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Rendu masqué conditionnel injecté lors de l'exécution */}
      {pdfData && (
        <TransferLetterPDF
          data={pdfData}
          verifyUrl={`${window.location.origin}/verify-transfer/${pdfData.qrToken}`}
        />
      )}
    </div>
  );
};