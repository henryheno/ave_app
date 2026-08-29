import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { getCurrentProfile } from '../../lib/profileCache';
import { isBirthdayToday } from '../../lib/birthdayUtils';
import { BirthdayRing } from '../../components/BirthdayRing';
import { Search, Building2, Check, Filter, Menu, UserPlus, Home, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { ZoomableImage } from '../../monapp/components/ZoomableImage';
import { useNotification } from '../../monapp/NotificationContext';
import { useAuth } from '../../monapp/AuthContext';
import { CommunitySidebar, getTypeIcon, getTypeColor } from './components/CommunitySidebar';

export const CommunityPage = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStructure, setSelectedStructure] = useState<any>(null);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);

    const { data: userProfile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['currentProfile', user?.id],
        queryFn: async () => await getCurrentProfile(),
        enabled: !!user
    });

    const { data: allStructures = [], isLoading: isStructuresLoading } = useQuery({
        queryKey: ['structures'],
        queryFn: async () => (await getStructures()) || []
    });

    const { data: suivis = { followedProfiles: [], followedStructures: [] }, isLoading: isSuivisLoading } = useQuery({
        queryKey: ['suivis', user?.id],
        queryFn: async () => {
            if (!user) return { followedProfiles: [], followedStructures: [] };
            const { data } = await supabase.from('suivis').select('structure_id, followed_profile_id').eq('follower_id', user.id);
            if (!data) return { followedProfiles: [], followedStructures: [] };
            return {
                followedStructures: data.filter(f => f.structure_id).map(f => f.structure_id as string),
                followedProfiles: data.filter(f => f.followed_profile_id).map(f => f.followed_profile_id as string)
            };
        },
        enabled: !!user
    });

    const followedProfiles = suivis.followedProfiles;
    const followedStructures = suivis.followedStructures;

    const structureTree = useMemo(() => {
        const buildTree = (parentId: string | null = null): any[] => {
            return allStructures
                .filter(s => s.parent_id === parentId)
                .map(s => ({
                    ...s,
                    children: buildTree(s.id)
                }));
        };
        return buildTree(null);
    }, [allStructures]);

    const getAllDescendantIds = (parentId: string, structures: any[]): string[] => {
        let ids = [parentId];
        const children = structures.filter(s => s.parent_id === parentId);
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, structures)];
        });
        return ids;
    };

    const { data: profiles = [], isLoading: isProfilesLoading, isFetching: searching } = useQuery({
        queryKey: ['communityProfiles', searchTerm, selectedStructure?.id],
        queryFn: async () => {
            let query = supabase.from('profiles').select('*');

            if (searchTerm) {
                query = query.or(`nom.ilike.%${searchTerm}%,prenom.ilike.%${searchTerm}%`);
            }

            if (selectedStructure) {
                const descendantIds = getAllDescendantIds(selectedStructure.id, allStructures);
                query = query.in('comi_id', descendantIds);
            }

            const { data } = await query.order('nom', { ascending: true }).limit(1000);
            if (data) {
                return data.map((profile: any) => ({
                    ...profile,
                    structure: allStructures.find(s => s.id === profile.comi_id) || null
                }));
            }
            return [];
        },
        enabled: allStructures.length > 0
    });

    const followProfileMutation = useMutation({
        mutationFn: async (profileId: string) => {
            if (!userProfile) throw new Error("No user");
            const isFollowing = followedProfiles.includes(profileId);
            if (isFollowing) {
                await supabase.from('suivis').delete().eq('follower_id', userProfile.id).eq('followed_profile_id', profileId);
                return { action: 'unfollowed', profileId };
            } else {
                const { error } = await supabase.from('suivis').insert({ follower_id: userProfile.id, followed_profile_id: profileId });
                if (error && error.code === '23505') {
                    await supabase.from('suivis').delete().eq('follower_id', userProfile.id).eq('followed_profile_id', profileId);
                    return { action: 'unfollowed', profileId };
                } else if (error) throw error;
                return { action: 'followed', profileId };
            }
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['suivis'] });
            showNotification(result.action === 'followed' ? "Vous suivez maintenant ce profil" : "Profil retiré de vos suivis", 'success');
        }
    });

    const toggleFollowProfile = (profileId: string) => followProfileMutation.mutate(profileId);

    const followStructureMutation = useMutation({
        mutationFn: async (structureId: string) => {
            if (!userProfile) throw new Error("No user");
            const isFollowing = followedStructures.includes(structureId);
            if (isFollowing) {
                await supabase.from('suivis').delete().eq('follower_id', userProfile.id).eq('structure_id', structureId);
                return { action: 'unfollowed', structureId };
            } else {
                const { error } = await supabase.from('suivis').insert({ follower_id: userProfile.id, structure_id: structureId });
                if (error && error.code === '23505') {
                    await supabase.from('suivis').delete().eq('follower_id', userProfile.id).eq('structure_id', structureId);
                    return { action: 'unfollowed', structureId };
                } else if (error) throw error;
                return { action: 'followed', structureId };
            }
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['suivis'] });
            showNotification(result.action === 'followed' ? "Vous suivez maintenant cette structure" : "Structure retirée de vos suivis", 'success');
        }
    });

    const toggleFollowStructure = (structureId: string) => followStructureMutation.mutate(structureId);

    const loading = isProfileLoading || isStructuresLoading || isSuivisLoading || (isProfilesLoading && !profiles.length);

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme overflow-x-hidden">
            <header className="bg-theme-bg/90 backdrop-blur-xl px-6 py-4 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 transition-theme">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center ">
                            <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
                        </div>
                        <div>
                            <span className="block font-black text-theme-text-primary text-xl leading-none uppercase tracking-tighter">Communauté</span>
                            <span className="text-[9px] font-bold text-theme-accent-end uppercase tracking-[0.3em] opacity-80">Exploration</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/souhaits')}
                        className="p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-500 rounded-xl hover:from-pink-500/30 hover:to-purple-500/30 transition-all border border-pink-500/30"
                        title="Anniversaires"
                    >
                        <Gift className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="p-3 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border"
                        title="Accueil"
                    >
                        <Home className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/profil')}
                        className="hidden md:flex w-11 h-11 rounded-xl overflow-hidden border border-theme-border p-0.5 hover:scale-105 transition-transform cursor-pointer"
                    >
                        <div className="w-full h-full rounded-lg overflow-hidden">
                            {userProfile?.avatar_url ? (
                                <ZoomableImage src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-theme-surface flex items-center justify-center text-theme-text-primary">
                                    <span className="font-black text-xs">{userProfile?.prenom?.[0]}{userProfile?.nom?.[0]}</span>
                                </div>
                            )}
                        </div>
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
                <CommunitySidebar 
                    showSidebar={showSidebar}
                    setShowSidebar={setShowSidebar}
                    structureTree={structureTree}
                    selectedStructure={selectedStructure}
                    setSelectedStructure={setSelectedStructure}
                />

                <main className="flex-1 flex flex-col bg-theme-bg/70 overflow-hidden w-full transition-theme">
                    <div className="p-4 md:p-6 bg-theme-surface border-b border-theme-border space-y-4 shrink-0">
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                            <div className="flex-1 relative">
                                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${searching ? 'text-theme-accent-start animate-pulse' : 'text-theme-text-secondary'}`} />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    className="w-full bg-theme-bg border border-theme-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-theme-accent-start/20 focus:border-theme-accent-start text-theme-text-primary transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {selectedStructure && (
                                <button
                                    onClick={() => toggleFollowStructure(selectedStructure.id)}
                                    className={`px-6 py-4 sm:py-0 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${followedStructures.includes(selectedStructure.id) ? 'bg-theme-accent-start/10 text-theme-accent-start border border-theme-accent-start/20' : 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white hover:opacity-90'}`}
                                >
                                    {followedStructures.includes(selectedStructure.id) ? <Check className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                    {followedStructures.includes(selectedStructure.id) ? 'Suivi' : 'Suivre'}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-theme-text-secondary overflow-hidden">
                            <Filter className="w-3 h-3 shrink-0" />
                            <span className="shrink-0">Filtre actif :</span>
                            <div className="flex items-center gap-1 min-w-0">
                                <span className={`px-2 py-0.5 rounded-full ${selectedStructure ? getTypeColor(selectedStructure.type) : 'bg-theme-surface text-theme-text-secondary'}`}>
                                    {selectedStructure?.name || 'Globale'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {profiles.map(p => {
                                const isFollowed = followedProfiles.includes(p.id);
                                const isMe = p.id === userProfile?.id;

                                const parentStructure = p.structure?.parent_id
                                    ? allStructures.find(s => s.id === p.structure.parent_id)
                                    : null;

                                return (
                                    <div key={p.id} className="bg-theme-surface p-3 md:p-4 rounded-3xl border border-theme-border flex items-center justify-between group hover:shadow-xl hover:border-theme-accent-start/30 transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div
                                                onClick={() => navigate(`/profil/${p.id}`)}
                                                className="shrink-0 cursor-pointer group-hover:scale-105 group-hover:rotate-3 transition-all"
                                            >
                                                {isBirthdayToday(p.date_naissance) ? (
                                                    <BirthdayRing size="sm">
                                                        {p.avatar_url ? (
                                                            <ZoomableImage src={p.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-theme-bg flex items-center justify-center text-theme-text-primary">
                                                                <span className="font-black text-xs md:text-sm">{p.prenom?.[0]}{p.nom?.[0]}</span>
                                                            </div>
                                                        )}
                                                    </BirthdayRing>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-theme-border shadow-inner">
                                                        {p.avatar_url ? (
                                                            <ZoomableImage src={p.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-theme-bg flex items-center justify-center text-theme-text-primary">
                                                                <span className="font-black text-xs md:text-sm">{p.prenom?.[0]}{p.nom?.[0]}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs md:text-sm font-black text-theme-text-primary capitalize truncate">{p.prenom} {p.nom}</p>
                                                <div className="flex flex-col items-start mt-0.5">
                                                    <div className="px-2 py-0.5 bg-theme-bg border border-theme-border text-theme-text-secondary rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 max-w-full">
                                                        {getTypeIcon(p.structure?.type || 'COMI')}
                                                        <span className="truncate">
                                                            {parentStructure ? parentStructure.name : (p.structure?.name || 'Membre')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {!isMe && (
                                            <button
                                                onClick={() => toggleFollowProfile(p.id)}
                                                className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center shrink-0 shadow-sm ${isFollowed ? 'bg-theme-accent-start/10 text-theme-accent-start border border-theme-accent-start/20' : 'bg-theme-bg border border-theme-border text-theme-text-secondary hover:bg-theme-accent-start hover:text-white'}`}
                                            >
                                                {isFollowed ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {profiles.length === 0 && !searching && (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-80 mt-12">
                                <div className="w-24 h-24 bg-theme-surface rounded-[2.5rem] flex items-center justify-center border border-theme-border">
                                    <Search className="w-12 h-12 text-theme-text-secondary" />
                                </div>
                                <div className="text-center px-4">
                                    <p className="text-sm font-black text-theme-text-primary uppercase tracking-widest">Aucun membre trouvé</p>
                                    <p className="text-[10px] text-theme-text-secondary font-bold uppercase mt-1">Ajustez vos filtres ou explorez une autre branche</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
