import { useState, type MouseEvent } from 'react';
import { CornerDownRight, ChevronDown, ChevronUp, Edit3, Trash2, Heart, MessageCircle } from 'lucide-react';
import { ReactionPicker } from './ReactionPicker';
import { ADMIN_ROLES, MAX_REPLIES, REPLIES_PAGE_SIZE } from './constants';
import { timeAgo } from './utils';
import type { Comment, Profile } from './types';

interface CommentCardProps {
    comment: Comment;
    depth: number;
    userProfile: Profile | null;
    onReply: (c: Comment) => void;
    onReact: (commentId: string, type: string) => void;
    onSelect: (c: Comment) => void;
    onDelete: (commentId: string) => Promise<boolean>;
    onEdit: (commentId: string, content: string) => Promise<boolean>;
    isSelected: boolean;
}

export const CommentCard = ({
    comment,
    depth,
    userProfile,
    onReply,
    onReact,
    onSelect,
    onDelete,
    onEdit,
    isSelected
}: CommentCardProps) => {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [showReplies, setShowReplies] = useState(true);
    const [visibleReplies, setVisibleReplies] = useState(REPLIES_PAGE_SIZE);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const myReaction = comment.reactions?.find(r => r.user_id === userProfile?.id);
    const replyCount = comment.children?.length || 0;
    const visibleChildren = comment.children?.slice(0, visibleReplies) || [];
    const maxReached = depth >= 1 && replyCount >= MAX_REPLIES;
    const canManage = Boolean(userProfile && (userProfile.id === comment.user_id || ADMIN_ROLES.includes(userProfile.utilisateurs?.role ?? '')));

    const handleSave = async (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const trimmed = editContent.trim();
        if (!trimmed) return;
        const success = await onEdit(comment.id, trimmed);
        if (success) setIsEditing(false);
    };

    return (
        <div className={`${depth > 0 ? 'ml-5 border-l-2 border-white/10 pl-4' : ''}`}>
            <div
                onClick={() => onSelect(comment)}
                className={`bg-theme-surface/60 backdrop-blur-md border rounded-[1.5rem] p-4 shadow-sm transition-all ${isSelected ? 'border-theme-accent-start/40 ring-1 ring-theme-accent-start/20 bg-theme-accent-start/5' : 'border-white/10 hover:border-white/20'} cursor-pointer`}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1.5 ring-white/10 shadow-sm">
                            {comment.user?.avatar_url ? (
                                <img loading="lazy" src={comment.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-theme-accent-start to-theme-accent-end flex items-center justify-center text-white text-[9px] font-black">
                                    {comment.user?.prenom?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] font-black text-theme-text-primary capitalize">{comment.user?.prenom} {comment.user?.nom}</p>
                    </div>
                    <p className="text-[8px] text-theme-text-secondary/60">{timeAgo(comment.created_at)}</p>
                </div>

                {/* Contenu */}
                {isEditing ? (
                    <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Évite de désélectionner ou de déclencher onSelect au clic sur la zone de texte
                        rows={3}
                        className="w-full bg-theme-bg/60 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-[12px] text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 transition-all outline-none"
                    />
                ) : (
                    <p className="text-theme-text-secondary text-[12px] leading-relaxed font-medium mb-3">{comment.content}</p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setPickerOpen(p => !p); }}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer text-[10px] ${myReaction ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'text-theme-text-secondary hover:bg-white/5'}`}
                            >
                                <Heart className={`w-3.5 h-3.5 ${myReaction ? 'fill-theme-accent-start' : ''}`} />
                            </button>
                            <span className="text-[10px] font-black text-theme-text-secondary">{comment.reactions?.length || 0}</span>
                        </div>
                        {pickerOpen && (
                            <div className="absolute bottom-full left-0 mb-2 z-30">
                                <ReactionPicker onPick={(type) => { onReact(comment.id, type); setPickerOpen(false); }} />
                            </div>
                        )}
                    </div>

                    {!maxReached && !isEditing && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onReply(comment); }}
                            className="text-[9px] font-black text-theme-accent-start uppercase tracking-wider hover:underline cursor-pointer flex items-center gap-1"
                        >
                            <CornerDownRight className="w-3 h-3" /> Répondre
                        </button>
                    )}

                    {canManage && !isEditing && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                className="text-[9px] font-black text-theme-text-secondary uppercase tracking-wider hover:text-theme-accent-start cursor-pointer flex items-center gap-1"
                            >
                                <Edit3 className="w-3 h-3" /> Modifier
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm('Supprimer ce commentaire ?')) return;
                                    await onDelete(comment.id);
                                }}
                                className="text-[9px] font-black text-red-500 uppercase tracking-wider hover:text-red-600 cursor-pointer flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> Supprimer
                            </button>
                        </>
                    )}

                    {isEditing && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); void handleSave(e); }}
                                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-sm"
                            >
                                Enregistrer
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsEditing(false); setEditContent(comment.content); }}
                                className="px-3.5 py-1.5 rounded-full bg-white/5 text-theme-text-secondary text-[9px] font-black uppercase tracking-widest border border-white/10 cursor-pointer"
                            >
                                Annuler
                            </button>
                        </div>
                    )}

                    {maxReached && !isEditing && (
                        <span className="text-[9px] font-bold text-theme-text-secondary/50 uppercase tracking-wider">Max réponses atteint</span>
                    )}

                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect(comment); }}
                        className="ml-auto text-[9px] font-black text-theme-text-secondary uppercase tracking-wider hover:text-theme-accent-start cursor-pointer flex items-center gap-1"
                    >
                        <MessageCircle className="w-3 h-3" /> Fil
                    </button>
                </div>
            </div>

            {/* Enfants */}
            {comment.children && comment.children.length > 0 && (
                <div className="mt-2.5 space-y-2.5">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowReplies(s => !s); }}
                        className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:text-theme-text-primary ml-1"
                    >
                        {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {replyCount} réponse{replyCount > 1 ? 's' : ''}
                    </button>
                    {showReplies && (
                        <>
                            {visibleChildren.map(child => (
                                <CommentCard
                                    key={child.id}
                                    comment={child}
                                    depth={depth + 1}
                                    userProfile={userProfile}
                                    onReply={onReply}
                                    onReact={onReact}
                                    onSelect={onSelect}
                                    onDelete={onDelete}
                                    onEdit={onEdit}
                                    isSelected={isSelected}
                                />
                            ))}
                            {replyCount > visibleReplies && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setVisibleReplies(v => Math.min(replyCount, v + REPLIES_PAGE_SIZE)); }}
                                    className="ml-6 text-[9px] font-black text-theme-accent-start uppercase tracking-wider hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <ChevronDown className="w-3 h-3" /> Voir plus ({replyCount - visibleReplies} restants)
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};