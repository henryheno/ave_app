import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { BRANDING } from '../../monapp/Branding';

export const VerifyTransferPage = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [structures, setStructures] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setError("Aucun code de vérification fourni.");
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async (qrToken: string) => {
    try {
      const allStructures = await getStructures();
      setStructures(allStructures);

      const { data, error } = await supabase
        .from('transfer_requests')
        .select(`
          *,
          user:profiles!transfer_requests_user_id_fkey(nom, prenom, sexe, branche, fonction),
          approver:profiles!transfer_requests_approved_by_fkey(nom, prenom)
        `)
        .eq('qr_token', qrToken)
        .single();

      if (error || !data) {
        setError("Ce document n'a pas pu être authentifié ou n'existe pas dans nos registres.");
      } else if (data.status !== 'approved') {
        setError("Ce document correspond à une demande qui n'est pas approuvée (Statut actuel : " + data.status + ").");
      } else {
        setVerificationResult(data);
      }
    } catch (err) {
      setError("Erreur lors de la communication avec le serveur de vérification.");
    } finally {
      setLoading(false);
    }
  };

  const getStructureName = (id: string) => {
    return structures.find(s => s.id === id)?.name || 'Structure inconnue';
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col items-center justify-center p-4 font-sans transition-theme">
      {/* Fond décoratif subtil */}
      <div className="absolute top-0 right-0 w-64 h-64 blur-[120px] opacity-10 bg-theme-accent-start -mr-20 -mt-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 blur-[120px] opacity-10 bg-theme-accent-end -ml-20 -mb-20 pointer-events-none"></div>

      <div className="w-full max-w-md bg-theme-surface/60 backdrop-blur-xl border border-theme-border rounded-[2rem] shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">

        {/* En-tête centré et plus compact */}
        <div className="bg-theme-surface border-b border-theme-border p-5 text-center flex flex-col items-center">
          <img loading="lazy" src="/logo.webp" alt="Logo" className="w-12 h-12 object-contain mb-2" />
          <h1 className="text-lg font-black uppercase tracking-wider text-theme-text-primary leading-tight">
            Authentification
          </h1>
          <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] mt-0.5">
            Armée de Petits Anges
          </p>
        </div>

        <div className="p-5">
          {error ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-black text-red-500 uppercase tracking-wide">Document Non Valide</h2>
                <p className="text-theme-text-secondary text-xs mt-2 leading-relaxed">{error}</p>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-orange-500/80 leading-normal">
                  Méfiez-vous des faux documents. Si vous pensez qu'il s'agit d'une erreur technique, veuillez vous rapprocher d'un coordinateur.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <img loading="lazy"
                  src={BRANDING.LOGO}
                  alt="Document Authentique"
                  className="w-20 h-20 object-contain mx-auto animate-pulse"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                />
                <div>
                  <h2 className="text-xl font-black text-green-400 uppercase tracking-wide">Document Authentique</h2>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-500/20 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certifié Conforme
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-theme-border">
                <div className="bg-theme-bg/40 p-4 rounded-2xl border border-theme-border/50">
                  <p className="text-[9px] uppercase text-theme-text-secondary font-bold tracking-widest">Membre concerné</p>
                  <p className="font-black text-base text-theme-text-primary mt-1">
                    {verificationResult.user.nom} {verificationResult.user.prenom}
                  </p>
                  <p className="text-xs text-theme-text-secondary capitalize mt-0.5">
                    {verificationResult.user.branche} {verificationResult.user.fonction ? `— ${verificationResult.user.fonction}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-theme-bg/40 p-3 rounded-2xl border border-theme-border/50">
                    <p className="text-[9px] uppercase text-theme-text-secondary font-bold tracking-widest">Structure Origine</p>
                    <p className="font-black text-theme-text-primary text-xs mt-1 leading-tight">
                      {getStructureName(verificationResult.from_comi_id)}
                    </p>
                  </div>
                  <div className="bg-theme-bg/40 p-3 rounded-2xl border border-theme-border/50">
                    <p className="text-[9px] uppercase text-theme-text-secondary font-bold tracking-widest">Structure Destination</p>
                    <p className="font-black text-theme-text-primary text-xs mt-1 leading-tight">
                      {getStructureName(verificationResult.to_comi_id)}
                    </p>
                  </div>
                </div>

                <div className="bg-theme-bg/40 p-4 rounded-2xl border border-theme-border/50">
                  <p className="text-[9px] uppercase text-theme-text-secondary font-bold tracking-widest">Validation de transfert</p>
                  <p className="text-xs text-theme-text-secondary mt-1.5 leading-relaxed">
                    Approuvé le <span className="font-black text-theme-text-primary">{new Date(verificationResult.approved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span> par le coordinateur <span className="font-black text-theme-text-primary">{verificationResult.approver?.nom} {verificationResult.approver?.prenom}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="bg-theme-surface border-t border-theme-border p-5 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};
