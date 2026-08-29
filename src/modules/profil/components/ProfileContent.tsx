import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Building2, Heart, MessageCircle, ArrowLeft, Check, Users, User, Briefcase, Phone, Calendar } from 'lucide-react';
import { getMembreBrancheLabel } from '../../../lib/membreBranche';

interface ProfileContentProps {
    activeTab: string;
    profile: any;
    publications: any[];
    followersList: any[];
    followingList: any[];
}

export const ProfileContent: React.FC<ProfileContentProps> = ({
    activeTab,
    profile,
    publications,
    followersList,
    followingList
}) => {
    const navigate = useNavigate();

    const getBranchBadge = (branchName: string) => {
        const b = (branchName || '').toLowerCase().trim();
        const label = getMembreBrancheLabel(branchName);
        if (b === 'enfant' || b === 'anges' || b === 'ka') {
            return <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider">{label}</span>;
        }
        if (b === 'archange' || b === 'archanges') {
            return <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider">{label}</span>;
        }
        if (b === 'perame' || b === 'perames' || b === 'pérames') {
            return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider">{label}</span>;
        }
        return <span className="bg-theme-accent-start/10 text-theme-accent-start border border-theme-accent-start/20 text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-wider">{label}</span>;
    };

    return (
        <div className="min-h-[250px] mt-4">
            {activeTab === 'publications' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {publications.map(pub => (
                        <div key={pub.id} className="bg-theme-bg/30 p-4 rounded-2xl border border-theme-border hover:border-theme-accent-start/30 transition-all space-y-3 group/pubcard">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-theme-surface rounded-lg flex items-center justify-center text-theme-accent-end border border-theme-border">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-theme-accent-start uppercase tracking-wider">{pub.structure?.name}</p>
                                    <p className="text-[8px] text-theme-text-secondary font-bold uppercase">{new Date(pub.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <p className="text-[12px] text-theme-text-secondary line-clamp-3 leading-relaxed font-medium">{pub.content}</p>
                            <div className="flex items-center gap-4 pt-2.5 border-t border-theme-border">
                                <div className="flex items-center gap-1 text-[9px] font-black text-theme-text-secondary"><Heart className="w-3.5 h-3.5" /> {pub.reactions?.length || 0}</div>
                                <div className="flex items-center gap-1 text-[9px] font-black text-theme-text-secondary"><MessageCircle className="w-3.5 h-3.5" /> {pub.comments?.length || 0}</div>
                            </div>
                        </div>
                    ))}
                    {publications.length === 0 && (
                        <div className="col-span-2 py-16 text-center opacity-40">
                            <BookOpen className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">Aucune publication</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-1">
                    {[
                        { icon: <Building2 className="w-4 h-4" />, label: 'Paroisse (COMI)', value: profile?.comi?.name || 'Non renseigné' },
                        { icon: <Briefcase className="w-4 h-4" />, label: 'Fonction', value: profile?.fonction || 'Non renseigné' },
                        { icon: <Users className="w-4 h-4" />, label: 'Branche', value: profile?.branche, isBranch: true },
                        { icon: <Phone className="w-4 h-4" />, label: 'Téléphone', value: profile?.telephone || 'Non renseigné' },
                        { icon: <Calendar className="w-4 h-4" />, label: 'Membre depuis', value: profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Non renseigné' }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-theme-surface p-3.5 rounded-xl border border-theme-border transition-theme">
                            <div className="w-9 h-9 bg-theme-bg border border-theme-border rounded-lg flex items-center justify-center text-theme-accent-end">{item.icon}</div>
                            <div className="flex-1">
                                <p className="text-[7.5px] font-black text-theme-text-secondary uppercase tracking-wider leading-none mb-1">{item.label}</p>
                                {item.isBranch ? (
                                    <div className="mt-1">{getBranchBadge(item.value)}</div>
                                ) : (
                                    <p className="text-[12px] font-black text-theme-text-primary">{item.value}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'followers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {followersList.map(follow => (
                        <div key={follow.id}
                            onClick={() => navigate(`/profil/${follow.follower_id}`)}
                            className="flex items-center justify-between p-3.5 bg-theme-surface rounded-xl border border-theme-border group hover:border-theme-accent-start/30 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-theme-bg border border-theme-border rounded-lg flex items-center justify-center text-theme-accent-end group-hover:scale-105 transition-transform">
                                    <User className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-theme-text-primary">
                                        {follow.follower ? `${follow.follower.prenom} ${follow.follower.nom}` : 'Utilisateur inconnu'}
                                    </p>
                                    <p className="text-[8px] text-theme-accent-start font-bold uppercase tracking-wider">
                                        Membre
                                    </p>
                                </div>
                            </div>
                            <div className="p-1.5 bg-theme-accent-start/10 text-theme-accent-start rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><ArrowLeft className="w-3.5 h-3.5 rotate-180" /></div>
                        </div>
                    ))}
                    {followersList.length === 0 && (
                        <div className="col-span-2 py-16 text-center opacity-40">
                            <Users className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">Aucun abonné pour le moment</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'following' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {followingList.map(follow => (
                        <div key={follow.id}
                            onClick={() => {
                                if (follow.followed_profile_id) navigate(`/profil/${follow.followed_profile_id}`);
                            }}
                            className={`flex items-center justify-between p-3.5 bg-theme-surface rounded-xl border border-theme-border group hover:border-theme-accent-start/30 transition-all ${follow.followed_profile_id ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-theme-bg border border-theme-border rounded-lg flex items-center justify-center text-theme-accent-end group-hover:scale-105 transition-transform">
                                    {follow.followed_profile ? <User className="w-4.5 h-4.5" /> : <Building2 className="w-4.5 h-4.5" />}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-theme-text-primary">
                                        {follow.followed_profile ? `${follow.followed_profile.prenom} ${follow.followed_profile.nom}` : follow.structure?.name}
                                    </p>
                                    <p className="text-[8px] text-theme-accent-start font-bold uppercase tracking-wider">
                                        {follow.followed_profile ? 'Profil Suivi' : `${follow.structure?.type} Suivi`}
                                    </p>
                                </div>
                            </div>
                            <div className="p-1.5 bg-theme-accent-start/10 text-theme-accent-start rounded-lg"><Check className="w-3.5 h-3.5" /></div>
                        </div>
                    ))}
                    {followingList.length === 0 && (
                        <div className="col-span-2 py-16 text-center opacity-40">
                            <Users className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-xs font-black uppercase tracking-widest">Aucun suivi pour le moment</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
