import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { ChevronLeft, Camera, CheckCircle2, XCircle, ShieldCheck, AlertTriangle, ScanLine, RotateCcw } from 'lucide-react';

type VerificationResult = {
  status: 'authentic' | 'invalid' | 'not_approved';
  data?: any;
  errorMessage?: string;
  fromStructureName?: string;
  toStructureName?: string;
};

export const ScanQRPage = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStarted = useRef(false);

  const stopScanner = async () => {
    if (scannerRef.current && scannerStarted.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerStarted.current = false;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setResult(null);
    setScanning(true);

    // Small delay to let the DOM render the scanner div
    await new Promise((res) => setTimeout(res, 300));

    try {
      const scanner = new Html5Qrcode('qr-scanner-region');
      scannerRef.current = scanner;

      scannerStarted.current = true;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await verifyQRContent(decodedText);
        },
        () => { /* ignore frequent errors */ }
      );
    } catch {
      setResult({ status: 'invalid', errorMessage: "Impossible d'accéder à la caméra. Vérifiez les permissions." });
      setScanning(false);
    }
  };

  const verifyQRContent = async (decodedText: string) => {
    setLoading(true);
    try {
      // Extract token from URL like /verify-transfer/<token>
      const match = decodedText.match(/verify-transfer\/([a-f0-9-]+)/i);
      const token = match ? match[1] : decodedText.trim();

      if (!token) {
        setResult({ status: 'invalid', errorMessage: "Ce QR code ne correspond pas à un document de transfert AVE." });
        return;
      }

      const allStructures = await getStructures();

      const { data, error } = await supabase
        .from('transfer_requests')
        .select(`
          *,
          user:profiles!transfer_requests_user_id_fkey(nom, prenom, sexe, branche, fonction),
          approver:profiles!transfer_requests_approved_by_fkey(nom, prenom)
        `)
        .eq('qr_token', token)
        .single();

      if (error || !data) {
        setResult({ status: 'invalid', errorMessage: "Ce document est introuvable dans nos registres. Il peut être falsifié." });
        return;
      }

      if (data.status !== 'approved') {
        setResult({
          status: 'not_approved',
          data,
          errorMessage: `Ce document correspond à une demande non approuvée (Statut : ${data.status}).`
        });
        return;
      }

      const fromName = allStructures.find(s => s.id === data.from_comi_id)?.name || 'Inconnue';
      const toName = allStructures.find(s => s.id === data.to_comi_id)?.name || 'Inconnue';

      setResult({ status: 'authentic', data, fromStructureName: fromName, toStructureName: toName });
    } catch {
      setResult({ status: 'invalid', errorMessage: "Erreur de communication avec le serveur." });
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    await stopScanner();
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
      {/* Header */}
      <header className="bg-theme-bg/85 backdrop-blur-xl px-6 py-5 border-b border-theme-border sticky top-0 z-40 flex items-center gap-3">
        <button onClick={() => { stopScanner(); navigate(-1); }} className="p-2 -ml-2 bg-theme-surface rounded-full">
          <ChevronLeft className="w-5 h-5 text-theme-text-primary" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Scanner QR</h1>
          <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-[0.2em] mt-1">
            Vérification de lettre
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 gap-6 max-w-md mx-auto w-full">

        {/* Loading */}
        {loading && (
          <div className="w-full flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-theme-accent-start/30 border-t-theme-accent-start animate-spin" />
            <p className="text-theme-text-secondary text-sm font-bold">Vérification en cours...</p>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="w-full space-y-4 animate-in fade-in duration-500">
            {result.status === 'authentic' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-6 space-y-5">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-black text-green-400">Document Authentique</h2>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certifié par l'Application
                  </div>
                </div>

                <div className="border-t border-green-500/20 pt-4 space-y-4">
                  <div>
                    <p className="text-[9px] text-green-400/70 uppercase tracking-widest font-bold">Membre</p>
                    <p className="font-black text-lg text-theme-text-primary">
                      {result.data.user.nom} {result.data.user.prenom}
                    </p>
                    <p className="text-sm text-theme-text-secondary capitalize">{result.data.user.branche}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-theme-surface rounded-2xl p-3 border border-theme-border">
                      <p className="text-[9px] text-theme-text-secondary uppercase tracking-widest font-bold mb-1">Origine</p>
                      <p className="text-xs font-black text-theme-text-primary">{result.fromStructureName}</p>
                    </div>
                    <div className="bg-theme-surface rounded-2xl p-3 border border-theme-border">
                      <p className="text-[9px] text-theme-text-secondary uppercase tracking-widest font-bold mb-1">Destination</p>
                      <p className="text-xs font-black text-theme-text-primary">{result.toStructureName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-green-400/70 uppercase tracking-widest font-bold">Approuvé par</p>
                    <p className="text-sm font-bold text-theme-text-primary">
                      {result.data.approver?.nom} {result.data.approver?.prenom}
                    </p>
                    <p className="text-xs text-theme-text-secondary">
                      le {new Date(result.data.approved_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(result.status === 'invalid' || result.status === 'not_approved') && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 space-y-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <h2 className="text-xl font-black text-red-400">Document Non Valide</h2>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">{result.errorMessage}</p>
                </div>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-4 bg-theme-surface border border-theme-border rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-theme-surface-hover transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Scanner à nouveau
            </button>
          </div>
        )}

        {/* Scanner / Start screen */}
        {!loading && !result && (
          <>
            {scanning ? (
              <div className="w-full space-y-4">
                <div
                  id="qr-scanner-region"
                  className="w-full rounded-3xl overflow-hidden border-2 border-theme-accent-start/40 shadow-lg shadow-theme-accent-start/10"
                  style={{ minHeight: '320px' }}
                />
                <p className="text-center text-xs text-theme-text-secondary font-bold">
                  Pointez la caméra vers le QR code de la lettre
                </p>
                <button
                  onClick={reset}
                  className="w-full py-3 bg-theme-surface border border-theme-border rounded-2xl font-black text-xs uppercase tracking-widest text-red-400"
                >
                  Arrêter
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-8 py-8">
                {/* Animated icon */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-3xl border-2 border-theme-accent-start/20 animate-ping" />
                  <div className="absolute inset-4 rounded-2xl border-2 border-theme-accent-start/30 animate-pulse" />
                  <div className="w-28 h-28 bg-gradient-to-br from-theme-accent-start to-theme-accent-end rounded-3xl flex items-center justify-center shadow-2xl shadow-theme-accent-start/40">
                    <ScanLine className="w-14 h-14 text-white" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-xl font-black text-theme-text-primary">Vérifier une lettre</h2>
                  <p className="text-sm text-theme-text-secondary max-w-xs">
                    Scannez le QR code imprimé sur la lettre de transfert pour vérifier son authenticité.
                  </p>
                </div>

                <button
                  onClick={startScanner}
                  className="w-full py-4 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-theme-accent-start/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  Ouvrir la Caméra
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
