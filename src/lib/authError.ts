/** Message lisible pour les erreurs réseau (souvent "Failed to fetch" sous Edge). */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      (error.name === 'TypeError' && msg.includes('fetch'))
    ) {
      return (
        'Impossible de joindre le serveur. Vérifiez votre connexion, désactivez les bloqueurs ' +
        '(Edge : Paramètres → Confidentialité → Protection contre le suivi) et utilisez la même URL ' +
        'que dans Cursor (http://localhost:5173).'
      );
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.';
    }
    return error.message;
  }
  return 'Une erreur est survenue';
}

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    error.name === 'TypeError'
  );
}

export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timeout') || msg.includes('expiré');
}

/** Évite un chargement infini si Supabase ne répond pas. */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 25_000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('La requête a expiré (timeout)')), ms),
    ),
  ]);
}

/** Plusieurs tentatives avec délai (réseau lent / Edge). */
export async function withRetry<T>(
  fn: () => PromiseLike<T>,
  options: { attempts?: number; timeoutMs?: number; delayMs?: number } = {},
): Promise<T> {
  const { attempts = 3, timeoutMs = 25_000, delayMs = 1_000 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
