import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Sun, Moon, Loader2, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { BRANDING } from '../../monapp/Branding';
import { useTheme } from '../../monapp/ThemeContext';
import { getAuthErrorMessage, withTimeout } from '../../lib/authError';

const inputClass =
  'w-full bg-theme-bg border border-theme-border rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 transition-all text-theme-text-primary outline-none placeholder:text-theme-text-secondary/50';

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nom, setNom] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleHint, setGoogleHint] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { theme, toggleTheme } = useTheme();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await withTimeout(supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nom: nom,
              role: 'membre',
            },
          },
        }), 60000);
        if (error) throw error;
        // La création de la ligne utilisateurs doit être gérée par le trigger SQL
        // ou après connexion, pas immédiatement sur un signUp non-authentifié.
        showNotification('Compte créé avec succès ! Vérifie ton mail pour confirmer.', 'success');
      } else {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 45000);
        if (error) throw error;
        showNotification('Connexion réussie !', 'success');
      }
      navigate('/home');
    } catch (error: unknown) {
      // Détecter si c'est un compte Google qui essaie de se connecter par mot de passe
      const errMsg = (error as any)?.message || '';
      if (
        !isSignUp &&
        (errMsg.includes('Invalid login credentials') || errMsg.includes('invalid_credentials'))
      ) {
        setGoogleHint(true);
        showNotification(
          "Identifiants incorrects. Si tu t'es inscrit avec Google, utilise le bouton \"Continuer avec Google\" ci-dessous.",
          'error'
        );
      } else {
        setGoogleHint(false);
        showNotification(getAuthErrorMessage(error), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/home',
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      showNotification(getAuthErrorMessage(error), 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showNotification('Veuillez entrer votre adresse email', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
      });
      if (error) throw error;
      showNotification('Un email de réinitialisation vous a été envoyé', 'success');
      setIsForgotPassword(false);
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
      {/* Overlay pour assombrir/adoucir l'image de fond et garder le texte lisible */}
      <div className="absolute inset-0 bg-theme-bg/80 backdrop-blur-sm z-0"></div>

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer z-10"
        title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-yellow-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-500" />
        )}
      </button>

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

        <form
          onSubmit={isForgotPassword ? handleResetPassword : handleAuth}
          className="bg-theme-surface p-8 rounded-[3rem] shadow-xl border border-theme-border space-y-6 transition-theme"
        >
          <div className="space-y-4">
            {isForgotPassword ? (
              <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-theme-accent-start">
                    Mot de passe oublié
                  </p>
                  <p className="text-xs text-theme-text-secondary mt-1">
                    Entrez votre email pour recevoir un lien de réinitialisation.
                  </p>
                </div>
              </div>
            ) : isSignUp && (
              <div className="space-y-5 animate-in slide-in-from-top-2 duration-300 bg-theme-bg/90 border border-theme-border rounded-3xl p-5 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-theme-accent-start">
                        Création de compte
                      </p>
                      <p className="text-xs text-theme-text-secondary mt-1">
                        Renseignez votre nom complet. Un administrateur vous attribuera votre rôle.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <User className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Nom complet"
                    className={inputClass}
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
              <input
                type="email"
                placeholder="Email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-theme-text-secondary/50 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-theme-text-secondary/50 hover:text-theme-text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {!isSignUp && !isForgotPassword && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[10px] font-bold text-theme-text-secondary hover:text-theme-accent-start uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-theme-accent-start/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isForgotPassword ? (
                "Réinitialiser"
              ) : isSignUp ? (
                "S'inscrire"
              ) : (
                'Se Connecter'
              )}
            </button>

            {!isForgotPassword && (
              <>
                {/* Séparateur */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-theme-border" />
                  <span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest">ou</span>
                  <div className="flex-1 h-px bg-theme-border" />
                </div>

                {/* Bouton Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className={`w-full flex items-center justify-center gap-3 bg-white text-gray-700 border py-3.5 rounded-2xl font-bold text-[11px] hover:bg-gray-50 active:scale-95 transition-all cursor-pointer disabled:opacity-60 shadow-sm ${
                    googleHint
                      ? 'border-blue-500 ring-2 ring-blue-400 ring-offset-1 animate-pulse hover:animate-none'
                      : 'border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Icône SVG officielle Google */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.6 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 1.1 8.2 3l5.9-5.9C34.5 4.4 29.5 2 24 2 12 2 2 12 2 24s10 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.4-4z"/>
                    <path fill="#FF3D00" d="m6.3 14.7 6.9 5C14.9 16.4 19.1 13 24 13c3.1 0 6 1.1 8.2 3l5.9-5.9C34.5 4.4 29.5 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 46c5.4 0 10.3-1.9 14.1-5.1l-6.5-5.5C29.5 36.8 26.9 38 24 38c-5.3 0-9.6-3.4-11.3-8.1l-6.9 5.3C9.5 42.2 16.2 46 24 46z"/>
                    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.4-2.4 4.4-4.4 5.9l6.5 5.5C41.6 35.8 44 30.3 44 24c0-1.3-.2-2.7-.4-4z"/>
                  </svg>
                  Continuer avec Google
                </button>
              </>
            )}
          </div>

          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              disabled={isSubmitting}
              className="w-full text-center text-[10px] font-bold text-theme-accent-end uppercase tracking-widest hover:text-theme-accent-start transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              Retour à la connexion
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isSubmitting}
              className="w-full text-center text-[10px] font-bold text-theme-accent-end uppercase tracking-widest hover:text-theme-accent-start transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSignUp ? 'Déjà un compte ? Connexion' : "Pas encore de compte ? S'inscrire"}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
