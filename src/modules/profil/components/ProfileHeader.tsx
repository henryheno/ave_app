import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useNotification } from '../../../monapp/NotificationContext';
import { BirthdayRing } from '../../../components/BirthdayRing';
import { ZoomableImage } from '../../../monapp/components/ZoomableImage';
import { Building2, PartyPopper, Heart, Gift, Edit3, Loader2, Camera } from 'lucide-react';

interface ProfileHeaderProps {
    profile: any;
    isMyProfile: boolean;
    isFollowing: boolean;
    isProfileBirthday: boolean;
    birthdayAge: number | null;
    wishCount: number;
    hasWished: boolean;
    wishMutation: any;
    toggleFollow: () => void;
    setShowBirthdayCard: (val: boolean) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    profile,
    isMyProfile,
    isFollowing,
    isProfileBirthday,
    birthdayAge,
    wishCount,
    hasWished,
    wishMutation,
    toggleFollow,
    setShowBirthdayCard
}) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const queryClient = useQueryClient();

    const [avatarUploading, setAvatarUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;
        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.secure_url) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ avatar_url: data.secure_url })
                    .eq('id', profile.id);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['profile'] });
                showNotification('Photo de profil mise à jour !', 'success');
            }
        } catch (err: any) {
            showNotification('Erreur lors de l\'upload : ' + err.message, 'error');
        } finally {
            setAvatarUploading(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
        }
    };

    return (
        <>
            {/* HEADER / COVER */}
            <div className="relative h-32 md:h-44 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-theme-accent-start to-theme-accent-end opacity-10"></div>
                <div className="absolute inset-0 backdrop-blur-3xl"></div>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-theme-border to-transparent"></div>
                </div>
            </div>

            {/* PROFILE INFO CARD */}
            <div className="max-w-4xl mx-auto w-full px-4 -mt-12 relative z-20">
                <div className="bg-theme-surface backdrop-blur-2xl rounded-[2rem] border border-theme-border p-5 md:p-7 space-y-5 shadow-2xl transition-theme">
                    <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                            {/* Avatar */}
                            <div className="relative -mt-16 md:-mt-20 shrink-0">
                                {isProfileBirthday ? (
                                    <BirthdayRing size="md">
                                        {profile?.avatar_url ? (
                                            <ZoomableImage src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-theme-accent-start/20 to-theme-accent-end/20 flex items-center justify-center text-theme-accent-end">
                                                <span className="font-black text-2xl uppercase tracking-tighter">{profile?.prenom?.[0]}{profile?.nom?.[0]}</span>
                                            </div>
                                        )}
                                    </BirthdayRing>
                                ) : (
                                    <div className="w-24 h-24 md:w-28 md:h-28 bg-theme-bg p-1.5 rounded-2xl shadow-2xl overflow-hidden border border-theme-border transition-theme">
                                        {profile?.avatar_url ? (
                                            <ZoomableImage src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-xl" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-theme-accent-start/20 to-theme-accent-end/20 rounded-xl flex items-center justify-center text-theme-accent-end border border-theme-accent-start/30">
                                                <span className="font-black text-2xl uppercase tracking-tighter">{profile?.prenom?.[0]}{profile?.nom?.[0]}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isMyProfile && (
                                    <>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarUpload}
                                        />
                                        <button
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={avatarUploading}
                                            className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center cursor-pointer"
                                        >
                                            {avatarUploading
                                                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                : <Camera className="w-6 h-6 text-white" />
                                            }
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="text-center md:text-left space-y-1">
                                <h1 className="text-lg md:text-xl font-black text-theme-text-primary flex items-center justify-center md:justify-start gap-2.5">
                                    {profile?.prenom} {profile?.nom}
                                    {isMyProfile && <span className="bg-theme-accent-start/10 text-theme-accent-start text-[8px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-theme-accent-start/20">Moi</span>}
                                </h1>
                                <p className="text-theme-accent-end font-bold uppercase tracking-wider text-[9px] flex items-center justify-center md:justify-start gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {profile?.comi?.name || 'Indépendant'}
                                </p>
                                {isProfileBirthday && (
                                    <div className="mt-2 inline-flex flex-col sm:flex-row items-center gap-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 px-4 py-2.5 rounded-xl text-left">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg text-white shadow-sm">
                                                <PartyPopper className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-theme-text-primary">
                                                    {isMyProfile ? `Joyeux Anniversaire !` : `C'est son anniversaire !`}
                                                    {birthdayAge && <span className="ml-1 text-theme-text-secondary font-normal">({birthdayAge} ans)</span>}
                                                </p>
                                                {!isMyProfile && wishCount > 0 && (
                                                    <p className="text-[9px] text-theme-text-secondary flex items-center gap-1 mt-0.5"><PartyPopper className="w-3 h-3 text-pink-400" /> {wishCount} souhait{wishCount > 1 ? 's' : ''}</p>
                                                )}
                                                {isMyProfile && wishCount > 0 && (
                                                    <p className="text-[9px] text-pink-400 font-bold flex items-center gap-1 mt-0.5"><Heart className="w-3 h-3 fill-pink-400" /> {wishCount} personne{wishCount > 1 ? 's ont' : ' a'} pensé à vous</p>
                                                )}
                                            </div>
                                        </div>
                                        {!isMyProfile && (
                                            <button
                                                onClick={() => wishMutation.mutate()}
                                                disabled={wishMutation.isPending}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 ${hasWished
                                                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                                                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg hover:scale-105 active:scale-95'
                                                    }`}
                                            >
                                                {wishMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : (hasWished ? <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" /> : <Gift className="w-3.5 h-3.5" />)}
                                                {hasWished ? 'Souhaité' : 'Souhaiter'}
                                            </button>
                                        )}

                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-full md:w-auto mt-4 md:mt-0">
                            {isMyProfile ? (
                                <div className="flex flex-row flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar w-full pb-2 md:pb-0">
                                    {isProfileBirthday && (
                                        <button
                                            onClick={() => setShowBirthdayCard(true)}
                                            className="px-4 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-400 rounded-xl font-black text-[9px] uppercase tracking-wider border border-pink-500/20 flex items-center gap-2 hover:bg-pink-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                                        >
                                            <Gift className="w-3.5 h-3.5" /> Exporter
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate('/complete-profile')}
                                        className="px-4 py-2 bg-theme-surface text-theme-text-primary rounded-xl font-black text-[9px] uppercase tracking-wider border border-theme-border flex items-center gap-2 hover:bg-theme-surface-hover transition-all active:scale-95 cursor-pointer shrink-0"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                                    </button>
                                    <button
                                        onClick={() => navigate('/profil/transfert')}
                                        className="px-4 py-2 bg-theme-surface text-theme-text-primary rounded-xl font-black text-[9px] uppercase tracking-wider border border-theme-border flex items-center gap-2 hover:bg-theme-surface-hover transition-all active:scale-95 cursor-pointer shrink-0"
                                    >
                                        <Building2 className="w-3.5 h-3.5" /> Transferts
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={toggleFollow}
                                    className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${isFollowing
                                        ? 'bg-theme-surface text-theme-text-primary border border-theme-border'
                                        : 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-md shadow-theme-accent-start/15 hover:scale-105'
                                        }`}
                                >
                                    {isFollowing ? 'Suivi' : 'Suivre'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
