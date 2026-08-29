/** Aligné sur `public.membre_branche` : 'ange' | 'archange' | 'perame' */
export const MEMBRE_BRANCHE_VALUES = ['ange', 'archange', 'perame'] as const;

export type MembreBranche = (typeof MEMBRE_BRANCHE_VALUES)[number];

export const DEFAULT_MEMBRE_BRANCHE: MembreBranche = 'ange';

export const MEMBRE_BRANCHE_OPTIONS: { value: MembreBranche; label: string }[] = [
  { value: 'ange', label: 'Enfants' },
  { value: 'archange', label: 'Archanges' },
  { value: 'perame', label: 'Pérames' },
];

/** Valeurs historiques (UI / anciennes données) → enum Postgres */
export function normalizeMembreBranche(value: string | null | undefined): MembreBranche {
  const v = (value ?? '').toLowerCase().trim();
  if (v === 'enfant' || v === 'ka' || v === 'anges' || v === 'ange') return 'ange';
  if (v === 'archange' || v === 'archanges') return 'archange';
  if (v === 'perame' || v === 'perames' || v === 'pérames' || v === 'pérame') return 'perame';
  return DEFAULT_MEMBRE_BRANCHE;
}

export function isMembreBranche(value: string): value is MembreBranche {
  return (MEMBRE_BRANCHE_VALUES as readonly string[]).includes(value);
}

export function getMembreBrancheLabel(value: string | null | undefined): string {
  const key = normalizeMembreBranche(value);
  return MEMBRE_BRANCHE_OPTIONS.find((o) => o.value === key)?.label ?? key;
}
