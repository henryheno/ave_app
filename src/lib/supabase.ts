// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Les variables d'environnement Supabase sont manquantes ! Vérifie ton fichier .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // DÉSACTIVATION GLOBALE DU SYSTÈME DE VERROUILLAGE SUPABASE
    // Le système natif navigator.locks de Supabase plante en production sur Vercel
    // et bloque indéfiniment TOUTES les requêtes supabase.from().
    // En ajoutant cette ligne, on force Supabase à ignorer le verrou et 
    // on règle définitivement 100% des blocages pour toute l'application.
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn();
    }
  },
});
