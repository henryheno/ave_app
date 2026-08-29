import { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Trash2, Filter, X, Check, CheckCheck, Menu, Home, Clock, MessageCircle, Heart, FileText, Users, ArrowRightLeft, ChevronRight, UserPlus, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';

const getNotifIcon = (type: string) => {
    switch (type) {
        case 'publication_new': return <FileText className="w-4 h-4" />;
        case 'publication_like': return <Heart className="w-4 h-4" />;
        case 'publication_comment': return <MessageCircle className="w-4 h-4" />;
        case 'transfer_request': return <ArrowRightLeft className="w-4 h-4" />;
        case 'transfer_approved': return <Check className="w-4 h-4" />;
        case 'transfer_rejected': return <X className="w-4 h-4" />;
        case 'new_member': return <Users className="w-4 h-4" />;
        case 'system': return <Bell className="w-4 h-4" />;
        case 'follow': return <UserPlus className="w-4 h-4" />;
        case 'birthday': return <Gift className="w-4 h-4" />;
        case 'birthday_wish': return <Gift className="w-4 h-4" />;
        case 'report_submitted': return <FileText className="w-4 h-4" />;
        default: return <Bell className="w-4 h-4" />;
    }
};

const getNotifColor = (type: string) => {
    switch (type) {
        case 'publication_new': return 'text-blue-400 bg-blue-500/10';
        case 'publication_like': return 'text-pink-400 bg-pink-500/10';
        case 'publication_comment': return 'text-green-400 bg-green-500/10';
        case 'transfer_request': return 'text-amber-400 bg-amber-500/10';
        case 'transfer_approved': return 'text-emerald-400 bg-emerald-500/10';
        case 'transfer_rejected': return 'text-red-400 bg-red-500/10';
        case 'new_member': return 'text-purple-400 bg-purple-500/10';
        case 'system': return 'text-indigo-400 bg-indigo-500/10';
        case 'follow': return 'text-cyan-400 bg-cyan-500/10';
        case 'birthday': return 'text-yellow-400 bg-yellow-500/10';
        case 'birthday_wish': return 'text-orange-400 bg-orange-500/10';
        case 'report_submitted': return 'text-teal-400 bg-teal-500/10';
        default: return 'text-theme-text-secondary bg-white/5';
    }
};

const getTypeLabel = (type: string) => {
    switch (type) {
        case 'publication_new': return 'Nouvelle publication';
        case 'publication_like': return 'Réaction';
        case 'publication_comment': return 'Commentaire';
        case 'transfer_request': return 'Demande de transfert';
        case 'transfer_approved': return 'Transfert approuvé';
        case 'transfer_rejected': return 'Transfert refusé';
        case 'new_member': return 'Nouveau membre';
        case 'system': return 'Système';
        case 'follow': return 'Nouvel abonné';
        case 'birthday': return 'Anniversaire';
        case 'birthday_wish': return 'Vœu d\'anniversaire';
        case 'report_submitted': return 'Rapport soumis';
        default: return type || 'Autre';
    }
};

const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const NotificationsPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { data: notifications = [], isLoading: loading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/auth');
                throw new Error('Not authenticated');
            }

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }
    });

    // REAL-TIME: Rafraîchir les notifications
    useEffect(() => {
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            
            return supabase.channel(`notifications_page_${user.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    () => {
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });
                        queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
                    }
                )
                .subscribe();
        };

        let channel: any = null;
        setupRealtime().then(ch => channel = ch);

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const typeOptions = useMemo(
        () => ['all', ...Array.from(new Set(notifications.map((n) => n.type).filter(Boolean)))] as string[],
        [notifications]
    );

    const filteredNotifications = useMemo(
        () => notifications.filter((notification) =>
            typeFilter === 'all' || notification.type === typeFilter
        ),
        [notifications, typeFilter]
    );

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.is_read).length,
        [notifications]
    );

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (!filteredNotifications.length) return;
        const allSelected = filteredNotifications.every((notification) => selectedIds.includes(notification.id));
        setSelectedIds(allSelected ? [] : filteredNotifications.map((notification) => notification.id));
    };

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
            showNotification('Toutes les notifications marquées comme lues', 'success');
            setSelectedIds([]);
        }
    };

    const markSelectedAsRead = async () => {
        if (!selectedIds.length) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', selectedIds);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
            setSelectedIds([]);
            showNotification('Notifications sélectionnées marquées comme lues', 'success');
        }
    };

    const deleteNotification = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_deleted: true })
            .eq('id', id);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
        }
    };

    const deleteSelectedNotifications = async () => {
        if (!selectedIds.length) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_deleted: true })
            .in('id', selectedIds);

        if (!error) {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
            setSelectedIds([]);
            showNotification('Notifications sélectionnées supprimées', 'success');
        }
    };

    const handleClick = async (notification: any) => {
        if (!notification.is_read) {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnread'] });
        }

        if (notification.entity_type && notification.entity_id) {
            switch (notification.entity_type) {
                case 'publication':
                    navigate(`/pub/${notification.entity_id}`);
                    break;
                case 'transfer_request':
                    navigate('/admin/transferts');
                    break;
                case 'report':
                    navigate(`/rapports/voir/${notification.entity_id}`);
                    break;
                case 'profile':
                    navigate(`/profil/${notification.entity_id}`);
                    break;
                default:
                    break;
            }
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme overflow-x-hidden">
            {/* ═══════════════════════════════════════════════════════
                TOP NAVBAR (Même style que CommunityPage)
               ═══════════════════════════════════════════════════════ */}
            <header className="bg-theme-bg/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 transition-theme">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center">
                            <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                        </div>
                        <div>
                            <span className="block font-black text-theme-text-primary text-xl leading-none uppercase tracking-tighter">Notifications</span>
                            <span className="text-[9px] font-bold text-theme-accent-end uppercase tracking-[0.3em] opacity-80">
                                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/home')}
                        className="p-3 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border"
                        title="Accueil"
                    >
                        <Home className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`p-3 rounded-xl transition-all border border-theme-border ${showSidebar ? 'bg-theme-accent-start text-white' : 'bg-theme-surface text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* ═══ OVERLAY FOR MOBILE SIDEBAR ═══ */}
                {showSidebar && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] md:hidden"
                        onClick={() => setShowSidebar(false)}
                    ></div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    SIDEBAR — Filtres & Actions (style CommunityPage)
                   ═══════════════════════════════════════════════════════ */}
                <aside className={`
                    fixed inset-y-0 left-0 z-[60] md:relative md:z-auto
                    bg-theme-surface border-r border-theme-border flex flex-col shrink-0 overflow-hidden 
                    transition-all duration-300 ease-in-out
                    ${showSidebar ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'}
                    md:flex
                `}>
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-theme-border bg-theme-bg/80 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 text-theme-text-primary mb-1">
                                <Filter className="w-4 h-4 text-theme-accent-start" />
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Filtres & Actions</h2>
                            </div>
                            <p className="text-[9px] text-theme-text-secondary font-bold uppercase tracking-tight">Gérer vos notifications</p>
                        </div>
                        <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 text-theme-text-secondary">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        {/* Filtre "Tout" */}
                        <button
                            onClick={() => {
                                setTypeFilter('all');
                                if (window.innerWidth < 768) setShowSidebar(false);
                            }}
                            className={`w-full text-left p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${typeFilter === 'all' ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-lg shadow-theme-accent-start/30' : 'text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                        >
                            <Bell className="w-4 h-4" />
                            Toutes les notifications
                            <span className="ml-auto text-[9px] opacity-70">{notifications.length}</span>
                        </button>

                        {/* Filtres par type */}
                        <div className="space-y-1">
                            <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest px-2 mb-2">Par catégorie</p>
                            {typeOptions.filter(t => t !== 'all').map(type => {
                                const count = notifications.filter(n => n.type === type).length;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            setTypeFilter(type);
                                            if (window.innerWidth < 768) setShowSidebar(false);
                                        }}
                                        className={`
                                            flex items-center justify-between p-3 rounded-2xl mb-1 transition-all cursor-pointer group w-full
                                            ${typeFilter === type ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1' : 'hover:bg-theme-surface-hover text-theme-text-secondary'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${typeFilter === type ? 'bg-theme-accent-start/15' : getNotifColor(type)}`}>
                                                {getNotifIcon(type)}
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-tight truncate ${typeFilter === type ? 'text-theme-text-primary' : 'text-theme-text-secondary'}`}>
                                                {getTypeLabel(type)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold opacity-50">{count}</span>
                                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${typeFilter === type ? 'text-theme-accent-start' : 'opacity-0 group-hover:opacity-50'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ═══ Actions rapides ═══ */}
                        <div className="space-y-2 pt-2 border-t border-theme-border/50">
                            <p className="text-[8px] font-bold text-theme-text-secondary uppercase tracking-widest px-2 mb-2">Actions</p>
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="w-full p-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-theme-text-secondary hover:bg-theme-surface-hover transition-all flex items-center gap-3"
                            >
                                <Check className="w-4 h-4" />
                                {filteredNotifications.length > 0 && filteredNotifications.every((n) => selectedIds.includes(n.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                            </button>
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="w-full p-3 rounded-2xl bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-theme-accent-start/20 hover:opacity-90 transition-all flex items-center gap-3"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Tout marquer lu
                            </button>
                            <button
                                type="button"
                                onClick={markSelectedAsRead}
                                disabled={!selectedIds.length}
                                className="w-full p-3 rounded-2xl bg-theme-accent-start/10 text-theme-accent-start text-[9px] font-black uppercase tracking-widest disabled:opacity-30 transition-all flex items-center gap-3"
                            >
                                <Check className="w-4 h-4" />
                                Marquer sélection lue
                            </button>
                            <button
                                type="button"
                                onClick={deleteSelectedNotifications}
                                disabled={!selectedIds.length}
                                className="w-full p-3 rounded-2xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest disabled:opacity-30 transition-all flex items-center gap-3"
                            >
                                <Trash2 className="w-4 h-4" />
                                Supprimer sélection
                            </button>
                        </div>
                    </div>
                </aside>

                {/* ═══════════════════════════════════════════════════════
                    MAIN CONTENT — Liste des notifications
                   ═══════════════════════════════════════════════════════ */}
                <main className="flex-1 flex flex-col bg-theme-bg/70 overflow-hidden w-full transition-theme">
                    {/* Info bar */}
                    <div className="p-4 md:p-6 bg-theme-surface border-b border-theme-border shrink-0">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-theme-text-secondary">
                            <Filter className="w-3 h-3 shrink-0" />
                            <span className="shrink-0">Filtre actif :</span>
                            <span className={`px-2.5 py-1 rounded-full ${typeFilter !== 'all' ? getNotifColor(typeFilter) : 'bg-theme-surface text-theme-text-secondary'}`}>
                                {typeFilter === 'all' ? 'Toutes' : getTypeLabel(typeFilter)}
                            </span>
                            {selectedIds.length > 0 && (
                                <span className="ml-auto px-2.5 py-1 rounded-full bg-theme-accent-start/10 text-theme-accent-start">
                                    {selectedIds.length} sélectionnée{selectedIds.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
                        {filteredNotifications.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-80">
                                <div className="w-24 h-24 bg-theme-surface rounded-[2.5rem] flex items-center justify-center border border-theme-border">
                                    <Bell className="w-12 h-12 text-theme-text-secondary" />
                                </div>
                                <div className="text-center px-4">
                                    <p className="text-sm font-black text-theme-text-primary uppercase tracking-widest">Aucune notification</p>
                                    <p className="text-[10px] text-theme-text-secondary font-bold uppercase mt-1">Vous êtes à jour !</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleClick(notification)}
                                        className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition-all cursor-pointer hover:shadow-lg ${
                                            notification.is_read
                                                ? 'border-theme-border bg-theme-surface hover:border-theme-accent-start/20'
                                                : 'border-theme-accent-start/20 bg-theme-accent-start/5 shadow-sm hover:bg-theme-accent-start/10'
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(notification.id)}
                                            onClick={(event) => event.stopPropagation()}
                                            onChange={() => toggleSelect(notification.id)}
                                            className="mt-2.5 h-4 w-4 rounded border-theme-border text-theme-accent-start focus:ring-theme-accent-start shrink-0 cursor-pointer"
                                        />

                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getNotifColor(notification.type)}`}>
                                            {getNotifIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3">
                                                <h2 className={`text-sm font-black truncate ${notification.is_read ? 'text-theme-text-secondary' : 'text-theme-text-primary'}`}>
                                                    {notification.title}
                                                </h2>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Clock className="w-3 h-3 text-theme-text-secondary/50" />
                                                    <span className="text-[9px] font-bold text-theme-text-secondary/60">
                                                        {timeAgo(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="mt-1.5 text-xs text-theme-text-secondary leading-relaxed line-clamp-2">
                                                {notification.content}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${getNotifColor(notification.type)}`}>
                                                    {getTypeLabel(notification.type)}
                                                </span>
                                                {!notification.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-theme-accent-start animate-pulse" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete */}
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="p-2 text-theme-text-secondary/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                            aria-label="Supprimer la notification"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
