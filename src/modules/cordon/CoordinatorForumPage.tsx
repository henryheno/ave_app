import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { getCurrentProfile } from '../../lib/profileCache';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, Loader2, Trash2, CornerDownRight, X, ArrowUp, Info, Edit2, Paperclip, Mic, MicOff } from 'lucide-react';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';

import { cleanLegacyReply, MessageContent, SwipeableMessage } from './components/ForumMessageBubble';
import { MessageActionsModal, MessageDetailsModal } from './components/ForumMessageModal';
import { ForumAttachMentionModal } from './components/ForumAttachMentionModal';

interface ForumMessage {
    id: string;
    author_id: string;
    content: string;
    reply_to_id: string | null;
    created_at: string;
    is_edited?: boolean;
    is_pinned?: boolean;
    attachments?: any[];
    author: {
        role: string | null;
        profile: { id: string; nom: string; prenom: string; avatar_url?: string } | null;
        structure: { id: string; name: string; type: string } | null;
    };
    reactions?: any[];
    reads?: any[];
}

export interface ForumUser {
    id: string;
    label: string;
    structLabel: string;
    mentionTag: string;
}

export const CoordinatorForumPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<ForumMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [replyTo, setReplyTo] = useState<ForumMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ForumMessage | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<ForumMessage | null>(null);
    const [detailsMessage, setDetailsMessage] = useState<ForumMessage | null>(null);
    const [usersDirectory, setUsersDirectory] = useState<ForumUser[]>([]);
    const [mentionSearch, setMentionSearch] = useState<{ active: boolean, text: string, index: number } | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    // Attachement et mentions modal
    const [showAttachModal, setShowAttachModal] = useState(false);
    const [attachModalMode, setAttachModalMode] = useState<'mention' | 'file'>('mention');
    const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
    // Enregistrement vocal
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    // Helper to build label "Cordon de [type] [name]"
    const getCordonLabel = (author: ForumMessage['author']) => {
        if (!author?.structure) return author?.profile ? `${author.profile.prenom} ${author.profile.nom}` : 'Inconnu';
        return `Cordon de ${author.structure.type} ${author.structure.name}`;
    };

    const getInitials = (author: ForumMessage['author']) => {
        const p = author?.profile;
        if (!p) return '??';
        return `${p.prenom?.[0] ?? ''}${p.nom?.[0] ?? ''}`;
    };

    const enrichMessages = async (rawMessages: any[]): Promise<ForumMessage[]> => {
        if (!rawMessages.length) return [];

        const authorIds = [...new Set(rawMessages.map(m => m.author_id))] as string[];

        const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
            supabase.from('profiles').select('id, nom, prenom, avatar_url, coordinated_structure_id').in('id', authorIds),
            supabase.from('utilisateurs').select('id, role').in('id', authorIds),
        ]);

        // Get structures for coordinated_structure_id
        const structureIds = [...new Set(
            (profilesData || []).map(p => p.coordinated_structure_id).filter(Boolean)
        )] as string[];

        let structureMap: Record<string, any> = {};
        if (structureIds.length > 0) {
            const allStructures = await getStructures();
            structureMap = Object.fromEntries(
                allStructures.filter(s => structureIds.includes(s.id)).map(s => [s.id, s])
            );
        }

        const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
        const roleMap = Object.fromEntries((rolesData || []).map(u => [u.id, u.role]));

        return rawMessages.map(m => ({
            ...m,
            reply_to_id: m.reply_to_id ?? null,
            is_edited: m.is_edited ?? false,
            is_pinned: m.is_pinned ?? false,
            attachments: m.attachments || [],
            reactions: m.coordon_forum_reactions || [],
            reads: m.coordon_forum_reads || [],
            author: {
                role: roleMap[m.author_id] || null,
                profile: profileMap[m.author_id] || null,
                structure: profileMap[m.author_id]?.coordinated_structure_id
                    ? structureMap[profileMap[m.author_id].coordinated_structure_id] || null
                    : null,
            }
        }));
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/auth'); return; }

            const profile = await getCurrentProfile();
            setUserProfile(profile);

            // Charger l'annuaire des utilisateurs pour mentions et vues
            const { data: usersData } = await supabase.from('profiles').select('id, nom, prenom, avatar_url, coordinated_structure_id');
            const { data: rolesData } = await supabase.from('utilisateurs').select('id, role').in('role', ['admin', 'superadmin', 'coordon']);
            const allStructures = await getStructures();
            const structMap = Object.fromEntries(allStructures.map(s => [s.id, s]));

            const validIds = new Set(rolesData?.map(r => r.id) || []);
            const dir: ForumUser[] = (usersData || [])
                .filter(u => validIds.has(u.id))
                .map(u => {
                    const s = u.coordinated_structure_id ? structMap[u.coordinated_structure_id] : null;
                    const structLabel = s ? `Cordon de ${s.type} ${s.name}` : (rolesData?.find(r => r.id === u.id)?.role === 'admin' ? 'Admin' : 'Utilisateur');
                    const name = `${u.prenom || ''} ${u.nom || ''}`.trim() || 'Inconnu';
                    return {
                        id: u.id,
                        label: name,
                        structLabel,
                        mentionTag: `@[${structLabel} - ${name}]`
                    };
                });
            setUsersDirectory(dir);

            if (profile) {
                await fetchMessages(profile.id);
            }
            setLoading(false);
        };
        init();

        // Écoute temps réel : Messages
        const channel = supabase
            .channel('coordon_forum_rt')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coordon_forum_messages' },
                async (payload) => {
                    const newMsg = { ...payload.new, coordon_forum_reactions: [], coordon_forum_reads: [] };
                    const enriched = await enrichMessages([newMsg]);
                    setMessages(prev => {
                        if (prev.some(m => m.id === enriched[0].id)) return prev;
                        return [...prev, enriched[0]];
                    });
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coordon_forum_messages' },
                (payload) => {
                    setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                }
            )
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'coordon_forum_messages' },
                (payload) => {
                    setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                }
            )
            // Écoute temps réel : Réactions
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coordon_forum_reactions' },
                (payload) => {
                    setMessages(prev => prev.map(m => m.id === payload.new.message_id ? { ...m, reactions: [...(m.reactions || []), payload.new] } : m));
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'coordon_forum_reactions' },
                (payload) => {
                    setMessages(prev => prev.map(m => m.id === payload.new.message_id ? {
                        ...m,
                        reactions: m.reactions?.map(r => r.id === payload.new.id ? payload.new : r)
                    } : m));
                }
            )
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'coordon_forum_reactions' },
                (payload) => {
                    setMessages(prev => prev.map(m => ({ ...m, reactions: m.reactions?.filter(r => r.id !== payload.old.id) })));
                }
            )
            // Écoute temps réel : Vues
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coordon_forum_reads' },
                (payload) => {
                    setMessages(prev => prev.map(m => m.id === payload.new.message_id ? { ...m, reads: [...(m.reads || []), payload.new] } : m));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchMessages = async (userId?: string) => {
        const { data: msgData, error } = await supabase
            .from('coordon_forum_messages')
            .select('*, coordon_forum_reactions(*), coordon_forum_reads(*)')
            .order('created_at', { ascending: true });

        if (error || !msgData) return;
        const enriched = await enrichMessages(msgData);
        setMessages(enriched);

        // Marquer comme lu
        const currentUserId = userId || userProfile?.id;
        if (currentUserId) {
            const unreadIds = enriched.filter(m => !m.reads?.some(r => r.user_id === currentUserId)).map(m => m.id);
            if (unreadIds.length > 0) {
                await supabase.from('coordon_forum_reads').insert(
                    unreadIds.map(id => ({ message_id: id, user_id: currentUserId }))
                );
            }
        }
    };

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [messages.length]);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        setShowScrollTop(target.scrollTop > 300);
    };

    const scrollToTop = () => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !pendingAttachment && !audioBlob) || !userProfile) return;

        setIsSending(true);

        const uploadedAttachments: any[] = [];
        try {
            if (pendingAttachment) {
                const fileName = `${Date.now()}_${pendingAttachment.name}`;
                const { data, error } = await supabase.storage.from('forum_attachments').upload(fileName, pendingAttachment);
                if (!error && data) {
                    const { data: { publicUrl } } = supabase.storage.from('forum_attachments').getPublicUrl(fileName);
                    const isImage = pendingAttachment.type.startsWith('image/');
                    uploadedAttachments.push({ type: isImage ? 'image' : 'document', url: publicUrl, name: pendingAttachment.name });
                }
            }

            if (audioBlob) {
                const fileName = `${Date.now()}_audio.webm`;
                const { data, error } = await supabase.storage.from('forum_attachments').upload(fileName, audioBlob);
                if (!error && data) {
                    const { data: { publicUrl } } = supabase.storage.from('forum_attachments').getPublicUrl(fileName);
                    uploadedAttachments.push({ type: 'audio', url: publicUrl, name: 'Note vocale' });
                }
            }
        } catch (err) {
            console.error("Erreur lors de l'upload", err);
        }

        if (editingMessage) {
            const { error } = await supabase
                .from('coordon_forum_messages')
                .update({ content: input.trim(), is_edited: true, updated_at: new Date().toISOString() })
                .eq('id', editingMessage.id);

            if (error) {
                console.error(error);
                showNotification("Erreur lors de la modification", 'error');
            } else {
                setInput('');
                setEditingMessage(null);
            }
        } else {
            const { error } = await supabase
                .from('coordon_forum_messages')
                .insert({
                    author_id: userProfile.id,
                    content: input.trim(),
                    reply_to_id: replyTo?.id ?? null,
                    attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
                });

            if (error) {
                console.error(error);
                showNotification("Erreur lors de l'envoi du message", 'error');
            } else {
                setInput('');
                setReplyTo(null);
                setPendingAttachment(null);
                setAudioBlob(null);
            }
        }
        setIsSending(false);
    };

    const handleEdit = (msg: ForumMessage) => {
        setEditingMessage(msg);
        setInput(msg.content);
        setSelectedMessage(null);
        inputRef.current?.focus();
    };

    const handleDelete = async (messageId: string) => {
        const { error } = await supabase
            .from('coordon_forum_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            showNotification("Erreur lors de la suppression", 'error');
        } else {
            setMessages(prev => prev.filter(m => m.id !== messageId));
            setSelectedMessage(null);
        }
    };

    const handleReply = (msg: ForumMessage) => {
        setReplyTo(msg);
        setSelectedMessage(null);
        inputRef.current?.focus();
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!userProfile) return;

        // Chercher toute réaction existante de cet utilisateur sur ce message (peu importe l'emoji)
        const existingReaction = messages.find(m => m.id === messageId)?.reactions?.find(r => r.user_id === userProfile.id);

        if (existingReaction) {
            if (existingReaction.reaction === emoji) {
                // Même réaction → on la retire (toggle off)
                await supabase.from('coordon_forum_reactions').delete().match({ message_id: messageId, user_id: userProfile.id });
            } else {
                // Réaction différente → on met à jour (replace)
                await supabase.from('coordon_forum_reactions')
                    .update({ reaction: emoji })
                    .match({ message_id: messageId, user_id: userProfile.id });
            }
        } else {
            // Pas encore réagi → on insère
            await supabase.from('coordon_forum_reactions').insert({ message_id: messageId, user_id: userProfile.id, reaction: emoji });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        // Auto-resize du textarea
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }

        // Détection @ pour ouvrir modal
        const cursor = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursor);
        const match = textBeforeCursor.match(/@([a-zA-Z0-\u00ff\s-]*)$/);

        if (match) {
            setMentionSearch({ active: true, text: match[1].toLowerCase(), index: cursor - match[1].length - 1 });
            // Ouvrir le modal au lieu du dropdown
            setAttachModalMode('mention');
            setShowAttachModal(true);
        } else {
            setMentionSearch(null);
        }
    };

    const insertMentions = (users: ForumUser[]) => {
        if (mentionSearch) {
            // Remplacer le @ partiel par toutes les mentions sélectionnées
            const before = input.slice(0, mentionSearch.index);
            const after = input.slice(inputRef.current?.selectionStart || input.length);
            const mentionText = users.map(u => u.mentionTag).join(' ');
            setInput(`${before}${mentionText} ${after}`);
        } else {
            // Injecter les mentions à la position courante
            const cursor = inputRef.current?.selectionStart || input.length;
            const before = input.slice(0, cursor);
            const after = input.slice(cursor);
            const mentionText = users.map(u => u.mentionTag).join(' ');
            setInput(`${before}${mentionText} ${after}`);
        }
        setMentionSearch(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch {
            showNotification("Microphone non accessible", 'error');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg flex flex-col font-sans transition-theme h-screen overflow-hidden">
            {/* HEADER */}
            <header className="bg-theme-bg/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 transition-theme shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/cordon')}
                        className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
                    <div>
                        <h1 className="font-black text-theme-text-primary text-sm uppercase tracking-tighter">Forum des Coordonnateurs</h1>
                        <p className="text-[9px] font-bold text-theme-accent-end uppercase tracking-widest">Espace d'échange exclusif</p>
                    </div>
                </div>
            </header>

            {/* MESSAGES */}
            <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3 relative scroll-smooth">
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        className="fixed bottom-24 right-6 w-11 h-11 bg-theme-surface border border-theme-border rounded-full flex items-center justify-center text-theme-text-primary shadow-lg shadow-theme-bg hover:scale-110 hover:border-theme-accent-start transition-all z-50 cursor-pointer"
                        title="Retour en haut"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </button>
                )}
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                        <MessageSquare className="w-14 h-14 text-theme-text-secondary mb-3" />
                        <p className="text-sm font-black text-theme-text-primary uppercase">Aucun message</p>
                        <p className="text-[10px] font-bold text-theme-text-secondary uppercase mt-1">Soyez le premier à écrire sur le forum.</p>
                    </div>
                ) : (
                    (() => {
                        const groupedMessages = messages.reduce((groups, message) => {
                            const dateObj = new Date(message.created_at);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);

                            let dateStr = '';
                            if (dateObj.toDateString() === today.toDateString()) {
                                dateStr = "Aujourd'hui";
                            } else if (dateObj.toDateString() === yesterday.toDateString()) {
                                dateStr = "Hier";
                            } else {
                                dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                            }

                            if (!groups[dateStr]) groups[dateStr] = [];
                            groups[dateStr].push(message);
                            return groups;
                        }, {} as Record<string, ForumMessage[]>);

                        return Object.entries(groupedMessages).map(([dateLabel, msgs]) => (
                            <div key={dateLabel} className="flex flex-col gap-3">
                                <div className="flex justify-center my-2 sticky top-2 z-10">
                                    <span className="bg-theme-surface/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-theme-text-secondary border border-theme-border shadow-sm">
                                        {dateLabel}
                                    </span>
                                </div>
                                {msgs.map((m, index) => {
                                    const isMe = m.author_id === userProfile?.id;
                                    const label = getCordonLabel(m.author);
                                    const initials = getInitials(m.author);
                                    const isNextSameAuthor = index < msgs.length - 1 && msgs[index + 1].author_id === m.author_id;
                                    const isPrevSameAuthor = index > 0 && msgs[index - 1].author_id === m.author_id;
                                    const showAvatar = !isNextSameAuthor;
                                    const showLabel = !isPrevSameAuthor;

                                    return (
                                        <SwipeableMessage key={m.id} onSwipeLeft={() => handleReply(m)}>
                                            <div id={`msg-${m.id}`} className={`flex gap-1.5 group ${isMe ? 'justify-end' : 'justify-start'} ${isNextSameAuthor ? 'mb-0.5' : 'mb-3'}`}>
                                                {!isMe && (
                                                    <div className="w-8 shrink-0 self-end">
                                                        {showAvatar && (
                                                            <div className="w-8 h-8 rounded-xl overflow-hidden border border-theme-border shadow-sm">
                                                                {m.author?.profile?.avatar_url ? (
                                                                    <img loading="lazy" src={m.author.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-theme-surface flex items-center justify-center text-[9px] font-black text-theme-text-primary">
                                                                        {initials}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className={`flex flex-col max-w-[82%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {!isMe && showLabel && (
                                                        <span className="text-[8.5px] font-bold text-theme-text-secondary uppercase mb-0.5 mx-1 truncate max-w-full">
                                                            {label}
                                                        </span>
                                                    )}

                                                    {/* Bulle de message interactive */}
                                                    <div
                                                        onClick={() => setSelectedMessage(m)}
                                                        className={`relative p-2.5 rounded-2xl text-[13px] leading-snug whitespace-pre-wrap break-words flex flex-col gap-1.5 cursor-pointer transition-transform hover:scale-[1.01] active:scale-95 ${isMe
                                                            ? 'bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-br-sm shadow-md shadow-theme-accent-start/20'
                                                            : 'bg-theme-surface text-theme-text-primary border border-theme-border rounded-bl-sm hover:border-theme-accent-start/30 shadow-sm'
                                                            }`}>
                                                        {m.reply_to_id && (
                                                            (() => {
                                                                const repliedMsg = messages.find(msg => msg.id === m.reply_to_id);
                                                                if (!repliedMsg) return null;
                                                                return (
                                                                    <div
                                                                        className={`p-2 rounded-lg text-[10px] border-l-2 cursor-pointer transition-colors ${isMe ? 'bg-white/10 border-white/40 hover:bg-white/20 text-white/90' : 'bg-theme-bg border-theme-accent-start hover:bg-theme-bg/80 text-theme-text-secondary'
                                                                            }`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            document.getElementById(`msg-${repliedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        }}
                                                                    >
                                                                        <span className={`font-black uppercase tracking-widest block mb-0.5 ${isMe ? 'text-white' : 'text-theme-accent-start'}`}>
                                                                            {getCordonLabel(repliedMsg.author)}
                                                                        </span>
                                                                        <span className="line-clamp-2 opacity-80">{cleanLegacyReply(repliedMsg.content)}</span>
                                                                    </div>
                                                                );
                                                            })()
                                                        )}
                                                        {m.content && <MessageContent content={m.content} />}
                                                        
                                                        {/* Pièces jointes */}
                                                        {m.attachments && m.attachments.length > 0 && (
                                                            <div className="flex flex-col gap-2 mt-2">
                                                                {m.attachments.map((att, idx) => (
                                                                    <div key={idx} className="rounded-xl overflow-hidden">
                                                                        {att.type === 'image' && (
                                                                            <img loading="lazy" src={att.url} alt="Pièce jointe" className="max-w-full h-auto rounded-xl border border-theme-border/50 max-h-64 object-contain bg-black/10" />
                                                                        )}
                                                                        {att.type === 'audio' && (
                                                                            <audio src={att.url} controls className="w-full h-10" />
                                                                        )}
                                                                        {att.type === 'document' && (
                                                                            <a href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20 text-white' : 'bg-theme-bg border-theme-border hover:border-theme-accent-start/40 text-theme-text-primary'}`}>
                                                                                <Paperclip className="w-4 h-4 shrink-0" />
                                                                                <span className="text-xs font-bold truncate">{att.name || 'Document'}</span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {m.is_edited && <span className="text-[8px] opacity-70 italic font-medium ml-1 mt-1">(Modifié)</span>}

                                                        {/* Affichage des réactions et des vues */}
                                                        <div className="flex items-center justify-between mt-2">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {m.reactions && m.reactions.length > 0 && Object.entries(
                                                                    m.reactions.reduce((acc, r) => {
                                                                        acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                                                                        return acc;
                                                                    }, {} as Record<string, number>)
                                                                ).map(([emoji, count]) => (
                                                                    <span key={emoji} className={`text-[10px] bg-black/10 px-1.5 py-0.5 rounded-full flex items-center gap-1`}>
                                                                        {emoji} <span className="font-bold opacity-80">{count as number}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            {m.reads && m.reads.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[9px] text-theme-text-secondary/70 ml-2">
                                                                    <Info className="w-3 h-3" /> Vu par {m.reads.length}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions rapides */}
                                                    <div className={`flex items-center gap-3 mt-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        <span className="text-[8px] font-bold text-theme-text-secondary">
                                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>

                                                        <button
                                                            onClick={() => handleReply(m)}
                                                            className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-theme-text-secondary hover:text-theme-accent-start transition-colors cursor-pointer"
                                                        >
                                                            <CornerDownRight className="w-3 h-3" />
                                                            Répondre
                                                        </button>
                                                        {isMe && (
                                                            <button
                                                                onClick={() => handleDelete(m.id)}
                                                                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                Supprimer
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Avatar droite (moi) */}
                                                {isMe && (
                                                    <div className="w-8 shrink-0 self-end">
                                                        {showAvatar && (
                                                            <div className="w-8 h-8 rounded-xl overflow-hidden border border-theme-border shadow-sm">
                                                                {m.author?.profile?.avatar_url ? (
                                                                    <img loading="lazy" src={m.author.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-theme-accent-start to-theme-accent-end flex items-center justify-center text-[9px] font-black text-white shadow-md">
                                                                        {getInitials({ role: null, profile: userProfile, structure: null })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </SwipeableMessage>
                                    );
                                })}
                            </div>
                        ));
                    })()
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* FOOTER */}
            <footer className="bg-theme-surface/80 backdrop-blur-xl border-t border-theme-border shrink-0 transition-theme relative">
                {/* Bandeau édition */}
                {editingMessage && (
                    <div className="px-4 pt-3 pb-0 flex items-start gap-2 animate-in slide-in-from-bottom-2 duration-200">
                        <Edit2 className="w-3.5 h-3.5 text-theme-accent-start mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-accent-start">Modification du message</p>
                        </div>
                        <button onClick={() => { setEditingMessage(null); setInput(''); }} className="p-1 text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Bandeau réponse */}
                {replyTo && !editingMessage && (
                    <div className="px-4 pt-3 pb-0 flex items-start gap-2 animate-in slide-in-from-bottom-2 duration-200">
                        <CornerDownRight className="w-3.5 h-3.5 text-theme-accent-start mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-accent-start">{getCordonLabel(replyTo.author)}</p>
                            <p className="text-[10px] text-theme-text-secondary truncate">{replyTo.content.slice(0, 80)}{replyTo.content.length > 80 ? '...' : ''}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* Aperçu fichier */}
                {pendingAttachment && (
                    <div className="px-4 pt-2 pb-0 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                        <Paperclip className="w-3.5 h-3.5 text-theme-accent-start shrink-0" />
                        <p className="text-[10px] text-theme-text-secondary truncate flex-1">{pendingAttachment.name}</p>
                        <button onClick={() => setPendingAttachment(null)} className="p-1 text-theme-text-secondary hover:text-red-400 cursor-pointer">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Aperçu vocal */}
                {audioBlob && (
                    <div className="px-4 pt-2 pb-0 flex items-center gap-2 animate-in slide-in-from-bottom-2">
                        <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <audio src={URL.createObjectURL(audioBlob)} controls className="flex-1 h-8" />
                        <button onClick={() => setAudioBlob(null)} className="p-1 text-theme-text-secondary hover:text-red-400 cursor-pointer">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Indicateur enregistrement */}
                {isRecording && (
                    <div className="px-4 pt-2 pb-0 flex items-center gap-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Enregistrement en cours...</p>
                    </div>
                )}

                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-2 p-3">
                    {/* Bouton fichier */}
                    <button
                        type="button"
                        onClick={() => { setAttachModalMode('file'); setShowAttachModal(true); }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-theme-bg border border-theme-border text-theme-text-secondary hover:text-theme-accent-start hover:border-theme-accent-start/40 transition-all cursor-pointer shrink-0"
                        title="Joindre un fichier"
                    >
                        <Paperclip className="w-4.5 h-4.5" />
                    </button>

                    {/* Champ de saisie */}
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={handleInputChange}
                        placeholder={isRecording ? "Enregistrement..." : editingMessage ? "Modifiez votre message..." : replyTo ? "Écrire une réponse..." : "Écrivez un message... (@ pour mentionner)"}
                        disabled={isSending || isRecording}
                        className="flex-1 bg-theme-bg border border-theme-border rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-theme-accent-start/20 focus:border-theme-accent-start text-theme-text-primary outline-none transition-all placeholder:text-theme-text-secondary/50 disabled:opacity-50 min-h-[46px] max-h-[120px] resize-none"
                    />

                    {/* Bouton vocal */}
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${
                            isRecording
                                ? 'bg-red-500 border-red-500 text-white animate-pulse'
                                : 'bg-theme-bg border-theme-border text-theme-text-secondary hover:text-green-400 hover:border-green-400/40'
                        }`}
                        title={isRecording ? 'Arrêter l\'enregistrement' : 'Note vocale'}
                    >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Bouton envoi */}
                    <button
                        type="submit"
                        disabled={(!input.trim() && !audioBlob && !pendingAttachment) || isSending}
                        className="w-10 h-10 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-md shadow-theme-accent-start/20 flex items-center justify-center shrink-0"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </footer>

            {/* Modal Mention + Fichier */}
            {showAttachModal && (
                <ForumAttachMentionModal
                    mode={attachModalMode}
                    usersDirectory={usersDirectory}
                    onClose={() => { setShowAttachModal(false); setMentionSearch(null); }}
                    onConfirmMentions={insertMentions}
                    onConfirmFile={(file) => setPendingAttachment(file)}
                />
            )}

            {/* Modales */}
            {selectedMessage && (
                <MessageActionsModal
                    message={selectedMessage}
                    userProfile={userProfile}
                    onClose={() => setSelectedMessage(null)}
                    onReply={() => handleReply(selectedMessage)}
                    onEdit={() => handleEdit(selectedMessage)}
                    onDelete={() => handleDelete(selectedMessage.id)}
                    onDetails={() => { setDetailsMessage(selectedMessage); setSelectedMessage(null); }}
                    onReaction={(emoji) => handleReaction(selectedMessage.id, emoji)}
                />
            )}

            {detailsMessage && (
                <MessageDetailsModal
                    message={detailsMessage}
                    usersDirectory={usersDirectory}
                    onClose={() => setDetailsMessage(null)}
                />
            )}
        </div>
    );
};
