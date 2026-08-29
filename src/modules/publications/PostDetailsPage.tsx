import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Send, X } from 'lucide-react';
import { TabPublication } from './TabPublication';
import { TabReactions } from './TabReactions';
import { TabComments } from './TabComments';
import { TabThread } from './TabThread';
import { PublicationMedia } from './PublicationMedia';
import { TABS, MAX_REPLIES } from './constants';
import type { Post, Profile, Comment } from './types';

export const PostDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [post, setPost] = useState<Post | null>(null);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [selectedThread, setSelectedThread] = useState<Comment | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchPost = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('publications')
            .select(`
                *,
                structure:structures(*),
                author:profiles(*),
                reactions(*, user:profiles(prenom, nom, avatar_url)),
                comments(*, user:profiles(prenom, nom, avatar_url), reactions(*, user:profiles(prenom, nom, avatar_url)))
            `)
            .eq('id', id)
            .single();
        if (error) {
            console.error("Erreur lors de la récupération de la publication:", error);
            showNotification("Erreur lors de la récupération de la publication.", 'error');
        } else {
            setPost(data as Post);
        }
        setLoading(false);
    }, [id, showNotification]);

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (pData) {
                    const { data: uData } = await supabase.from('utilisateurs').select('role').eq('id', user.id).single();
                    setUserProfile({
                        ...pData,
                        utilisateurs: uData ? { role: uData.role } : undefined
                    });
                }
            }
            await fetchPost();
        };
        loadData();
    }, [id, fetchPost]);

    const handleReaction = async (type: string) => {
        if (!userProfile) {
            showNotification("Vous devez être connecté pour ajouter une réaction.", "error");
            return;
        }

        const myReaction = post?.reactions?.find(r => r.user_id === userProfile.id);

        if (myReaction && myReaction.type === type) {
            const { error } = await supabase.from('reactions').delete().eq('id', myReaction.id);
            if (error) {
                console.error("Erreur suppression réaction:", error);
                showNotification("Erreur suppression réaction", 'error');
            } else {
                await fetchPost();
            }
        } else {
            const { error } = await supabase.from('reactions').upsert(
                {
                    publication_id: id,
                    comment_id: null,
                    user_id: userProfile.id,
                    type: type
                },
                { onConflict: 'user_id, publication_id' }
            );

            if (error) {
                console.error("Détail de l'erreur Supabase (handleReaction):", error);
                showNotification(`Erreur création réaction: ${error.message}`, 'error');
            } else {
                if (post?.author_id && post.author_id !== userProfile.id) {
                    await supabase.from('notifications').insert({
                        user_id: post.author_id,
                        actor_id: userProfile.id,
                        title: 'Nouvelle réaction',
                        content: `${userProfile.prenom} ${userProfile.nom} a réagi à votre publication.`,
                        type: 'publication_like',
                        entity_type: 'publication',
                        entity_id: id,
                        is_read: false
                    });
                }
                await fetchPost();
            }
        }
    };

    const handleCommentReaction = async (commentId: string, type: string) => {
        if (!userProfile) {
            showNotification("Vous devez être connecté pour réagir.", "error");
            return;
        }

        const myReaction = post?.comments?.find(c => c.id === commentId)?.reactions?.find(r => r.user_id === userProfile.id);

        if (myReaction && myReaction.type === type) {
            const { error } = await supabase.from('reactions').delete().eq('id', myReaction.id);
            if (error) {
                console.error("Erreur suppression réaction commentaire:", error);
                showNotification("Erreur suppression réaction commentaire", 'error');
            } else {
                await fetchPost();
            }
        } else {
            const { error } = await supabase.from('reactions').upsert(
                {
                    comment_id: commentId,
                    publication_id: null,
                    user_id: userProfile.id,
                    type: type
                },
                { onConflict: 'user_id, comment_id' }
            );

            if (error) {
                console.error("Détail de l'erreur Supabase (handleCommentReaction):", error);
                showNotification(`Erreur réaction commentaire: ${error.message}`, 'error');
            } else {
                const comment = post?.comments?.find(c => c.id === commentId);
                if (comment?.user_id && comment.user_id !== userProfile.id) {
                    await supabase.from('notifications').insert({
                        user_id: comment.user_id,
                        actor_id: userProfile.id,
                        title: 'Réaction à votre commentaire',
                        content: `${userProfile.prenom} ${userProfile.nom} a réagi à votre commentaire.`,
                        type: 'publication_like',
                        entity_type: 'publication',
                        entity_id: id,
                        is_read: false
                    });
                }
                await fetchPost();
            }
        }
    };

    const handleComment = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!newComment.trim() || !userProfile || !post) return;
        if (replyTo) {
            const siblings = (post?.comments || []).filter(c => c.parent_id === replyTo.id);
            if (siblings.length >= MAX_REPLIES) {
                showNotification(`Maximum ${MAX_REPLIES} réponses atteint.`, 'error');
                return;
            }
        }
        const { error } = await supabase.from('comments').insert({
            publication_id: id,
            user_id: userProfile.id,
            content: newComment,
            parent_id: replyTo?.id || null
        });
        if (error) {
            console.error("Erreur ajout commentaire:", error);
            showNotification("Erreur commentaire", 'error');
        } else {
            setNewComment('');
            setReplyTo(null);
            showNotification("Commentaire ajouté !", 'success');
            
            if (post.author_id && post.author_id !== userProfile.id) {
                await supabase.from('notifications').insert({
                    user_id: post.author_id,
                    actor_id: userProfile.id,
                    title: 'Nouveau commentaire',
                    content: `${userProfile.prenom} ${userProfile.nom} a commenté votre publication.`,
                    type: 'publication_comment',
                    entity_type: 'publication',
                    entity_id: id,
                    is_read: false
                });
            }

            if (replyTo?.user_id && replyTo.user_id !== userProfile.id && replyTo.user_id !== post.author_id) {
                await supabase.from('notifications').insert({
                    user_id: replyTo.user_id,
                    actor_id: userProfile.id,
                    title: 'Réponse à votre commentaire',
                    content: `${userProfile.prenom} ${userProfile.nom} a répondu à votre commentaire.`,
                    type: 'publication_comment',
                    entity_type: 'publication',
                    entity_id: id,
                    is_read: false
                });
            }
            await fetchPost();
        }
    };

    const handleReplyClick = (comment: Comment) => {
        setReplyTo(comment);
        inputRef.current?.focus();
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const handleSelectThread = (comment: Comment) => {
        setSelectedThread(comment);
        setActiveTab(3);
    };

    const handleEditComment = async (commentId: string, content: string) => {
        const { error } = await supabase.from('comments').update({ content }).eq('id', commentId).single();
        if (error) {
            console.error("Erreur modification commentaire:", error);
            showNotification("Impossible de modifier le commentaire.", 'error');
            return false;
        }
        await fetchPost();
        showNotification("Commentaire modifié.", 'success');
        return true;
    };

    const handleDeleteComment = async (commentId: string) => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId).single();
        if (error) {
            console.error("Erreur suppression commentaire:", error);
            showNotification("Impossible de supprimer le commentaire.", 'error');
            return false;
        }
        if (selectedThread?.id === commentId) setSelectedThread(null);
        await fetchPost();
        showNotification("Commentaire supprimé.", 'success');
        return true;
    };

    const handleCommentTabClick = () => {
        setActiveTab(2);
        setTimeout(() => inputRef.current?.focus(), 300);
    };

    if (loading) return <PageLoader />;
    if (!post) return <div className="p-10 text-center font-black uppercase text-theme-text-secondary">Publication introuvable</div>;

    const hasMedia = post.media_items && post.media_items.length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col md:flex-row bg-theme-bg overflow-hidden transition-theme text-theme-text-primary font-sans">
            {/* Zone Media (cachée sur mobile, visible sur desktop si media) */}
            {hasMedia && (
                <div className="hidden md:flex flex-1 bg-black items-center justify-center relative">
                    <PublicationMedia mediaItems={post.media_items} className="w-full h-full" />
                </div>
            )}

            {/* Zone d'interaction (droite) */}
            <div className={`flex flex-col h-full w-full bg-theme-bg/95 shadow-2xl relative ${hasMedia ? 'md:w-[450px] lg:w-[500px] md:border-l md:border-white/10' : 'md:max-w-2xl md:mx-auto md:border-x md:border-white/10'}`}>
                {/* Navigation unifiée (Header + Onglets) */}
                <header className="shrink-0 bg-theme-surface/60 backdrop-blur-2xl border-b border-white/10 transition-theme">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-theme-text-primary transition-colors cursor-pointer shadow-sm">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="flex-1 overflow-x-auto">
                            <div className="inline-flex min-w-full items-center gap-1">
                                {TABS.map((tab, i) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(i)}
                                            className={`flex flex-col items-center gap-1 py-3 px-3 text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer border-b-2 ${activeTab === i ? 'border-theme-accent-start text-theme-accent-start bg-theme-accent-start/10' : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:bg-white/5'}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenu onglet */}
                <main className="flex-1 overflow-y-auto flex flex-col">
                {activeTab === 0 && (
                    <div className="flex flex-col flex-1">
                        <TabPublication
                            post={post}
                            userProfile={userProfile}
                            onReact={handleReaction}
                            onCommentClick={handleCommentTabClick}
                        />
                    </div>
                )}
                {activeTab === 1 && <div className="p-4 md:p-6 pb-32"><TabReactions post={post} /></div>}
                {activeTab === 2 && (
                    <div className="p-4 md:p-6 pb-32">
                        <TabComments
                            post={post}
                            userProfile={userProfile}
                            onReply={handleReplyClick}
                            onReact={handleCommentReaction}
                            onSelectThread={handleSelectThread}
                            onDelete={handleDeleteComment}
                            onEdit={handleEditComment}
                        />
                    </div>
                )}
                {activeTab === 3 && (
                    <div className="p-4 md:p-6 pb-32">
                        <TabThread
                            selectedComment={selectedThread}
                            post={post}
                            userProfile={userProfile}
                            onReply={handleReplyClick}
                            onReact={handleCommentReaction}
                            onDelete={handleDeleteComment}
                            onEdit={handleEditComment}
                        />
                    </div>
                )}
            </main>

            {/* Barre commentaire fixe */}
            {(activeTab === 2 || activeTab === 3) && (
                <div className="absolute bottom-0 left-0 right-0 bg-theme-surface/60 backdrop-blur-2xl border-t border-white/10 p-3 z-40 transition-theme">
                    <form onSubmit={handleComment} className="w-full space-y-2">
                        {replyTo && (
                            <div className="px-3 py-1.5 bg-theme-accent-start/10 border border-theme-accent-start/20 rounded-xl flex items-center justify-between">
                                <p className="text-[8px] font-black text-theme-accent-start uppercase tracking-widest">
                                    Réponse - {replyTo.user?.prenom} - {(post.comments || []).filter(c => c.parent_id === replyTo.id).length}/{MAX_REPLIES} réponses
                                </p>
                                <button type="button" onClick={() => setReplyTo(null)} className="text-theme-text-secondary hover:text-theme-text-primary cursor-pointer">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder={replyTo ? `Répondre - ${replyTo.user?.prenom}...` : "Votre réponse..."}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 focus:border-theme-accent-start/30 transition-all outline-none placeholder:text-theme-text-secondary/40"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="w-11 h-11 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-xl flex items-center justify-center shadow-lg shadow-theme-accent-start/20 active:scale-95 hover:scale-[1.05] transition-all cursor-pointer"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
            </div>
        </div>
    );
};