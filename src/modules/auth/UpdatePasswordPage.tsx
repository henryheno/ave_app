import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { BRANDING } from '../../monapp/Branding';
import { getAuthErrorMessage } from '../../lib/authError';

const inputClass =
  'w-full bg-theme-bg border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none placeholder:text-theme-text-secondary/50';

export const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // On vérifie qu'on a bien un hash de récupération dans l'URL ou une session active
  useEffect(() => {
    // Si l'utilisateur est déjà connecté et veut juste changer son mot de passe, c'est aussi valide.
    const checkSession = async () => {
      // Attendre un peu que Supabase traite le hash de l'URL
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setHasSession(false);
        } else {
          setHasSession(true);
        }
      }, 1000);
    };
    checkSession();

    // Écouter les changements d'état (quand Supabase valide le token de récupération)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showNotification('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      showNotification('Mot de passe mis à jour avec succès !', 'success');
      navigate('/home');
    } catch (error: unknown) {
      showNotification(getAuthErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen text-theme-text-primary flex items-center justify-center p-6 font-sans transition-theme relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/logo2.webp)' }}
    >
      <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm z-0"></div>

      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-700 z-10">
        <div className="text-center space-y-4">
          <img loading="lazy" src={BRANDING.LOGO} alt="Logo" className="w-24 h-24 object-contain mx-auto drop-shadow-xl" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">
              <span className="text-red-500">A</span>
              <span className="text-blue-500">V</span>
              <span className="text-yellow-500">E</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-90 mt-1">
              <span className="text-red-500">Armée</span>{' '}
              <span className="text-blue-500">des Petits</span>{' '}
              <span className="text-yellow-500">Anges</span>
            </p>
          </div>
        </div>

        {hasSession === false ? (
          <div className="bg-theme-surface p-8 rounded-[3rem] shadow-xl border border-red-500/30 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-theme-text-primary">Lien expiré ou invalide</h2>
            <p className="text-sm text-theme-text-secondary">
              Votre session de récupération est introuvable. Le lien a peut-être expiré ou a déjà été utilisé.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="w-full bg-theme-surface hover:bg-theme-surface-hover text-theme-text-secondary py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-theme-border"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleUpdatePassword}
            className="bg-theme-surface p-8 rounded-[3rem] shadow-xl border border-theme-border space-y-6 transition-theme"
          >
            <div className="space-y-4">
              <div className="space-y-2 text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-theme-accent-start">
                  Nouveau mot de passe
                </p>
                <p className="text-xs text-theme-text-secondary mt-1">
                  Veuillez entrer votre nouveau mot de passe (min. 6 caractères).
                </p>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nouveau mot de passe"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={hasSession === null}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-theme-text-secondary/50 hover:text-theme-text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || password.length < 6 || hasSession === null}
                className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-theme-accent-start/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSubmitting || hasSession === null ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Mettre à jour'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
