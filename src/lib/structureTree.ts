import { getStructures } from './structureCache';

export type StructureNode = {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  hasChildren: boolean;
};

/** Enfants directs d'un parent (null = racine COSU / sans parent). */
export async function fetchStructureChildren(
  parentId: string | null,
): Promise<{ data: StructureNode[]; error: Error | null }> {
  try {
    const all = await getStructures();
    
    // Trier par nom (comme le order('name'))
    const allSorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
    
    // Filtrer les enfants
    const children = allSorted.filter(s => parentId ? s.parent_id === parentId : !s.parent_id);
    
    // Créer un Set des IDs de parents pour vérifier rapidement s'ils ont des enfants
    const parentsWithChildren = new Set(all.filter(s => s.parent_id).map(s => s.parent_id));

    return {
      data: children.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        parent_id: s.parent_id,
        hasChildren: parentsWithChildren.has(s.id),
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Erreur réseau'),
    };
  }
}

/** Peut-on descendre dans l'arbre ? (a des fils) */
export function shouldDrillInto(node: StructureNode): boolean {
  return node.hasChildren;
}

/** Feuille sélectionnable comme paroisse (COMI sans enfant). */
export function isSelectableComi(node: StructureNode): boolean {
  return !node.hasChildren && node.type === 'COMI';
}
