export interface Profile {
    id: string;
    prenom: string;
    nom: string;
    avatar_url?: string;
    utilisateurs?: { role: string | null };
}

export interface Reaction {
    id: string;
    user_id: string;
    publication_id?: string | null;
    comment_id?: string | null;
    type: string;
    created_at: string;
    user?: Profile;
}

export interface Comment {
    id: string;
    publication_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    created_at: string;
    user: Profile;
    reactions: Reaction[];
    children?: Comment[];
}

export interface MediaItem {
    type: 'pdf' | 'video' | 'audio' | 'image' | 'document';
    url: string;
}

export interface Structure {
    id: string;
    name: string;
    type: string;
}

export interface Post {
    id: string;
    content: string;
    created_at: string;
    media_items: MediaItem[];
    structure: Structure;
    reactions: Reaction[];
    comments: Comment[];
    author_id?: string;
    author?: Profile;
}
