import { REACTION_TYPES } from './constants';
import type { Reaction, Comment } from './types';

export function buildTree(comments: Comment[]): Comment[] {
    const map: Record<string, Comment> = {};
    const roots: Comment[] = [];
    comments.forEach(c => { map[c.id] = { ...c, children: [] }; });
    comments.forEach(c => {
        if (c.parent_id && map[c.parent_id]) {
            map[c.parent_id].children!.push(map[c.id]);
        } else if (!c.parent_id) {
            roots.push(map[c.id]);
        }
    });
    return roots;
}

export function countReactionsByType(reactions: Reaction[]) {
    return REACTION_TYPES.map(rt => ({
        ...rt,
        count: reactions.filter(r => r.type === rt.type).length
    }));
}

export const getReactionType = (type: string) => REACTION_TYPES.find(rt => rt.type === type) ?? REACTION_TYPES[0];

export function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'à l\'instant';
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'hier';
    if (d < 10) return `il y a ${d} jours`;
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

export function stableIdentifier(value: string) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
