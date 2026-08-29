import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getStructures } from '../../lib/structureCache';
import { isBirthdayToday, getBirthdayAge, getCurrentWishYear } from '../../lib/birthdayUtils';
import { Confetti } from '../../components/Confetti';
import { BirthdayCardExport } from '../../components/BirthdayCardExport';
import { Bell, Sun, Moon, LogOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '../../monapp/Branding';
import { useNotification } from '../../monapp/NotificationContext';
import { useTheme } from '../../monapp/ThemeContext';
import { Navbar } from '../../monapp/components/Navbar';

import { ProfileHeader } from './components/ProfileHeader';
import { ProfileTabs } from './components/ProfileTabs';
import { ProfileContent } from './components/ProfileContent';

export const ProfilPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const { theme, toggleTheme } = useTheme();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('publications');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showBirthdayCard, setShowBirthdayCard] = useState(false);

    const { data: profileData, isLoading: isProfileLoading } = useQuery({
        queryKey: ['profile', id || 'me'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/auth');
                throw new Error('Not authenticated');
            }
            setCurrentUserId(user.id);
            const targetId = id || user.id;
            const isMyProfile = targetId === user.id;

            const { data: pData } = await supabase.from('profiles').select('*').eq('id', targetId).single();
            let finalProfile = pData;
            if (pData?.comi_id) {
                const allStructures = await getStructures();
                const comi = allStructures.find(s => s.id === pData.comi_id);
                if (comi) finalProfile = { ...pData, comi };
            }

            let isFollowing = false;
            if (!isMyProfile) {
                const { data: followData } = await supabase.from('suivis').select('*').eq('follower_id', user.id).eq('followed_profile_id', targetId).maybeSingle();
                isFollowing = !!followData;
            }

            return { profile: finalProfile, isMyProfile, isFollowing, targetId };
        }
    });

    const targetId = profileData?.targetId;
    const profile = profileData?.profile;
    const isMyProfile = profileData?.isMyProfile || false;
    const isFollowing = profileData?.isFollowing || false;

    const { data: statsData } = useQuery({
        queryKey: ['profileStats', targetId],
        queryFn: async () => {
            if (!targetId) return { publications: 0, followers: 0, following: 0 };
            const [pubRes, followersRes, followingRes] = await Promise.all([
                supabase.from('publications').select('*', { count: 'exact', head: true }).eq('author_id', targetId),
                supabase.from('suivis').select('*', { count: 'exact', head: true }).eq('followed_profile_id', targetId),
                supabase.from('suivis').select('*', { count: 'exact', head: true }).eq('follower_id', targetId)
            ]);
            return {
                publications: pubRes.count || 0,
                followers: followersRes.count || 0,
                following: followingRes.count || 0
            };
        },
        enabled: !!targetId
    });

    const stats = statsData || { publications: 0, followers: 0, following: 0 };

    const { data: publications = [] } = useQuery({
        queryKey: ['profilePublications', targetId],
        queryFn: async () => {
            if (!targetId) return [];
            const { data } = await supabase.from('publications').select('*, structure:structures(*), reactions(*), comments(*)').eq('author_id', targetId).order('created_at', { ascending: false });
            return data || [];
        },
        enabled: !!targetId && activeTab === 'publications'
    });

    const { data: followingList = [] } = useQuery({
        queryKey: ['profileFollowing', targetId],
        queryFn: async () => {
            if (!targetId) return [];
            const { data } = await supabase.from('suivis').select('*, followed_profile:profiles!followed_profile_id(*), structure:structures!structure_id(*)').eq('follower_id', targetId);
            return data || [];
        },
        enabled: !!targetId && activeTab === 'following'
    });

    const { data: followersList = [] } = useQuery({
        queryKey: ['profileFollowers', targetId],
        queryFn: async () => {
            if (!targetId) return [];
            const { data } = await supabase.from('suivis').select('*, follower:profiles!follower_id(*)').eq('followed_profile_id', targetId);
            return data || [];
        },
        enabled: !!targetId && activeTab === 'followers'
    });

    // ─── Anniversaire ───
    const isProfileBirthday = isBirthdayToday(profile?.date_naissance);
    const birthdayAge = getBirthdayAge(profile?.date_naissance);

    const { data: birthdayData, refetch: refetchWishes } = useQuery({
        queryKey: ['birthdayWishes', targetId],
        queryFn: async () => {
            if (!targetId || !currentUserId) return { count: 0, hasWished: false };
            const year = getCurrentWishYear();
            const [{ count }, { data: myWish }] = await Promise.all([
                supabase.from('birthday_wishes').select('*', { count: 'exact', head: true }).eq('to_user_id', targetId).eq('year', year),
                supabase.from('birthday_wishes').select('id').eq('from_user_id', currentUserId).eq('to_user_id', targetId).eq('year', year).maybeSingle(),
            ]);
            return { count: count || 0, hasWished: !!myWish };
        },
        enabled: !!targetId && !!currentUserId && isProfileBirthday,
    });

    const wishCount = birthdayData?.count || 0;
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
                await supabase.from('notifications').insert({
                    user_id: targetId,
                    title: 'Bon Anniversaire !',
                    content: `Quelqu'un vous a souhaité un joyeux anniversaire !`,
                    type: 'birthday',
                    is_read: false
                });
            }
        },
        onSuccess: () => {
            refetchWishes();
            showNotification(hasWished ? 'Souhait retiré' : 'Joyeux anniversaire envoyé !', hasWished ? 'info' : 'success');
        },
        onError: () => showNotification('Erreur lors de l\'envoi', 'error')
    });

    useEffect(() => {
        if (isMyProfile && isProfileBirthday) {
            const timer = setTimeout(() => setShowConfetti(true), 800);
            return () => clearTimeout(timer);
        }
    }, [isMyProfile, isProfileBirthday]);

    const loading = isProfileLoading;

    const toggleFollowMutation = useMutation({
        mutationFn: async () => {
            if (!currentUserId || !profile) throw new Error('Missing user');
            if (isFollowing) {
                await supabase.from('suivis').delete().eq('follower_id', currentUserId).eq('followed_profile_id', profile.id);
                return 'unfollowed';
            } else {
                const { error } = await supabase.from('suivis').insert({ follower_id: currentUserId, followed_profile_id: profile.id });
                if (error) {
                    if (error.code === '23505') {
                        await supabase.from('suivis').delete().eq('follower_id', currentUserId).eq('followed_profile_id', profile.id);
                        return 'unfollowed';
                    }
                        throw error;
                }
                await supabase.from('notifications').insert({ user_id: profile.id, title: 'Nouvel abonné', content: `${profile.prenom ?? ''} ${profile.nom ?? ''} a commencé à vous suivre`, type: 'follow', is_read: false });
                return 'followed';
            }
        },
        onSuccess: (action) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['profileStats'] });
            showNotification(action === 'followed' ? "Vous suivez maintenant ce profil" : "Vous ne suivez plus ce profil", 'success');
        }
    });

    const toggleFollow = () => {
        toggleFollowMutation.mutate();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-theme">
            <Confetti active={showConfetti} duration={7000} />
            <Navbar
                mode="subpage"
                title="Profil"
                subtitle="Informations"
                showLogo
                rightActions={
                    <>
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
                            title={theme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        </button>

                        <button
                            onClick={() => navigate('/notifications')}
                            className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
                        >
                            <Bell className="w-4.5 h-4.5" />
                        </button>
                        {isMyProfile && (
                            <button
                                onClick={handleLogout}
                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                            >
                                <LogOut className="w-4.5 h-4.5" />
                            </button>
                        )}
                    </>
                }
            />

            <ProfileHeader 
                profile={profile}
                isMyProfile={isMyProfile}
                isFollowing={isFollowing}
                isProfileBirthday={isProfileBirthday}
                birthdayAge={birthdayAge}
                wishCount={wishCount}
                hasWished={hasWished}
                wishMutation={wishMutation}
                toggleFollow={toggleFollow}
                setShowBirthdayCard={setShowBirthdayCard}
            />

            <div className="max-w-4xl mx-auto w-full px-4 relative z-20">
                <div className="bg-theme-surface backdrop-blur-2xl rounded-[2rem] border border-theme-border p-5 md:p-7 space-y-5 shadow-2xl transition-theme">
                    <ProfileTabs 
                        stats={stats}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                    />

                    <ProfileContent 
                        activeTab={activeTab}
                        profile={profile}
                        publications={publications}
                        followersList={followersList}
                        followingList={followingList}
                    />
                </div>
            </div>

            <div className="h-16"></div>

            {showBirthdayCard && profile && (
                <BirthdayCardExport profile={profile} onClose={() => setShowBirthdayCard(false)} />
            )}
        </div>
    );
};
