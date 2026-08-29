import { getStructures } from './structureCache';

const MAX_DEPTH = 32;

/**
 * Remonte uniquement la chaîne parente du COMI depuis le cache en mémoire.
 */
export async function getAncestorIds(comiId: string | null): Promise<string[]> {
  if (!comiId) return [];

  const allStructures = await getStructures();
  const structureMap = new Map(allStructures.map(s => [s.id, s]));

  const ancestorIds: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = comiId;

  while (currentId && ancestorIds.length < MAX_DEPTH) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    ancestorIds.push(currentId);

    const s = structureMap.get(currentId);
    currentId = s?.parent_id ?? null;
  }

  return ancestorIds;
}

export function clearStructureLinksCache() {
  // Plus besoin de cache local pour les liens, on utilise le cache global
}
