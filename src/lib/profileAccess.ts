import { supabase } from './supabase';
import { withRetry, withTimeout } from './authError';

export type ProfileAccessStatus =
  | { kind: 'unauthenticated' }
  | { kind: 'complete'; userId: string }
  | { kind: 'incomplete'; userId: string };

/** Vérifie session (cache local) puis profil (réseau, avec retry). */
export async function resolveProfileAccess(providedUserId?: string | null): Promise<ProfileAccessStatus> {
  console.log('[profileAccess] resolveProfileAccess appelé avec userId:', providedUserId ?? 'null');
  let userId: string | null = providedUserId ?? null;

  if (!userId) {
    try {
      console.log('[profileAccess] Tentative getSession...');
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        45000 // Supabase cold start peut prendre jusqu'à 20-30s
      );
      userId = session?.user?.id ?? null;
      console.log('[profileAccess] getSession réussi, userId:', userId);
    } catch (sessionError) {
      console.warn('[profileAccess] getSession timeout/échec:', sessionError);
      try {
        console.log('[profileAccess] Tentative getUser...');
        const { data: { user } } = await withTimeout(
          supabase.auth.getUser(),
          45000
        );
        userId = user?.id ?? null;
        console.log('[profileAccess] getUser réussi, userId:', userId);
      } catch (userError) {
        console.warn("[profileAccess] getUser() timed out or failed:", userError);
        userId = null;
      }
    }
  }

  if (!userId) {
    console.log('[profileAccess] userId toujours null → unauthenticated');
    return { kind: 'unauthenticated' };
  }

  console.log('[profileAccess] Requête table \'profiles\' pour userId:', userId);
  const t0 = Date.now();
  const { data: profile, error: profileError } = await withRetry(
    () =>
      supabase
        .from('profiles')
        .select('id, comi_id')
        .eq('id', userId)
        .maybeSingle(),
    { attempts: 3, timeoutMs: 25_000, delayMs: 800 },
  );
  console.log(`[profileAccess] Requête profiles terminée en ${Date.now() - t0}ms`, { profile, profileError });

  if (profileError) {
    console.warn('[profileAccess] profile fetch error:', profileError);
    return { kind: 'incomplete', userId };
  }

  if (profile?.comi_id) {
    console.log('[profileAccess] Profil complet (comi_id présent) → complete');
    return { kind: 'complete', userId };
  }
  console.log('[profileAccess] Profil incomplet (pas de comi_id) → incomplete');
  return { kind: 'incomplete', userId };
}
