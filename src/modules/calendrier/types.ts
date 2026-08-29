export interface CalendarEvent {
    id: string;
    structure_id: string;
    author_id: string;
    title: string;
    description: string | null;
    event_type: string;
    annee_initiatique: string;
    start_date: string;
    end_date: string | null;
    is_mandatory: boolean;
    created_at: string;
    // Enrichi côté client
    structure_name?: string;
    structure_type?: string;
    origin?: 'mine' | 'parent' | 'child';
    author?: { nom?: string; prenom?: string; avatar_url?: string };
    structure?: { name: string; type: string };
}

export const EVENT_TYPES = [
    "Activité", "Journée d'amitié", "Retraite", "Formation",
    "Cérémonie", "Réunion", "Collecte", "Célébration", "Autre"
];

export const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
export const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const getInitiaticYear = (date = new Date()) => {
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-11
    if (m >= 8) return `${y}-${y+1}`;
    return `${y-1}-${y}`;
};

export const ORIGIN_STYLES: Record<string, string> = {
    mine: 'bg-theme-accent-start/20 text-theme-accent-start border-theme-accent-start/30',
    parent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    mandatory: 'bg-red-500/15 text-red-400 border-red-500/30',
    child: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};
