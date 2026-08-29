import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../monapp/AuthContext';
import { Navbar } from '../../monapp/components/Navbar';
import { PageLoader } from '../../monapp/Branding';
import { useNavigate } from 'react-router-dom';
import { Gift, PartyPopper, Heart, Loader2 } from 'lucide-react';
import { isBirthdayToday, isBirthdayTomorrow, getCurrentWishYear } from '../../lib/birthdayUtils';
import { BirthdayRing } from '../../components/BirthdayRing';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../../monapp/NotificationContext';

export const SouhaitsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const { data: profiles = [], isLoading: loading } = useQuery({
        queryKey: ['birthdayProfiles'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select(`
                    id, nom, prenom, avatar_url, date_naissance,
                    structure:comi_id (id, name, type)
                `)
                .not('date_naissance', 'is', null);
            return data || [];
        }
    });

    const displayedProfiles = profiles.filter(p => 
        activeTab === 'today' ? isBirthdayToday(p.date_naissance) : isBirthdayTomorrow(p.date_naissance)
    );

    const totalPages = Math.ceil(displayedProfiles.length / ITEMS_PER_PAGE);
    const paginatedProfiles = displayedProfiles.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
            <Navbar 
                mode="subpage" 
                title="Anniversaires" 
                subtitle="Souhaits de la communauté" 
                showLogo={true}
                onBack={() => navigate('/home')}
            />

            <div className="p-4 md:p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Tabs */}
                <div className="flex bg-theme-surface p-1 rounded-2xl border border-theme-border shadow-sm mx-auto max-w-sm">
                    <button
                        onClick={() => { setActiveTab('today'); setPage(1); }}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                            activeTab === 'today'
                                ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-md'
                                : 'text-theme-text-secondary hover:bg-theme-bg'
                        }`}
                    >
                        Aujourd'hui
                    </button>
                    <button
                        onClick={() => { setActiveTab('tomorrow'); setPage(1); }}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                            activeTab === 'tomorrow'
                                ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-md'
                                : 'text-theme-text-secondary hover:bg-theme-bg'
                        }`}
                    >
                        À venir
                    </button>
                </div>

                {displayedProfiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-6 opacity-80 mt-12">
                        <div className="w-24 h-24 bg-theme-surface rounded-[2.5rem] flex items-center justify-center border border-theme-border">
                            <PartyPopper className="w-12 h-12 text-theme-text-secondary" />
                        </div>
                        <div className="text-center px-4">
                            <p className="text-sm font-black text-theme-text-primary uppercase tracking-widest">
                                Aucun anniversaire
                            </p>
                            <p className="text-[10px] text-theme-text-secondary font-bold uppercase mt-1">
                                Personne ne fête son anniversaire {activeTab === 'today' ? "aujourd'hui" : "demain"}.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
                            {paginatedProfiles.map(p => (
                                <BirthdayCard key={p.id} profile={p} currentUserId={user?.id} />
                            ))}
                        </div>
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-theme-surface rounded-xl text-xs font-black uppercase text-theme-text-secondary border border-theme-border disabled:opacity-50 hover:bg-theme-surface-hover transition-all"
                                >
                                    Précédent
                                </button>
                                <span className="text-xs font-bold text-theme-text-secondary">
                                    Page {page} sur {totalPages}
                                </span>
                                <button 
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-theme-surface rounded-xl text-xs font-black uppercase text-theme-text-secondary border border-theme-border disabled:opacity-50 hover:bg-theme-surface-hover transition-all"
                                >
                                    Suivant
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const BirthdayCard = ({ profile, currentUserId }: { profile: any, currentUserId?: string }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-theme-surface p-4 rounded-3xl border border-theme-border flex items-center justify-between group hover:shadow-xl hover:border-theme-accent-start/30 transition-all duration-300">
            <div className="flex items-center gap-4">
                <div 
                    onClick={() => navigate(`/profil/${profile.id}`)}
                    className="shrink-0 cursor-pointer group-hover:scale-105 group-hover:rotate-3 transition-all"
                >
                    <BirthdayRing size="sm">
                        {profile.avatar_url ? (
                            <img loading="lazy" src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-theme-bg flex items-center justify-center text-theme-text-primary">
                                <span className="font-black text-xs md:text-sm">{profile.prenom?.[0]}{profile.nom?.[0]}</span>
                            </div>
                        )}
                    </BirthdayRing>
                </div>
                <div className="min-w-0">
                    <p className="text-xs md:text-sm font-black text-theme-text-primary capitalize truncate">{profile.prenom} {profile.nom}</p>
                    <p className="text-[10px] text-theme-text-secondary mt-0.5 truncate">{profile.structure?.name || 'Indépendant'}</p>
                </div>
            </div>
            
            <WishButton targetId={profile.id} currentUserId={currentUserId} />
        </div>
    );
};

const WishButton = ({ targetId, currentUserId }: { targetId: string, currentUserId?: string }) => {
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();
    const isMe = currentUserId === targetId;

    const { data: birthdayData } = useQuery({
        queryKey: ['birthday_wishes', targetId],
        queryFn: async () => {
            const year = getCurrentWishYear();
            const { data, count } = await supabase
                .from('birthday_wishes')
                .select('*', { count: 'exact' })
                .eq('to_user_id', targetId)
                .eq('year', year);
            
            const hasWished = data?.some(w => w.from_user_id === currentUserId) || false;
            return { count: count || 0, hasWished };
        },
        enabled: !!targetId
    });

    const hasWished = birthdayData?.hasWished || false;

    const wishMutation = useMutation({
        mutationFn: async () => {
            if (!currentUserId || !targetId) throw new Error('Missing IDs');
            const year = getCurrentWishYear();
            if (hasWished) {
                await supabase.from('birthday_wishes').delete().eq('from_user_id', currentUserId).eq('to_user_id', targetId).eq('year', year);
            } else {
                const { error } = await supabase.from('birthday_wishes').insert({ from_user_id: currentUserId, to_user_id: targetId, year });
                if (error && error.code !== '23505') throw error;
                
                // Fetch to user push token for notification
                const { data: toUser } = await supabase.from('profiles').select('push_token, prenom').eq('id', targetId).single();
                if (toUser?.push_token) {
                    const { data: me } = await supabase.from('profiles').select('prenom, nom').eq('id', currentUserId).single();
                    await supabase.from('notifications').insert({
                        user_id: targetId,
                        title: 'Joyeux Anniversaire !',
                        content: `${me?.prenom} ${me?.nom} vous souhaite un joyeux anniversaire !`,
                        type: 'birthday_wish',
                        is_read: false
                    });
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['birthday_wishes', targetId] });
            showNotification(
                hasWished ? "Souhait retiré" : "Voeux envoyés avec succès",
                'success'
            );
        }
    });

    if (isMe) return null;

    return (
        <button
            onClick={() => wishMutation.mutate()}
            disabled={wishMutation.isPending}
            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shrink-0 shadow-sm ${hasWished ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' : 'bg-theme-bg border border-theme-border text-theme-text-secondary hover:bg-pink-500 hover:text-white hover:border-pink-500'}`}
        >
            {wishMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (hasWished ? <Heart className="w-4 h-4 fill-current" /> : <Gift className="w-4 h-4" />)}
        </button>
    );
};
