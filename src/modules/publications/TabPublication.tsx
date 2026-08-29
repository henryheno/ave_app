import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Copy, X, Smartphone, Globe, AtSign, Clock } from 'lucide-react';
import { useNotification } from '../../monapp/NotificationContext';
import { timeAgo } from './utils';
import { REACTION_TYPES } from './constants';
import type { Post, Profile } from './types';
import { PublicationMedia } from './PublicationMedia';

interface TabPublicationProps {
    post: Post;
    userProfile: Profile | null;
    onReact: (type: string) => void;
    onCommentClick: () => void;
    hideMedia?: boolean;
}

export const TabPublication = ({
    post,
    userProfile,
    onReact,
    onCommentClick,
    hideMedia
}: TabPublicationProps) => {
    const { showNotification } = useNotification();
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [contentLevel, setContentLevel] = useState(0);

    const handleReactionPointerUp = () => {
        onReact("j'aime");
    };

    // Niveaux d'expansion du contenu principal
    const CONTENT_CUTOFFS = [300, 700, 1200];
    const contentLimit = contentLevel < CONTENT_CUTOFFS.length ? CONTENT_CUTOFFS[contentLevel] : Infinity;
    const isContentTruncated = post.content.length > contentLimit;
    const displayedContent = isContentTruncated
        ? `${post.content.slice(0, contentLimit).trimEnd()}…`
        : post.content;
    const contentButtonLabel = (() => {
        if (!isContentTruncated && contentLevel > 0) return 'Voir moins';
        if (contentLevel === 0) return 'Voir plus';
        if (contentLevel === 1) return 'Voir encore plus';
        return 'Tout voir';
    })();
    const showContentBtn = post.content.length > CONTENT_CUTOFFS[0];
    const myReaction = post.reactions?.find(r => r.user_id === userProfile?.id);
    const myReactionConfig = myReaction ? REACTION_TYPES.find(r => r.type === myReaction.type) : null;
    const ReactionIcon = myReactionConfig?.icon || Heart;

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const copyToClipboard = async () => {
        const url = window.location.href;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                showNotification('Lien copié dans le presse-papiers', 'success');
            } else {
                // Fallback for non-HTTPS or older browsers
                const textArea = document.createElement("textarea");
                textArea.value = url;
                // Avoid scrolling to bottom
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showNotification('Lien copié dans le presse-papiers', 'success');
                    } else {
                        showNotification('Impossible de copier le lien', 'error');
                    }
                } catch (err) {
                    showNotification('Erreur lors de la copie', 'error');
                }
                document.body.removeChild(textArea);
            }
        } catch (error) {
            showNotification('Impossible de copier le lien', 'error');
        }
        setIsShareModalOpen(false);
    };

    const shareNative = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: post.structure?.name || 'Publication', text: post.content.slice(0, 120), url });
                setIsShareModalOpen(false);
            } catch (error) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    copyToClipboard();
                }
            }
        } else {
            copyToClipboard();
        }
    };

    const shareUrl = (platform: string) => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Regardez ceci : ${post.structure?.name || 'Publication'}`);
        let shareLink = '';

        switch (platform) {
            case 'whatsapp':
                shareLink = `https://wa.me/?text=${text}%20${url}`;
                break;
            case 'facebook':
                shareLink = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareLink = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
        }

        if (shareLink) {
            window.open(shareLink, '_blank', 'noopener,noreferrer');
            setIsShareModalOpen(false);
        }
    };

    return (
        <div className="flex flex-col min-h-full px-4 pt-4 pb-4 gap-3">
            {/* ═══════════════════════════════════════════════════════
                CARTE DE PUBLICATION — Glassmorphism Premium
               ═══════════════════════════════════════════════════════ */}
            <div className="bg-theme-surface/60 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl transition-all hover:shadow-theme-accent-start/5 overflow-hidden flex flex-col flex-1">
                {/* Author Info */}
                <div className="flex items-start justify-between gap-4 p-5 border-b border-white/5">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-theme-accent-start/30 bg-theme-surface shrink-0">
                            <img loading="lazy"
                                src="/logo2.webp"
                                alt="Logo publication"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-black text-theme-text-primary text-base truncate leading-tight">
                                {post.structure?.name}
                            </h2>
                            <p className="text-[11px] text-theme-text-secondary truncate mt-0.5">
                                {post.author ? `est avec ${post.author.prenom} ${post.author.nom}` : 'Publication sans auteur'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-theme-text-secondary/70 flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="w-3 h-3" /> {timeAgo(post.created_at)}
                        </p>
                        <Link
                            to={post.author?.id ? `/profil/${post.author.id}` : '/profil'}
                            className="text-[10px] text-theme-accent-start font-bold hover:underline transition-colors"
                        >
                            {post.author ? `${post.author.prenom} ${post.author.nom}` : '...' }
                        </Link>
                    </div>
                </div>

                {/* Zone de contenu (occupe l'espace disponible) */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Contenu texte */}
                    <div className="p-5 space-y-3">
                        <p className="text-theme-text-primary text-[14px] leading-relaxed whitespace-pre-wrap font-medium">{displayedContent}</p>
                        {showContentBtn && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isContentTruncated && contentLevel > 0) {
                                        setContentLevel(0);
                                    } else if (contentLevel < CONTENT_CUTOFFS.length) {
                                        setContentLevel(l => l + 1);
                                    }
                                }}
                                className="text-[10px] font-black text-theme-accent-start uppercase tracking-wider hover:underline cursor-pointer"
                            >
                                {contentButtonLabel}
                            </button>
                        )}
                    </div>

                    {/* Médias — affichés sur TOUS les écrans */}
                    {!hideMedia && post.media_items?.length > 0 && (
                        <PublicationMedia mediaItems={post.media_items} className="" />
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                BOUTONS D'ACTION — EN DESSOUS de la carte
               ═══════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-around py-3 px-2 bg-theme-surface/40 backdrop-blur-md border border-white/10 rounded-2xl">
                {/* J'aime */}
                <button
                    onClick={handleReactionPointerUp}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${myReaction ? 'bg-theme-accent-start/15 text-theme-accent-start shadow-sm' : 'text-theme-text-secondary hover:bg-white/5 hover:text-theme-accent-start'}`}
                >
                    <ReactionIcon className={`w-5 h-5 ${myReaction ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        {post.reactions?.length || 0}
                    </span>
                </button>

                {/* Commenter */}
                <button
                    onClick={onCommentClick}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-theme-text-secondary hover:bg-white/5 hover:text-theme-accent-start transition-all cursor-pointer"
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        {post.comments?.length || 0}
                    </span>
                </button>

                {/* Partager */}
                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-theme-text-secondary hover:bg-white/5 hover:text-theme-accent-start transition-all cursor-pointer"
                >
                    <Share2 className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                        Partager
                    </span>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════
                MODAL DE PARTAGE — Glassmorphism
               ═══════════════════════════════════════════════════════ */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setIsShareModalOpen(false)}>
                    <div className="bg-theme-surface/80 backdrop-blur-2xl w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-white/5">
                            <h3 className="font-black text-theme-text-primary text-sm uppercase tracking-widest">Partager via</h3>
                            <button onClick={() => setIsShareModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-theme-text-secondary transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 grid grid-cols-4 gap-4">
                            <button onClick={() => shareUrl('whatsapp')} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                                <div className="w-14 h-14 bg-[#25D366]/10 text-[#25D366] rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-[#25D366]/20 transition-all">
                                    <MessageCircle className="w-6 h-6" />
                                </div>
                                <span className="text-[9px] font-bold text-theme-text-secondary group-hover:text-theme-text-primary transition-colors">WhatsApp</span>
                            </button>
                            <button onClick={() => shareUrl('facebook')} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                                <div className="w-14 h-14 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-[#1877F2]/20 transition-all">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <span className="text-[9px] font-bold text-theme-text-secondary group-hover:text-theme-text-primary transition-colors">Facebook</span>
                            </button>
                            <button onClick={() => shareUrl('twitter')} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                                <div className="w-14 h-14 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-[#1DA1F2]/20 transition-all">
                                    <AtSign className="w-6 h-6" />
                                </div>
                                <span className="text-[9px] font-bold text-theme-text-secondary group-hover:text-theme-text-primary transition-colors">Twitter</span>
                            </button>
                            <button onClick={copyToClipboard} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                                <div className="w-14 h-14 bg-white/5 border border-white/10 text-theme-text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-white/10 transition-all">
                                    <Copy className="w-6 h-6" />
                                </div>
                                <span className="text-[9px] font-bold text-theme-text-secondary group-hover:text-theme-text-primary transition-colors">Copier</span>
                            </button>
                        </div>
                        {!!navigator.share && (
                            <div className="p-4 border-t border-white/5">
                                <button onClick={shareNative} className="w-full py-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] text-theme-text-primary uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer">
                                    <Smartphone className="w-4 h-4" /> Partage Système Natif
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};