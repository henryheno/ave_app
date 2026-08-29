import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentProfile } from '../../lib/profileCache';
import {
    ChevronRight,
    MessageCircle,
    FileText,
    Heart,
    Plus,
    Trash2,
    User as UserIcon,
    Video,
    Mic
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import { useTheme } from '../../monapp/ThemeContext';
import { getAncestorIds } from '../../lib/structureAncestors';

import { useAuth } from '../../monapp/AuthContext';
import { getStoredShortcuts } from './ParametresPage';
import { Navbar } from '../../monapp/components/Navbar';

const PUBLICATION_LIST_SELECT =
    'id, content, created_at, author_id, structure_id, media_items, structure:structures(id, name, type), reactions(id), comments(id)';

export const Home = () => {
    const navigate = useNavigate();
    const { showNotification, askConfirmation } = useNotification();
    const { setBranch } = useTheme();
    const { role } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'feed' | 'mine'>('feed');
    const [shortcuts, setShortcuts] = useState(getStoredShortcuts);

    // Recharger les raccourcis si l'utilisateur revient des paramètres
    useEffect(() => {
        const onFocus = () => setShortcuts(getStoredShortcuts());
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    const { data: userData, isLoading: loading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) {
                navigate('/auth');
                throw new Error('Not authenticated');
            }

            // EXÉCUTION SÉQUENTIELLE POUR ÉVITER LE DEADLOCK SUPABASE (bug Promise.all)
            // 1. On récupère d'abord les suivis
            const followsRes = await supabase.from('suivis')
                .select('structure_id, followed_profile_id')
                .eq('follower_id', user.id);

            // 2. Ensuite on récupère le profil via le cache
            const pData = await getCurrentProfile();
            if (!pData) {
                navigate('/complete-profile');
                throw new Error('Profile incomplete');
            }

            const fData = followsRes.data;
            const followedIds = fData ? fData.filter(f => f.structure_id).map(f => f.structure_id as string) : [];
            const followedProfileIds = fData ? fData.filter(f => f.followed_profile_id).map(f => f.followed_profile_id as string) : [];

            return {
                user,
                profile: pData,
                followedIds,
                followedProfileIds
            };
        }
    });

    const userProfile = userData?.profile;
    const userRole = role || 'membre';
    const followedIds = userData?.followedIds || [];
    const followedProfileIds = userData?.followedProfileIds || [];

    useEffect(() => {
        if (userData?.profile?.branche) {
            setBranch(userData.profile.branche);
        }
    }, [userData?.profile?.branche, setBranch]);

    // REAL-TIME: Écouter les changements sur les publications pour mettre à jour le feed instantanément
    useEffect(() => {
        const channel = supabase
            .channel('realtime:publications')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'publications' },
                () => {
                    // Invalider le cache pour forcer un re-chargement en arrière-plan
                    queryClient.invalidateQueries({ queryKey: ['feed'] });
                    queryClient.invalidateQueries({ queryKey: ['myFeed'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);



    const { data: publications = [], isLoading: isFeedLoading } = useQuery({
        queryKey: ['feed', userProfile?.comi_id, followedIds, followedProfileIds],
        queryFn: async () => {
            const ancestorIds = await getAncestorIds(userProfile?.comi_id || null);
            const allTargetIds = Array.from(new Set([...ancestorIds, ...followedIds])).filter((id) => id && id !== 'null');

            if (allTargetIds.length === 0 && followedProfileIds.length === 0) return [];

            let query = supabase.from('publications')
                .select(PUBLICATION_LIST_SELECT)
                .eq('is_approved', true);
            if (followedProfileIds.length > 0) {
                if (allTargetIds.length > 0) {
                    query = query.or(`structure_id.in.(${allTargetIds.join(',')}),author_id.in.(${followedProfileIds.join(',')})`);
                } else {
                    query = query.in('author_id', followedProfileIds);
                }
            } else {
                query = query.in('structure_id', allTargetIds);
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(40);
            if (error) throw error;
            return data || [];
        },
        enabled: !!userProfile
    });

    const { data: myPublications = [], isLoading: isMyFeedLoading } = useQuery({
        queryKey: ['myFeed', userData?.user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.from('publications').select(PUBLICATION_LIST_SELECT).eq('author_id', userData!.user!.id).order('created_at', { ascending: false }).limit(40);
            if (error) throw error;
            return data || [];
        },
        enabled: !!userData?.user?.id
    });

    const feedLoading = isFeedLoading || isMyFeedLoading;





    const { data: suggestions = [], isLoading: isSuggestionsLoading } = useQuery({
        queryKey: ['suggestions', userData?.user?.id, followedProfileIds.length],
        queryFn: async () => {
            if (!userData?.user?.id) return [];
            
            let potentialIds: string[] = [];
            
            // 1. Amis d'amis (Personnes suivies par ceux que je suis)
            if (followedProfileIds.length > 0) {
                const { data: fofData } = await supabase
                    .from('suivis')
                    .select('followed_profile_id')
                    .in('follower_id', followedProfileIds)
                    .not('followed_profile_id', 'is', null);
                
                if (fofData) {
                    potentialIds = fofData.map(f => f.followed_profile_id as string);
                }
            }
            
            // 2. Personnes dans la même structure (collègues)
            if (userProfile?.comi_id) {
                const { data: colleagueData } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('comi_id', userProfile.comi_id)
                    .neq('id', userData.user.id)
                    .limit(10);
                if (colleagueData) {
                    potentialIds = [...potentialIds, ...colleagueData.map(c => c.id)];
                }
            }

            // Supprimer les doublons, l'utilisateur lui-même, et ceux déjà suivis
            let uniqueTargetIds = Array.from(new Set(potentialIds))
                .filter(id => id !== userData.user.id && !followedProfileIds.includes(id));
            
            let finalProfiles: any[] = [];
            
            try {
                // 3. Récupérer les profils basés sur l'affinité
                if (uniqueTargetIds.length > 0) {
                    uniqueTargetIds = uniqueTargetIds.sort(() => 0.5 - Math.random()).slice(0, 6);
                    
                    const { data: affinityProfiles, error: affError } = await supabase
                        .from('profiles')
                        .select('*')
                        .in('id', uniqueTargetIds);
                        
                    if (affError) console.error("Affinity error:", affError);
                    if (affinityProfiles) finalProfiles = [...affinityProfiles];
                }
                
                // 4. Si moins de 6 suggestions, on complète avec des profils aléatoires
                if (finalProfiles.length < 6) {
                    // On récupère un large échantillon (200) pour garantir le côté aléatoire
                    const { data: randomProfiles, error: randError } = await supabase
                        .from('profiles')
                        .select('*')
                        .neq('id', userData.user.id)
                        .limit(200);
                    
                    if (randError) console.error("Random profiles error:", randError);
                    if (randomProfiles) {
                        const filteredRandom = randomProfiles.filter(
                            p => !followedProfileIds.includes(p.id) && !finalProfiles.some(fp => fp.id === p.id)
                        );
                        // On mélange tout l'échantillon pour avoir des profils vraiment différents à chaque fois
                        const shuffledRandom = filteredRandom.sort(() => 0.5 - Math.random());
                        finalProfiles = [...finalProfiles, ...shuffledRandom].slice(0, 6);
                    }
                }
            } catch (err) {
                console.error("Suggestions fetch error:", err);
            }
            
            // Mélange final pour l'affichage
            return finalProfiles.sort(() => 0.5 - Math.random());
        },
        enabled: !!userData?.user?.id
    });

    const toggleFollowProfileMutation = useMutation({
        mutationFn: async (profileId: string) => {
            if (!userProfile) throw new Error("Profil non trouvé");
            const isFollowing = followedProfileIds.includes(profileId);

            if (isFollowing) {
                const { error } = await supabase
                    .from('suivis')
                    .delete()
                    .eq('follower_id', userProfile.id)
                    .eq('followed_profile_id', profileId);
                if (error) throw error;
                return { action: 'unfollow', profileId };
            } else {
                const { error } = await supabase
                    .from('suivis')
                    .insert({ follower_id: userProfile.id, followed_profile_id: profileId });
                
                if (error) {
                    // Si l'erreur est une violation d'unicité (double clic très rapide)
                    if (error.code === '23505') {
                        const { error: deleteError } = await supabase
                            .from('suivis')
                            .delete()
                            .eq('follower_id', userProfile.id)
                            .eq('followed_profile_id', profileId);
                            
                        if (deleteError) throw deleteError;
                        return { action: 'unfollow', profileId };
                    }
                    throw error;
                }
                return { action: 'follow', profileId };
            }
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            showNotification(result.action === 'follow' ? "Vous suivez maintenant ce profil" : "Profil retiré de vos suivis", 'success');
        },
        onError: (error: any) => {
            showNotification("Erreur lors du suivi : " + error.message, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('publications').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['myFeed'] });
            showNotification("Publication supprimée avec succès !", 'success');
        },
        onError: (error: any) => {
            showNotification("Erreur lors de la suppression : " + error.message, 'error');
        }
    });

    const handleDelete = (id: string) => {
        askConfirmation("Voulez-vous vraiment supprimer cette publication ainsi que tous ses commentaires et réactions ?", () => {
            deleteMutation.mutate(id);
        });
    };


    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
            {/* TOP NAVBAR (Centralized Navbar Component) */}
            <Navbar mode="home" />

            <main className="max-w-6xl mx-auto w-full p-4 pb-28 space-y-5">
                {/* COMPACT PROFILE BAR */}
                {shortcuts.profileBar && (
                <div className="bg-theme-surface backdrop-blur-xl p-4 rounded-2xl border border-theme-border flex items-center justify-between group transition-theme">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white ">
                            <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-theme-text-primary leading-none tracking-tight">
                                {userProfile?.prenom} {userProfile?.nom}
                            </h2>
                            <p className="text-theme-accent-end text-[8px] font-bold uppercase tracking-wider mt-1">
                                {userProfile?.comi?.name || 'Connecté'}
                            </p>
                        </div>
                    </div>
                </div>
                )}

                {/* TABS SELECTOR (Compact) */}
                <div className="flex bg-theme-surface p-1.5 rounded-xl border border-theme-border max-w-sm mx-auto w-full transition-theme shadow-inner">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex-1 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                            activeTab === 'feed'
                                ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-lg shadow-theme-accent-start/40 ring-1 ring-theme-accent-start/50 scale-[1.02]'
                                : 'text-theme-text-secondary bg-transparent hover:bg-theme-bg hover:text-theme-text-primary'
                        }`}
                    >Fil d'actualité</button>
                    {userRole !== 'membre' && (
                        <button
                            onClick={() => setActiveTab('mine')}
                            className={`flex-1 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                                activeTab === 'mine'
                                    ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-lg shadow-theme-accent-start/40 ring-1 ring-theme-accent-start/50 scale-[1.02]'
                                    : 'text-theme-text-secondary bg-transparent hover:bg-theme-bg hover:text-theme-text-primary'
                            }`}
                        >Mes Pubs</button>
                    )}
                </div>

                {/* CONTENT AREA */}
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-black text-theme-text-primary tracking-tight">
                            {activeTab === 'feed' ? 'Découvrir' : 'Mes Publications'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {feedLoading && (activeTab === 'feed' || activeTab === 'mine') ? (
                            <p className="col-span-full text-center text-sm text-theme-text-secondary py-12">
                                Chargement des publications…
                            </p>
                        ) : null}
                        {!feedLoading && (activeTab === 'feed' || activeTab === 'mine') ? (
                            (activeTab === 'feed' ? publications : myPublications).map(post => (
                                <div key={post.id} className="relative group">
                                    <button
                                        onClick={() => navigate(`/pub/${post.id}`)}
                                        className="w-full text-left bg-theme-surface backdrop-blur-xl rounded-2xl p-5 border border-theme-border space-y-3.5 hover:bg-theme-surface-hover transition-all duration-300 group/card cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="px-2.5 py-0.5 bg-theme-bg text-theme-accent-end rounded-full font-black text-[8px] uppercase tracking-wider border border-theme-border">
                                                    {(post.structure as any)?.type}
                                                </div>
                                                <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-wider">{new Date(post.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="w-7 h-7 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center group-hover/card:bg-theme-accent-start group-hover/card:text-white transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <h3 className="font-black text-theme-text-primary text-sm leading-tight tracking-tight group-hover/card:text-theme-accent-end transition-colors">{(post.structure as any)?.name}</h3>
                                            <p className="text-theme-text-secondary text-[12px] line-clamp-2 leading-relaxed font-medium">{post.content}</p>
                                        </div>

                                        {post.media_items && post.media_items.length > 0 && (
                                            <div className="rounded-xl overflow-hidden border border-theme-border h-32 bg-theme-bg relative group-hover/card:scale-[1.01] transition-transform duration-300">
                                                {post.media_items[0].type === 'pdf' || post.media_items[0].type === 'document' ? (
                                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-theme-accent-start font-black text-[9px] uppercase tracking-widest bg-theme-surface">
                                                        <div className="p-3 rounded-full bg-theme-accent-start/10">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        {post.media_items[0].type === 'pdf' ? 'DOCUMENT PDF' : 'DOCUMENT WORD'}
                                                    </div>
                                                ) : post.media_items[0].type === 'video' ? (
                                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-theme-accent-start font-black text-[9px] uppercase tracking-widest bg-theme-surface">
                                                        <div className="p-3 rounded-full bg-theme-accent-start/10">
                                                            <Video className="w-6 h-6" />
                                                        </div>
                                                        VIDÉO
                                                    </div>
                                                ) : post.media_items[0].type === 'audio' ? (
                                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-theme-accent-start font-black text-[9px] uppercase tracking-widest bg-theme-surface">
                                                        <div className="p-3 rounded-full bg-theme-accent-start/10">
                                                            <Mic className="w-6 h-6" />
                                                        </div>
                                                        NOTE VOCALE
                                                    </div>
                                                ) : (
                                                    <img loading="lazy" src={post.media_items[0].url} className="w-full h-full object-cover brightness-90 group-hover/card:brightness-100 transition-all" />
                                                )}

                                                {post.media_items.length > 1 && (
                                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-white text-[8px] font-black tracking-widest">
                                                        +{post.media_items.length - 1} MÉDIA{post.media_items.length - 1 > 1 ? 'S' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 pt-3 border-t border-theme-border">
                                            <div className="flex items-center gap-1 text-theme-text-secondary text-[10px] font-black">
                                                <Heart className={`w-3.5 h-3.5 transition-all ${post.reactions?.length > 0 ? 'fill-theme-accent-start text-theme-accent-start' : 'group-hover/card:text-theme-text-primary'}`} />
                                                {post.reactions?.length || 0}
                                            </div>
                                            <div className="flex items-center gap-1 text-theme-text-secondary text-[10px] font-black">
                                                <MessageCircle className="w-3.5 h-3.5 group-hover/card:text-theme-text-primary transition-colors" />
                                                {post.comments?.length || 0}
                                            </div>
                                        </div>
                                    </button>

                                    {/* ACTIONS POUR SES PROPRES PUBS */}
                                    {activeTab === 'mine' && (
                                        <div className="absolute bottom-3 right-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20 cursor-pointer"
                                                title="Supprimer la publication"
                                            >
                                                <Trash2 className="w-4.5 h-4.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : null}
                    </div>
                </div>

                {/* SUGGESTIONS SECTION */}
                {activeTab === 'feed' && !feedLoading && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8 pt-8 border-t border-theme-border">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xl font-black text-theme-text-primary tracking-tight">
                                Suggestions pour vous
                            </h2>
                            <button onClick={() => navigate('/communaute')} className="text-[10px] font-black text-theme-accent-start uppercase tracking-wider flex items-center gap-1 hover:underline">
                                Voir plus <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            {isSuggestionsLoading ? (
                                <p className="col-span-full text-center text-sm text-theme-text-secondary py-4">Chargement des suggestions...</p>
                            ) : suggestions.map(p => {
                                const isFollowed = followedProfileIds.includes(p.id);
                                return (
                                <div key={p.id} className="bg-theme-surface p-3 rounded-2xl md:rounded-[2rem] border border-theme-border flex flex-col items-center justify-center text-center gap-2 group hover:shadow-xl hover:border-theme-accent-start/30 transition-all duration-300">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-theme-bg border border-theme-border rounded-xl md:rounded-2xl flex items-center justify-center text-theme-text-primary shadow-inner group-hover:scale-105 group-hover:rotate-3 transition-all shrink-0">
                                        <span className="font-black text-xs md:text-sm">{p.prenom?.[0]}{p.nom?.[0]}</span>
                                    </div>
                                    <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center">
                                        <p className="text-[10px] md:text-xs font-black text-theme-text-primary capitalize truncate cursor-pointer hover:text-theme-accent-start w-full" onClick={() => navigate(`/profil/${p.id}`)}>{p.prenom} {p.nom}</p>
                                    </div>

                                    <button
                                        onClick={() => toggleFollowProfileMutation.mutate(p.id)}
                                        className={`w-full py-1.5 md:py-2 mt-auto rounded-lg md:rounded-xl transition-all flex items-center justify-center shrink-0 shadow-sm ${isFollowed ? 'bg-theme-accent-start/10 text-theme-accent-start border border-theme-accent-start/20' : 'bg-theme-bg border border-theme-border text-theme-text-secondary hover:bg-theme-accent-start hover:text-white'}`}
                                    >
                                        <Plus className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${isFollowed ? 'rotate-45' : ''}`} />
                                    </button>
                                </div>
                            )})}
                            {suggestions.length === 0 && !isSuggestionsLoading && (
                                <p className="col-span-full text-center text-xs text-theme-text-secondary">Aucune suggestion pour le moment.</p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {userRole !== 'membre' && (
                <button onClick={() => navigate('/publier')} className="fixed bottom-6 right-6 w-12 h-12 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 group cursor-pointer">
                    <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            )}
        </div>
    );
};