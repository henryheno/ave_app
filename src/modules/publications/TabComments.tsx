import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CommentCard } from './CommentCard';
import { buildTree } from './utils';
import { PAGE_SIZE, COMMENT_SORT_OPTIONS } from './constants';
import type { Post, Profile, Comment } from './types';

interface TabCommentsProps {
    post: Post;
    userProfile: Profile | null;
    onReply: (c: Comment) => void;
    onReact: (commentId: string, type: string) => void;
    onSelectThread: (c: Comment) => void;
    onDelete: (commentId: string) => Promise<boolean>;
    onEdit: (commentId: string, content: string) => Promise<boolean>;
}

export const TabComments = ({
    post,
    userProfile,
    onReply,
    onReact,
    onSelectThread,
    onDelete,
    onEdit
}: TabCommentsProps) => {
    const [page, setPage] = useState(1);
    const [sortOrder, setSortOrder] = useState<'all' | 'recent' | 'oldest'>('all');
    
    const tree = buildTree(post.comments || []);
    const roots = tree.filter(c => !c.parent_id);
    const sortedRoots = [...roots].sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        if (sortOrder === 'oldest') return aTime - bTime;
        return bTime - aTime;
    });
    const paginated = sortedRoots.slice(0, page * PAGE_SIZE);
    const hasMore = paginated.length < sortedRoots.length;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {COMMENT_SORT_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        onClick={() => { setSortOrder(option.value); setPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${sortOrder === option.value ? 'bg-theme-accent-start text-white border-theme-accent-start' : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'}`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <p className="text-[9px] text-theme-text-secondary font-black uppercase tracking-widest">{post.comments?.length || 0} réponse{(post.comments?.length || 0) > 1 ? 's' : ''}</p>

            {paginated.length === 0 ? (
                <div className="text-center py-10 text-theme-text-secondary text-xs font-bold uppercase tracking-widest">Aucun commentaire</div>
            ) : (
                <div className="space-y-4">
                    {paginated.map(comment => (
                        <CommentCard
                            key={comment.id}
                            comment={comment}
                            depth={0}
                            userProfile={userProfile}
                            onReply={onReply}
                            onReact={onReact}
                            onSelect={onSelectThread}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            isSelected={false}
                        />
                    ))}
                    {hasMore && (
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="w-full py-3 bg-theme-surface border border-theme-border rounded-xl text-[9px] font-black text-theme-accent-start uppercase tracking-widest hover:bg-theme-surface-hover transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                            <ChevronDown className="w-4 h-4" /> Voir plus ({roots.length - paginated.length} restants)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
