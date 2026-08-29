import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';

import {
    Check, X, Clock, ChevronLeft, ChevronRight, ScanLine,
    Search, Filter, ArrowUpDown, CheckCircle2, XCircle,
    Hourglass, Menu, Calendar, ArrowDownAZ, ArrowUpAZ,
    Home, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SortOrder = 'desc' | 'asc';

export const TransferApprovalPage = () => {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
    const [monthFilter, setMonthFilter] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data: structures = [], isLoading: loadingStructures } = useQuery({
        queryKey: ['structures'],
        queryFn: async () => await getStructures()
    });

    const { data: requests = [], isLoading: loadingRequests } = useQuery({
        queryKey: ['transfer_requests'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transfer_requests')
                .select(`
                    *,
                    user:profiles!transfer_requests_user_id_fkey(nom, prenom, branche, fonction)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }
    });

    const loading = loadingStructures || loadingRequests;

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const actionMutation = useMutation({
        mutationFn: async ({ id, action, userId, newComiId }: { id: string, action: 'approved' | 'rejected', userId: string, newComiId: string }) => {
            const { data: { user } } = await supabase.auth.getUser();

            const updateData: Record<string, any> = {
                status: action,
                approved_at: new Date().toISOString(),
                approved_by: user?.id,
                ...(action === 'approved' ? { qr_token: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : generateUUID() } : {}),
            };

            const { error } = await supabase
                .from('transfer_requests')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            if (action === 'approved') {
                const { error: profileError } = await supabase.rpc('transfer_user_structure', {
                    p_target_user_id: userId,
                    p_new_comi_id: newComiId
                });
                if (profileError) throw profileError;

                // Rétrograder le coordonnateur en membre simple de manière propre via la fonction RPC
                const { data: userRoleData } = await supabase
                    .from('utilisateurs')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (userRoleData && userRoleData.role === 'coordonateur') {
                    const { error: rpcRoleError } = await supabase.rpc('update_user_role', {
                        p_target_user_id: userId,
                        p_new_role: 'membre',
                        p_structure_id: null
                    });
                    if (rpcRoleError) console.error("Erreur lors de la rétrogradation :", rpcRoleError);
                }

                await supabase.from('notifications').insert({
                    user_id: userId,
                    actor_id: user?.id,
                    title: 'Transfert approuvé',
                    content: 'Votre demande de transfert a été approuvée.',
                    type: 'transfer_approved',
                    entity_type: 'transfer_request',
                    entity_id: id,
                    is_read: false
                });

                const { data: profilesInComi } = await supabase.from('profiles').select('id').eq('comi_id', newComiId);
                if (profilesInComi && profilesInComi.length > 0) {
                    const profileIds = profilesInComi.map(p => p.id);
                    const { data: coords } = await supabase.from('utilisateurs').select('id').in('id', profileIds).eq('role', 'coordonateur');
                    if (coords && coords.length > 0) {
                        const coordNotifs = coords.map(c => ({
                            user_id: c.id,
                            actor_id: user?.id,
                            title: 'Nouveau membre',
                            content: 'Un nouveau membre a rejoint votre structure suite à un transfert.',
                            type: 'transfer_approved',
                            entity_type: 'transfer_request',
                            entity_id: id,
                            is_read: false,
                            metadata: { target_role: 'coordonateur' }
                        }));
                        await supabase.from('notifications').insert(coordNotifs);
                    }
                }
            } else {
                await supabase.from('notifications').insert({
                    user_id: userId,
                    actor_id: user?.id,
                    title: 'Transfert refusé',
                    content: 'Votre demande de transfert a été refusée.',
                    type: 'transfer_rejected',
                    entity_type: 'transfer_request',
                    entity_id: id,
                    is_read: false
                });
            }
            return action;
        },
        onSuccess: (action) => {
            queryClient.invalidateQueries({ queryKey: ['transfer_requests'] });
            showNotification(`Demande ${action === 'approved' ? 'approuvée' : 'rejetée'} avec succès`, 'success');
        },
        onError: (err: any) => {
            console.error(err);
            showNotification('Erreur lors du traitement', 'error');
        }
    });

    const handleAction = (id: string, action: 'approved' | 'rejected', userId: string, newComiId: string) => {
        actionMutation.mutate({ id, action, userId, newComiId });
    };

    // Mois disponibles
    const availableMonths = useMemo(() => {
        const monthsSet = new Set<string>();
        requests.forEach(req => {
            if (req.created_at) {
                const d = new Date(req.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthsSet.add(key);
            }
        });
        return Array.from(monthsSet).sort().reverse();
    }, [requests]);

    const getMonthLabel = (key: string) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    };

    // Filtrage et tri
    const filteredRequests = useMemo(() => {
        let result = [...requests];

        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(r => {
                const fullName = `${r.user?.prenom || ''} ${r.user?.nom || ''}`.toLowerCase();
                return fullName.includes(q);
            });
        }

        if (monthFilter) {
            result = result.filter(r => {
                if (!r.created_at) return false;
                const d = new Date(r.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return key === monthFilter;
            });
        }

        result.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [requests, statusFilter, searchQuery, monthFilter, sortOrder]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, monthFilter, sortOrder]);

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStructureName = (id: string) => {
        return structures.find(s => s.id === id)?.name || 'Structure inconnue';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Approuvé
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                        <XCircle className="w-3 h-3" /> Rejeté
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                        <Hourglass className="w-3 h-3" /> En attente
                    </span>
                );
        }
    };

    // Compteurs par statut
    const statusCounts = useMemo(() => {
        const counts = { all: requests.length, pending: 0, approved: 0, rejected: 0 };
        requests.forEach(r => {
            if (r.status === 'pending') counts.pending++;
            else if (r.status === 'approved') counts.approved++;
            else if (r.status === 'rejected') counts.rejected++;
        });
        return counts;
    }, [requests]);

    const hasActiveFilters = searchQuery || monthFilter || statusFilter !== 'pending' || sortOrder !== 'desc';

    const resetFilters = () => {
        setSearchQuery('');
        setStatusFilter('pending');
        setMonthFilter('');
        setSortOrder('desc');
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme overflow-x-hidden">
            {/* TOP NAVBAR */}
            <header className="bg-theme-bg/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 transition-theme">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center">
                            <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                        </div>
                        <div>
                            <span className="block font-black text-theme-text-primary text-xl leading-none uppercase tracking-tighter">Transferts</span>
                            <span className="text-[9px] font-bold text-theme-accent-end uppercase tracking-[0.3em] opacity-80">Approbations</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/scan')}
                        className="p-3 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-xl shadow flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                    >
                        <ScanLine className="w-4 h-4" />
                        <span className="hidden sm:inline">Scanner</span>
                    </button>
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-3 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border"
                        title="Retour admin"
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
                {/* OVERLAY FOR MOBILE SIDEBAR */}
                {showSidebar && (
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] md:hidden"
                        onClick={() => setShowSidebar(false)}
                    ></div>
                )}

                {/* SIDEBAR - FILTRES */}
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
                                <h2 className="text-[11px] font-black uppercase tracking-widest">Filtres</h2>
                            </div>
                            <p className="text-[9px] text-theme-text-secondary font-bold uppercase tracking-tight">{filteredRequests.length} résultat{filteredRequests.length > 1 ? 's' : ''}</p>
                        </div>
                        <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 text-theme-text-secondary">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Sidebar Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">

                        {/* Recherche */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                                <Search className="w-3 h-3" /> Recherche
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Nom ou prénom..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-theme-bg border border-theme-border rounded-2xl text-sm text-theme-text-primary placeholder:text-theme-text-secondary/50 focus:outline-none focus:border-theme-accent-start/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Statut */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Statut
                            </label>
                            <div className="space-y-1">
                                {([
                                    { id: 'all' as StatusFilter, label: 'Tous', count: statusCounts.all, icon: <Filter className="w-3.5 h-3.5" /> },
                                    { id: 'pending' as StatusFilter, label: 'En attente', count: statusCounts.pending, icon: <Hourglass className="w-3.5 h-3.5" /> },
                                    { id: 'approved' as StatusFilter, label: 'Approuvés', count: statusCounts.approved, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                                    { id: 'rejected' as StatusFilter, label: 'Rejetés', count: statusCounts.rejected, icon: <XCircle className="w-3.5 h-3.5" /> },
                                ]).map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setStatusFilter(tab.id);
                                            if (window.innerWidth < 768) setShowSidebar(false);
                                        }}
                                        className={`
                                            w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group
                                            ${statusFilter === tab.id
                                                ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1'
                                                : 'hover:bg-theme-surface-hover text-theme-text-secondary'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${statusFilter === tab.id ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg text-theme-text-secondary'
                                                }`}>
                                                {tab.icon}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tight">{tab.label}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${statusFilter === tab.id
                                            ? 'bg-theme-accent-start/20 text-theme-accent-start'
                                            : 'bg-theme-bg text-theme-text-secondary'
                                            }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtre par mois */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Mois
                            </label>
                            <div className="space-y-1">
                                <button
                                    onClick={() => {
                                        setMonthFilter('');
                                        if (window.innerWidth < 768) setShowSidebar(false);
                                    }}
                                    className={`
                                        w-full text-left p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-3
                                        ${!monthFilter
                                            ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1'
                                            : 'text-theme-text-secondary hover:bg-theme-surface-hover'
                                        }
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!monthFilter ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg text-theme-text-secondary'
                                        }`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                    </div>
                                    Tous les mois
                                </button>
                                {availableMonths.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            setMonthFilter(m);
                                            if (window.innerWidth < 768) setShowSidebar(false);
                                        }}
                                        className={`
                                            w-full text-left p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-3
                                            ${monthFilter === m
                                                ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1'
                                                : 'text-theme-text-secondary hover:bg-theme-surface-hover'
                                            }
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${monthFilter === m ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg text-theme-text-secondary'
                                            }`}>
                                            <Calendar className="w-3.5 h-3.5" />
                                        </div>
                                        {getMonthLabel(m)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tri */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary flex items-center gap-2">
                                <ArrowUpDown className="w-3 h-3" /> Tri
                            </label>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSortOrder('desc')}
                                    className={`
                                        w-full text-left p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-3
                                        ${sortOrder === 'desc'
                                            ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1'
                                            : 'text-theme-text-secondary hover:bg-theme-surface-hover'
                                        }
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sortOrder === 'desc' ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg text-theme-text-secondary'
                                        }`}>
                                        <ArrowDownAZ className="w-3.5 h-3.5" />
                                    </div>
                                    Plus récent d'abord
                                </button>
                                <button
                                    onClick={() => setSortOrder('asc')}
                                    className={`
                                        w-full text-left p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-3
                                        ${sortOrder === 'asc'
                                            ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1'
                                            : 'text-theme-text-secondary hover:bg-theme-surface-hover'
                                        }
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sortOrder === 'asc' ? 'bg-theme-accent-start/15 text-theme-accent-start' : 'bg-theme-bg text-theme-text-secondary'
                                        }`}>
                                        <ArrowUpAZ className="w-3.5 h-3.5" />
                                    </div>
                                    Plus ancien d'abord
                                </button>
                            </div>
                        </div>

                        {/* Bouton réinitialiser */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="w-full p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Réinitialiser les filtres
                            </button>
                        )}
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col bg-theme-bg/70 overflow-hidden w-full transition-theme">
                    {/* Search bar + active filter breadcrumb */}
                    <div className="p-4 md:p-6 bg-theme-surface border-b border-theme-border space-y-3 shrink-0">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-text-secondary" />
                                <input
                                    type="text"
                                    placeholder="Rechercher un transfert..."
                                    className="w-full bg-theme-bg border border-theme-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 focus:border-theme-accent-start text-theme-text-primary transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Active filters breadcrumb */}
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-theme-text-secondary overflow-hidden">
                            <Filter className="w-3 h-3 shrink-0" />
                            <span className="shrink-0">Filtre actif :</span>
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className="px-2 py-0.5 bg-theme-accent-start/10 text-theme-accent-start rounded-md">
                                    {statusFilter === 'all' ? 'Tous' : statusFilter === 'pending' ? 'En attente' : statusFilter === 'approved' ? 'Approuvés' : 'Rejetés'}
                                </span>
                                {monthFilter && (
                                    <span className="px-2 py-0.5 bg-theme-accent-start/10 text-theme-accent-start rounded-md">
                                        {getMonthLabel(monthFilter)}
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-theme-bg text-theme-text-secondary rounded-md">
                                    {sortOrder === 'desc' ? '↓ Récent' : '↑ Ancien'}
                                </span>
                                <span className="text-theme-text-secondary/50 ml-1">
                                    · {filteredRequests.length} résultat{filteredRequests.length > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-16 bg-theme-surface rounded-2xl border border-theme-border">
                                <Clock className="w-10 h-10 text-theme-text-secondary/50 mx-auto mb-3" />
                                <p className="text-theme-text-secondary text-sm">
                                    {searchQuery || monthFilter || statusFilter !== 'pending'
                                        ? 'Aucun résultat pour ces filtres.'
                                        : 'Aucune demande en attente.'}
                                </p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={resetFilters}
                                        className="mt-4 px-4 py-2 bg-theme-accent-start/10 text-theme-accent-start rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-theme-accent-start/20 transition-all"
                                    >
                                        Réinitialiser les filtres
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {paginatedRequests.map(req => (
                                        <div key={req.id} className="bg-theme-surface border border-theme-border rounded-xl p-3 shadow-sm hover:border-theme-accent-start/30 transition-all">
                                            <div className="flex items-center justify-between mb-3 border-b border-theme-border pb-2">
                                                <div>
                                                    <h3 className="font-black text-sm">{req.user?.nom} {req.user?.prenom}</h3>
                                                    <p className="text-[9px] text-theme-accent-start uppercase font-bold tracking-widest">{req.user?.branche}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {getStatusBadge(req.status)}
                                                    <span className="text-[9px] text-theme-text-secondary">{new Date(req.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                                    <p className="text-[9px] uppercase text-red-500 font-bold tracking-widest w-16">Origine</p>
                                                    <p className="text-xs font-black text-theme-text-primary truncate">{getStructureName(req.from_comi_id)}</p>
                                                </div>

                                                <div className="flex items-center gap-2 bg-green-500/5 p-2 rounded-lg border border-green-500/10">
                                                    <p className="text-[9px] uppercase text-green-500 font-bold tracking-widest w-16">Dest.</p>
                                                    <p className="text-xs font-black text-theme-text-primary truncate">{getStructureName(req.to_comi_id)}</p>
                                                </div>
                                            </div>

                                            {req.status === 'pending' && (
                                                <div className="flex gap-2 border-t border-theme-border pt-3">
                                                    <button
                                                        onClick={() => handleAction(req.id, 'rejected', req.user_id, req.to_comi_id)}
                                                        className="flex-1 py-2 bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Rejeter
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'approved', req.user_id, req.to_comi_id)}
                                                        className="flex-1 py-2 bg-green-500/10 text-green-500 font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Check className="w-3.5 h-3.5" /> Approuver
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between bg-theme-surface p-3 rounded-xl border border-theme-border">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 bg-theme-bg rounded-lg border border-theme-border disabled:opacity-50 cursor-pointer"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs font-bold">
                                            Page {currentPage} sur {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 bg-theme-bg rounded-lg border border-theme-border disabled:opacity-50 cursor-pointer"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
