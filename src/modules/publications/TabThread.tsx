import { MessageCircle } from 'lucide-react';
import { CommentCard } from './CommentCard';
import { buildTree } from './utils';
import type { Post, Profile, Comment } from './types';

interface TabThreadProps {
    selectedComment: Comment | null;
    post: Post;
    userProfile: Profile | null;
    onReply: (c: Comment) => void;
    onReact: (commentId: string, type: string) => void;
    onDelete: (commentId: string) => Promise<boolean>;
    onEdit: (commentId: string, content: string) => Promise<boolean>;
}

export const TabThread = ({
    selectedComment,
    post,
    userProfile,
    onReply,
    onReact,
    onDelete,
    onEdit
}: TabThreadProps) => {
    if (!selectedComment) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-theme-text-secondary">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-[11px] font-black uppercase tracking-widest text-center">Sélectionne un commentaire<br/>dans l'onglet Commentaires</p>
            </div>
        );
    }

    const tree = buildTree(post.comments || []);
    const rootComment = tree.find(c => c.id === selectedComment.id)
        || (() => {
            const allComments = post.comments || [];
            const findRoot = (id: string): Comment | undefined => {
                const c = allComments.find(x => x.id === id);
                if (!c) return undefined;
                if (!c.parent_id) return tree.find(t => t.id === c.id);
                return findRoot(c.parent_id);
            };
            return findRoot(selectedComment.id);
        })();

    if (!rootComment) return null;

    return (
        <div className="space-y-4">
            <p className="text-[9px] text-theme-text-secondary font-black uppercase tracking-widest">Fil de discussion</p>
            <CommentCard
                comment={rootComment}
                depth={0}
                userProfile={userProfile}
                onReply={onReply}
                onReact={onReact}
                onSelect={() => {}}
                onDelete={onDelete}
                onEdit={onEdit}
                isSelected={rootComment.id === selectedComment.id}
            />
        </div>
    );
};
