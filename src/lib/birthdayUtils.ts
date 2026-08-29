/**
 * Utilitaires pour la détection d'anniversaire
 */

/**
 * Vérifie si une date de naissance correspond à aujourd'hui (jour + mois)
 */
export const isBirthdayToday = (dateNaissance: string | null | undefined): boolean => {
  if (!dateNaissance) return false;
  try {
    const birth = new Date(dateNaissance);
    const today = new Date();
    return (
      birth.getDate() === today.getDate() &&
      birth.getMonth() === today.getMonth()
    );
  } catch {
    return false;
  }
};

/**
 * Vérifie si une date de naissance correspond à demain (jour + mois)
 */
export const isBirthdayTomorrow = (dateNaissance: string | null | undefined): boolean => {
  if (!dateNaissance) return false;
  try {
    const birth = new Date(dateNaissance);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      birth.getDate() === tomorrow.getDate() &&
      birth.getMonth() === tomorrow.getMonth()
    );
  } catch {
    return false;
  }
};
/**
 * Retourne l'âge si c'est l'anniversaire aujourd'hui, sinon null
 */
export const getBirthdayAge = (dateNaissance: string | null | undefined): number | null => {
  if (!isBirthdayToday(dateNaissance)) return null;
  try {
    const birth = new Date(dateNaissance!);
    const today = new Date();
    return today.getFullYear() - birth.getFullYear();
  } catch {
    return null;
  }
};

/**
 * Retourne l'année courante pour les souhaits
 */
export const getCurrentWishYear = (): number => new Date().getFullYear();

/**
 * Retourne le titre d'anniversaire selon la branche, la fonction, le prénom et le nom
 * - Enfant/Ange : "Petit Ange [Prénom] [Nom]"
 * - Archange : "Ya [Fonction] [Prénom] [Nom]"
 * - Pérame : "[Fonction] [Prénom] [Nom]"
 */
export const getBirthdayTitle = (profile: any): string => {
  if (!profile || !profile.prenom) return "Ami(e)";
  const b = (profile.branche || '').toLowerCase().trim();
  const nom = profile.nom ? ` ${profile.nom}` : '';
  
  if (b === 'enfant' || b === 'anges' || b === 'ange' || b === 'ka' || b === 'petit ange') {
    return `Petit Ange ${profile.prenom}${nom}`;
  } else if (b === 'archange' || b === 'archanges') {
    const fonctionStr = profile.fonction ? `${profile.fonction} ` : '';
    return `Ya ${fonctionStr}${profile.prenom}${nom}`;
  }
  
  // Pérames ou autres
  const fonctionStr = profile.fonction ? `${profile.fonction} ` : '';
  return `${fonctionStr}${profile.prenom}${nom}`;
};
