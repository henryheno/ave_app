import { supabase } from '../../../lib/supabase';

// ─── Types stricts (plus de any[]) ───────────────────────────────────────────

export interface OldestProfile {
  id: string;
  nom: string | null;
  prenom: string | null;
  avatar_url: string | null;
  date_naissance: string;
  fonction: string | null;
  branche: string | null;
  age: number;
}

export interface RecentPublication {
  id: string;
  content: string | null;
  created_at: string;
  author: {
    nom: string | null;
    prenom: string | null;
    avatar_url: string | null;
  } | null;
  reactionsCount: number;
  commentsCount: number;
}

export interface DashboardStats {
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  profiles: {
    total: number;
    bySexe: Record<string, number>;
    byFonction: Record<string, number>;
    byBranche: Record<string, number>;
    byAge: Record<string, number>;
    oldestProfiles: OldestProfile[];
  };
  structures: {
    total: number;
    tree: StructureNode[];
  };
  engagement: {
    totalPublications: number;
    totalComments: number;
    totalReactions: number;
    recentPublications: RecentPublication[];
  };
  signalements: {
    total: number;
    byType: Record<string, number>;
    byStatut: Record<string, number>;
  };
}

export interface StructureNode {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  directProfilesCount: number;
  totalProfilesCount: number;
  children: StructureNode[];
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

const groupBy = <T>(
  items: T[],
  key: (item: T) => string
): Record<string, number> =>
  items.reduce(
    (acc, item) => {
      const k = key(item) || 'non_defini';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

const computeAge = (dateNaissance: string, today: Date): number => {
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const ageGroup = (age: number): string => {
  if (age <= 5)  return '0 - 5 ans';
  if (age <= 7)  return '6 - 7 ans';
  if (age <= 9)  return '8 - 9 ans';
  if (age <= 15) return '10 - 15 ans';
  if (age <= 20) return '16 - 20 ans';
  if (age <= 25) return '21 - 25 ans';
  return 'Plus de 25 ans';
};

const calculateTotalProfiles = (node: StructureNode): number => {
  let total = node.directProfilesCount;
  for (const child of node.children) {
    total += calculateTotalProfiles(child);
  }
  node.totalProfilesCount = total;
  return total;
};

// ─── Fonction principale ──────────────────────────────────────────────────────

export const getDashboardStats = async (): Promise<DashboardStats> => {
  // Toutes les requêtes indépendantes lancées en parallèle
  const [
    usersRes,
    profilesRes,
    structuresRes,
    profileStructRes,
    pubCountRes,
    commentCountRes,
    reactionCountRes,
    recentPubsRes,
    signalementsRes,
  ] = await Promise.all([
    supabase.from('utilisateurs').select('role'),
    supabase.from('profiles').select('id, nom, prenom, sexe, fonction, branche, date_naissance, avatar_url'),
    supabase.from('structures').select('*'),
    supabase.from('profiles').select('comi_id'),
    supabase.from('publications').select('id', { count: 'exact', head: true }),
    supabase.from('comments').select('id', { count: 'exact', head: true }),
    supabase.from('reactions').select('id', { count: 'exact', head: true }),
    supabase
      .from('publications')
      .select(`
        id,
        content,
        created_at,
        author:profiles!author_id(nom, prenom, avatar_url),
        reactions:reactions(count),
        comments:comments(count)
      `)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('signalements').select('type, statut'),
  ]);

  // ── 1. Utilisateurs ──────────────────────────────────────────────────────
  const usersData = usersRes.data || [];
  const totalUsers = usersData.length;
  const usersByRole = groupBy(usersData, (u) => u.role || 'non_defini');

  // ── 2. Profils ───────────────────────────────────────────────────────────
  const profilesData = profilesRes.data || [];
  const totalProfiles = profilesData.length;

  const profilesBySexe = groupBy(profilesData, (p) => p.sexe || 'non_defini');
  const profilesByFonction = groupBy(profilesData, (p) => p.fonction || 'non_defini');
  const profilesByBranche = groupBy(profilesData, (p) => p.branche || 'non_defini');

  const today = new Date();
  const profilesByAge: Record<string, number> = {
    '0 - 5 ans': 0,
    '6 - 7 ans': 0,
    '8 - 9 ans': 0,
    '10 - 15 ans': 0,
    '16 - 20 ans': 0,
    '21 - 25 ans': 0,
    'Plus de 25 ans': 0,
    'non_defini': 0,
  };

  const oldestProfiles: OldestProfile[] = [];

  for (const p of profilesData) {
    if (!p.date_naissance) {
      profilesByAge['non_defini']++;
      continue;
    }
    const age = computeAge(p.date_naissance, today);
    profilesByAge[ageGroup(age)]++;
    oldestProfiles.push({
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      avatar_url: p.avatar_url,
      date_naissance: p.date_naissance,
      fonction: p.fonction,
      branche: p.branche,
      age,
    });
  }

  // Tri : du plus âgé au plus jeune
  oldestProfiles.sort((a, b) => b.age - a.age);

  // ── 3. Structures ────────────────────────────────────────────────────────
  const structuresData = structuresRes.data || [];
  const profileStructData = profileStructRes.data || [];

  const structProfilesCount: Record<string, number> = {};
  for (const p of profileStructData) {
    if (p.comi_id) {
      structProfilesCount[p.comi_id] = (structProfilesCount[p.comi_id] || 0) + 1;
    }
  }

  const structureNodes: Record<string, StructureNode> = {};
  for (const s of structuresData) {
    structureNodes[s.id] = {
      id: s.id,
      name: s.name,
      type: s.type,
      parent_id: s.parent_id,
      directProfilesCount: structProfilesCount[s.id] || 0,
      totalProfilesCount: 0,
      children: [],
    };
  }

  const roots: StructureNode[] = [];
  for (const node of Object.values(structureNodes)) {
    if (node.parent_id && structureNodes[node.parent_id]) {
      structureNodes[node.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  }
  roots.forEach(calculateTotalProfiles);

  // ── 4. Engagement ────────────────────────────────────────────────────────
  const recentPubs = recentPubsRes.data || [];
  const recentPublications: RecentPublication[] = recentPubs.map((pub) => ({
    id: pub.id,
    content: pub.content,
    created_at: pub.created_at,
    author: Array.isArray(pub.author) ? pub.author[0] ?? null : (pub.author as RecentPublication['author']),
    reactionsCount: (pub.reactions as Array<{ count: number }>)?.[0]?.count ?? 0,
    commentsCount: (pub.comments as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));

  return {
    users: { total: totalUsers, byRole: usersByRole },
    profiles: {
      total: totalProfiles,
      bySexe: profilesBySexe,
      byFonction: profilesByFonction,
      byBranche: profilesByBranche,
      byAge: profilesByAge,
      oldestProfiles,
    },
    structures: { total: structuresData.length, tree: roots },
    engagement: {
      totalPublications: pubCountRes.count || 0,
      totalComments: commentCountRes.count || 0,
      totalReactions: reactionCountRes.count || 0,
      recentPublications,
    },
    signalements: {
      total: (signalementsRes.data || []).length,
      byType: groupBy(signalementsRes.data || [], (s) => s.type || 'non_defini'),
      byStatut: groupBy(signalementsRes.data || [], (s) => s.statut || 'non_defini'),
    },
  };
};
