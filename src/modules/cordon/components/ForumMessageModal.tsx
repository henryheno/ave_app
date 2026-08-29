import { CornerDownRight, Trash2, Edit2, Info, X } from 'lucide-react';
import type { ForumUser } from '../CoordinatorForumPage';

interface ForumMessage {
    id: string;
    author_id: string;
    content: string;
    created_at: string;
    is_edited?: boolean;
    updated_at?: string;
    author: {
        role: string | null;
        profile: { id: string; nom: string; prenom: string } | null;
        structure: { id: string; name: string; type: string } | null;
    };
    reactions?: any[];
    reads?: any[];
}

export const MessageActionsModal = ({ 
    message, 
    userProfile, 
    onClose, 
    onReply, 
    onEdit, 
    onDelete, 
    onDetails,
    onReaction
}: { 
    message: ForumMessage; 
    userProfile: any; 
    onClose: () => void; 
    onReply: () => void; 
    onEdit: () => void; 
    onDelete: () => void; 
    onDetails: () => void;
    onReaction: (emoji: string) => void;
}) => {
    const isMe = message.author_id === userProfile?.id;
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
    const canSeeDetails = isMe || isAdmin;
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-5 space-y-4 w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-2 border-b border-theme-border/50">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary">Actions du message</h3>
                    <button onClick={onClose} className="p-1 bg-theme-bg rounded-lg hover:text-theme-text-primary transition-colors text-theme-text-secondary">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Barre de réactions */}
                <div className="flex justify-between bg-theme-bg p-3 rounded-2xl border border-theme-border">
                    {emojis.map(emoji => (
                        <button 
                            key={emoji}
                            onClick={() => { onReaction(emoji); onClose(); }}
                            className="text-2xl hover:scale-125 transition-transform cursor-pointer"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {/* Actions principales */}
                <div className="space-y-1">
                    <button onClick={() => { onReply(); onClose(); }} className="w-full flex items-center gap-3 p-3.5 bg-theme-bg hover:bg-theme-surface-hover rounded-xl transition-colors cursor-pointer text-theme-text-primary text-sm font-bold">
                        <CornerDownRight className="w-5 h-5 text-theme-text-secondary" />
                        Répondre
                    </button>
                    
                    {isMe && (
                        <button onClick={() => { onEdit(); onClose(); }} className="w-full flex items-center gap-3 p-3.5 bg-theme-bg hover:bg-theme-surface-hover rounded-xl transition-colors cursor-pointer text-theme-text-primary text-sm font-bold">
                            <Edit2 className="w-5 h-5 text-theme-text-secondary" />
                            Modifier
                        </button>
                    )}

                    {canSeeDetails && (
                        <button onClick={() => { onDetails(); onClose(); }} className="w-full flex items-center gap-3 p-3.5 bg-theme-bg hover:bg-theme-surface-hover rounded-xl transition-colors cursor-pointer text-theme-text-primary text-sm font-bold">
                            <Info className="w-5 h-5 text-theme-text-secondary" />
                            Voir les détails (Vu par)
                        </button>
                    )}

                    {(isMe || isAdmin) && (
                        <button onClick={() => { onDelete(); onClose(); }} className="w-full flex items-center gap-3 p-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors cursor-pointer text-sm font-bold">
                            <Trash2 className="w-5 h-5" />
                            Supprimer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MessageDetailsModal = ({ message, usersDirectory, onClose }: { message: ForumMessage; usersDirectory: ForumUser[]; onClose: () => void }) => {
    const getReadsDetails = () => {
        if (!message.reads || message.reads.length === 0) return [];
        return message.reads.map(r => {
            const user = usersDirectory.find(u => u.id === r.user_id);
            return {
                id: r.user_id,
                time: new Date(r.read_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                label: user ? `${user.structLabel} - ${user.label}` : 'Utilisateur inconnu'
            };
        });
    };

    const readsDetails = getReadsDetails();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black uppercase tracking-wider text-theme-text-primary">Détails du message</h3>
                    <button onClick={onClose} className="p-1.5 bg-theme-bg border border-theme-border rounded-lg hover:text-theme-text-primary transition-colors text-theme-text-secondary">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-theme-bg p-3 rounded-xl border border-theme-border">
                        <p className="text-[10px] font-bold text-theme-text-secondary uppercase mb-1">Date de création</p>
                        <p className="text-sm font-bold text-theme-text-primary">{new Date(message.created_at).toLocaleString()}</p>
                        {message.is_edited && message.updated_at && (
                            <>
                                <p className="text-[10px] font-bold text-theme-text-secondary uppercase mt-2 mb-1">Dernière modification</p>
                                <p className="text-sm font-bold text-theme-text-primary">{new Date(message.updated_at).toLocaleString()}</p>
                            </>
                        )}
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-2 flex justify-between">
                            <span>Vu par</span>
                            <span className="text-theme-accent-end bg-theme-accent-end/10 px-2 py-0.5 rounded-full">{readsDetails.length}</span>
                        </p>
                        <div className="bg-theme-bg border border-theme-border rounded-xl max-h-48 overflow-y-auto p-1">
                            {readsDetails.length > 0 ? (
                                readsDetails.map(r => (
                                    <div key={r.id} className="flex items-center gap-2 p-2 hover:bg-theme-surface rounded-lg transition-colors">
                                        <div className="w-6 h-6 rounded bg-theme-surface flex items-center justify-center text-[8px] font-black text-theme-text-secondary">👤</div>
                                        <div className="flex-1 min-w-0 text-xs font-bold text-theme-text-primary truncate">{r.label}</div>
                                        <span className="text-[8px] text-theme-text-secondary font-medium shrink-0">{r.time}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-theme-text-secondary font-medium p-4 text-center">Aucune vue enregistrée.</p>
                            )}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-full mt-4 p-3 bg-theme-bg hover:bg-theme-surface border border-theme-border rounded-xl text-xs font-black uppercase tracking-widest text-theme-text-primary transition-colors cursor-pointer">
                    Fermer
                </button>
            </div>
        </div>
    );
};
