import React from 'react';
import { Grid, User, Users } from 'lucide-react';

interface ProfileTabsProps {
    stats: {
        publications: number;
        followers: number;
        following: number;
    };
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ stats, activeTab, setActiveTab }) => {
    return (
        <>
            {/* STATS (Economical) */}
            <div className="flex items-center justify-around py-4 border-y border-theme-border transition-theme mt-6">
                <div className="text-center group cursor-pointer px-3">
                    <p className="text-lg font-black text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{stats.publications}</p>
                    <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Publications</p>
                </div>
                <div className="w-px h-6 bg-theme-border"></div>
                <div className="text-center group cursor-pointer px-3">
                    <p className="text-lg font-black text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{stats.followers}</p>
                    <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Abonnés</p>
                </div>
                <div className="w-px h-6 bg-theme-border"></div>
                <div className="text-center group cursor-pointer px-3">
                    <p className="text-lg font-black text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{stats.following}</p>
                    <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-widest">Suivis</p>
                </div>
            </div>

            {/* CONTENT TABS (Compact Interface Style) */}
            <div className="flex items-center gap-1.5 border-b border-theme-border overflow-x-auto no-scrollbar transition-theme">
                {[
                    { id: 'publications', label: 'Publications', icon: <Grid className="w-3.5 h-3.5" /> },
                    { id: 'info', label: 'Informations', icon: <User className="w-3.5 h-3.5" /> },
                    { id: 'followers', label: 'Abonnés', icon: <Users className="w-3.5 h-3.5" /> },
                    { id: 'following', label: 'Suivis', icon: <Users className="w-3.5 h-3.5" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-wider transition-all relative cursor-pointer ${activeTab === tab.id ? 'text-theme-accent-start' : 'text-theme-text-secondary hover:text-theme-text-primary'}`}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end rounded-t-full"></div>}
                    </button>
                ))}
            </div>
        </>
    );
};
