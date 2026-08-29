import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { countReactionsByType, getReactionType, timeAgo } from './utils';
import { PAGE_SIZE } from './constants';
import type { Post } from './types';

interface TabReactionsProps {
    post: Post;
}

export const TabReactions = ({ post }: TabReactionsProps) => {
    const [activeType, setActiveType] = useState<string>('all');
    const [page, setPage] = useState(1);

    const filtered = activeType === 'all'
        ? post.reactions
        : post.reactions.filter(r => r.type === activeType);
    const paginated = filtered.slice(0, page * PAGE_SIZE);
    const hasMore = paginated.length < filtered.length;
    const counts = countReactionsByType(post.reactions);
    const loadLabel = page === 1 ? 'Voir plus' : 'Voir encore plus';

    return (
        <div className="space-y-4">
            {/* Filtre onglets */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                    onClick={() => { setActiveType('all'); setPage(1); }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${activeType === 'all' ? 'bg-theme-accent-start text-white border-theme-accent-start' : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'}`}
                >
                    Tous ({post.reactions?.length || 0})
                </button>
                {counts.map(c => (
                    <button
                        key={c.type}
                        onClick={() => { setActiveType(c.type); setPage(1); }}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 ${activeType === c.type ? 'bg-theme-accent-start text-white border-theme-accent-start' : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'}`}
                    >
                        <c.icon className="w-4 h-4" /> {c.count}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {filtered.length === 0 ? (
                <div className="text-center py-10 text-theme-text-secondary text-xs font-bold uppercase tracking-widest">Aucune réaction</div>
            ) : (
                <div className="space-y-2">
                    {paginated.map(r => {
                        const reactionType = getReactionType(r.type);
                        return (
                            <div key={r.id} className="flex items-center gap-3 bg-theme-surface border border-theme-border rounded-xl p-3">
                                <reactionType.icon className="w-5 h-5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-theme-text-primary capitalize truncate">
                                        {r.user?.prenom} {r.user?.nom}
                                    </p>
                                    {activeType !== 'all' && (
                                        <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">
                                            {reactionType.label}
                                        </p>
                                    )}
                                </div>
                                <p className="text-[8px] text-theme-text-secondary shrink-0">{timeAgo(r.created_at)}</p>
                            </div>
                        );
                    })}
                    {hasMore && (
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className="w-full py-3 bg-theme-surface border border-theme-border rounded-xl text-[9px] font-black text-theme-accent-start uppercase tracking-widest hover:bg-theme-surface-hover transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                            <ChevronDown className="w-4 h-4" /> {loadLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
