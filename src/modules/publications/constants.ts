import { ThumbsUp, ThumbsDown, Heart, Frown, Angry, FileText, MessageCircle } from 'lucide-react';

export const MAX_REPLIES = 5;
export const PAGE_SIZE = 10;
export const REPLIES_PAGE_SIZE = 3; // Ajout requis par CommentCard pour la pagination locale des réponses

// Ajout des rôles administratifs autorisés à modifier/supprimer les commentaires d'autrui
export const ADMIN_ROLES = ['admin', 'moderator', 'super_admin'];

export const TABS = [
    { id: 'publication', label: 'Publication', icon: FileText },
    { id: 'reactions', label: 'Réactions', icon: Heart },
    { id: 'comments', label: 'Commentaires', icon: MessageCircle }
];

export const COMMENT_SORT_OPTIONS: { value: 'all' | 'recent' | 'oldest'; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'recent', label: 'Plus récents' },
    { value: 'oldest', label: 'Plus anciens' }
];

// Configuration synchronisée avec l'énumération public.reaction_type de PostgreSQL
export const REACTION_TYPES = [
    {
        type: "j'aime",
        label: "J'aime",
        icon: ThumbsUp
    },
    {
        type: "j'aime pas",
        label: "J'aime pas",
        icon: ThumbsDown
    },
    {
        type: "j'adore",
        label: "J'adore",
        icon: Heart
    },
    {
        type: "triste",
        label: "Triste",
        icon: Frown
    },
    {
        type: "colere",
        label: "En colère",
        icon: Angry
    }
];