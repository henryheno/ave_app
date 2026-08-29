import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, FileText, Globe, Activity, MessageCircle, Heart, Loader2, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { getDashboardStats } from './services/dashboardService';
import type { StructureNode } from './services/dashboardService';

export const DashboardPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'users' | 'structures' | 'publications' | 'signalements'>('users');
    const [doyensLimit, setDoyensLimit] = useState<number>(10);
    const [doyensPage, setDoyensPage] = useState<number>(1);

    const { data: stats, isLoading: loading, isError, refetch } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: getDashboardStats,
        staleTime: 0, 
        refetchOnMount: 'always',
        retry: 2,
    });



    const renderBarChart = (title: string, data: Record<string, number>, color: string) => {
        const maxVal = Math.max(...Object.values(data), 1);
        return (
            <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 md:p-5 rounded-2xl md:rounded-[2rem] space-y-4">
                <h3 className="text-theme-text-primary font-bold text-base md:text-lg">{title}</h3>
                <div className="space-y-3">
                    {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([key, val]) => (
                        <div key={key} className="space-y-1">
                            <div className="flex justify-between text-[11px] md:text-xs font-medium text-theme-text-primary opacity-80">
                                <span className="capitalize">{key || 'Non défini'}</span>
                                <span>{val}</span>
                            </div>
                            <div className="w-full bg-theme-surface rounded-full h-1.5 md:h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${color}`}
                                    style={{ width: `${(val / maxVal) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {Object.keys(data).length === 0 && (
                        <p className="text-sm text-theme-text-secondary opacity-70 italic">Aucune donnée</p>
                    )}
                </div>
            </div>
        );
    };

    const renderPieChart = (title: string, data: Record<string, number>, colors: string[]) => {
        const total = Object.values(data).reduce((a, b) => a + b, 0);
        if (total === 0) {
            return (
                <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 md:p-5 rounded-2xl md:rounded-[2rem] space-y-4 h-full">
                    <h3 className="text-theme-text-primary font-bold text-base md:text-lg">{title}</h3>
                    <p className="text-sm text-theme-text-secondary opacity-70 italic">Aucune donnée</p>
                </div>
            );
        }

        let currentAngle = 0;
        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).filter(([_, val]) => val > 0);
        const gradientStops = entries.map(([_, val], idx) => {
            const percentage = (val / total) * 100;
            const start = currentAngle;
            const end = currentAngle + percentage;
            currentAngle = end;
            return `${colors[idx % colors.length]} ${start}% ${end}%`;
        });

        const conicGradient = `conic-gradient(${gradientStops.join(', ')})`;

        return (
            <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex flex-col items-center space-y-5 h-full">
                <h3 className="text-theme-text-primary font-bold text-base md:text-lg w-full flex justify-between items-center">
                    {title}
                    <span className="text-xs font-black bg-theme-surface-hover px-2 py-1 rounded-lg text-theme-text-primary opacity-80">Total: {total}</span>
                </h3>
                <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                    <div
                        className="w-full h-full rounded-full transition-all duration-500 hover:scale-105 shadow-xl shadow-black/50"
                        style={{ background: conicGradient }}
                    />
                </div>
                <div className="w-full space-y-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
                    {entries.map(([key, val], idx) => (
                        <div key={key} className="flex items-center justify-between text-[11px] md:text-xs font-medium bg-theme-surface p-2 rounded-xl border border-theme-border hover:bg-theme-surface-hover transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-md shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                <span className="text-theme-text-primary opacity-80 capitalize truncate max-w-[100px] md:max-w-[120px]" title={key}>{key || 'Non défini'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-theme-text-primary font-black">{val}</span>
                                <span className="text-theme-text-secondary opacity-70 font-bold w-8 md:w-10 text-right">{((val / total) * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const StructureTreeNode = ({ node, level = 0 }: { node: StructureNode, level?: number }) => {
        const [expanded, setExpanded] = useState(false);
        const hasChildren = node.children && node.children.length > 0;

        const typeColors: Record<string, string> = {
            COSU: 'bg-theme-surface-hover text-theme-text-primary',
            PROV: 'bg-indigo-500/20 text-indigo-300',
            CODI: 'bg-blue-500/20 text-blue-300',
            CORE: 'bg-purple-500/20 text-purple-300',
            COMA: 'bg-[#FF3D71]/20 text-[#FF9E7D]',
        };
        const typeClass = typeColors[node.type] || 'bg-theme-surface-hover text-theme-text-secondary';

        return (
            <div className="flex flex-col w-full">
                <div
                    onClick={() => hasChildren && setExpanded(!expanded)}
                    className={`
                        flex items-center justify-between px-3 py-2 rounded-xl border mb-1.5 transition-all
                        ${level === 0 ? 'bg-theme-surface border-theme-border' : 'bg-theme-bg border-theme-border/60 ml-5'}
                        ${expanded ? 'border-[#FF3D71]/40' : ''}
                        ${hasChildren ? 'cursor-pointer hover:bg-theme-surface-hover' : 'cursor-default'}
                    `}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-widest shrink-0 ${typeClass}`}>
                            {node.type}
                        </span>
                        <span className="text-xs font-bold text-theme-text-primary truncate">{node.name}</span>
                        <span className="text-[9px] text-theme-text-secondary shrink-0">
                            {node.totalProfilesCount} mbr
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {hasChildren && (
                            <span className="text-[9px] bg-theme-bg text-theme-text-secondary px-2 py-0.5 rounded-full font-bold">
                                {node.children.length}
                            </span>
                        )}
                        {hasChildren && (
                            <ChevronRight className={`w-3.5 h-3.5 text-theme-text-secondary transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                        )}
                    </div>
                </div>

                {expanded && hasChildren && (
                    <div className="border-l border-theme-border/50 ml-4 mb-1 pl-1 space-y-0.5">
                        {node.children.map(child => (
                            <StructureTreeNode key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans">
            <header className="bg-theme-surface/80 backdrop-blur-3xl px-4 md:px-6 py-4 flex items-center justify-between border-b border-theme-border sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 md:p-3 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover transition-all border border-theme-border"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                    >
                        <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-7 h-7 object-contain" />
                    </button>
                    <div>
                        <span className="block font-black text-theme-text-primary text-lg md:text-xl leading-none uppercase tracking-tighter">Statistiques</span>
                        <span className="text-[8px] md:text-[9px] font-bold text-[#FF9E7D] uppercase tracking-[0.3em] opacity-80">Dashboard</span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto w-full p-3 md:p-6 space-y-6 pb-32">

                {/* TABS */}
                <div className="flex bg-theme-surface p-1.5 rounded-xl border border-theme-border shadow-inner w-full md:w-fit overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-gradient-to-r from-[#FF3D71] to-[#FF9E7D] text-white shadow-lg shadow-red-500/20' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface'}`}
                    >
                        <Users className="w-4 h-4" />
                        Utilisateurs
                    </button>
                    <button
                        onClick={() => setActiveTab('structures')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'structures' ? 'bg-gradient-to-r from-[#FF3D71] to-[#FF9E7D] text-white shadow-lg shadow-red-500/20' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Structures
                    </button>
                    <button
                        onClick={() => setActiveTab('publications')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'publications' ? 'bg-gradient-to-r from-[#FF3D71] to-[#FF9E7D] text-white shadow-lg shadow-red-500/20' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface'}`}
                    >
                        <Activity className="w-4 h-4" />
                        Publications
                    </button>
                    <button
                        onClick={() => setActiveTab('signalements')}
                        className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'signalements' ? 'bg-gradient-to-r from-[#FF3D71] to-[#FF9E7D] text-white shadow-lg shadow-red-500/20' : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-surface'}`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Signalements
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-8 h-8 text-[#FF3D71] animate-spin" />
                        <p className="text-theme-text-secondary font-medium animate-pulse">Chargement des statistiques...</p>
                    </div>
                ) : isError || !stats ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4 text-red-400">
                        <AlertCircle className="w-10 h-10" />
                        <p className="font-bold text-sm">Impossible de charger les statistiques.</p>
                        <button
                            onClick={() => refetch()}
                            className="mt-2 px-5 py-2 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border rounded-xl text-xs font-bold text-theme-text-primary opacity-80 transition-all"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* TAB: USERS & PROFILES */}
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-3 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest leading-none mb-1">Utilisateurs</p>
                                            <h2 className="text-xl font-black text-theme-text-primary leading-none">{stats.users.total}</h2>
                                        </div>
                                    </div>
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-3 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#FF3D71]/20 flex items-center justify-center text-[#FF3D71] shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest leading-none mb-1">Profils</p>
                                            <h2 className="text-xl font-black text-theme-text-primary leading-none">{stats.profiles.total}</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {renderPieChart("Répartition par Responsabilités", stats.users.byRole, ['#FF3D71', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'])}
                                    {renderPieChart("Répartition par Sexe", stats.profiles.bySexe, ['#06B6D4', '#EC4899', '#F97316', '#84CC16', '#6366F1'])}
                                    {renderPieChart("Répartition par Rôles", stats.profiles.byFonction, ['#EAB308', '#EF4444', '#14B8A6', '#8B5CF6', '#F43F5E', '#0EA5E9', '#22C55E'])}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    {renderBarChart("Répartition par Branche (Profils)", stats.profiles.byBranche, "bg-[#FF9E7D]")}
                                    {renderBarChart("Répartition par Tranche d'Âge (Profils)", stats.profiles.byAge, "bg-green-500")}
                                </div>

                                <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 md:p-6 rounded-2xl md:rounded-[2rem] space-y-5">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
                                        <h3 className="text-theme-text-primary font-bold text-base md:text-lg">Top des Doyens (Plus Anciens)</h3>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <span className="text-[10px] md:text-xs text-theme-text-secondary font-bold uppercase tracking-widest">Filtre:</span>
                                            <select
                                                className="bg-black/50 border border-theme-border rounded-xl px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-theme-text-primary font-bold outline-none focus:ring-2 focus:ring-[#FF3D71]"
                                                value={doyensLimit}
                                                onChange={e => {
                                                    setDoyensLimit(Number(e.target.value));
                                                    setDoyensPage(1);
                                                }}
                                            >
                                                <option value={10}>Top 10</option>
                                                <option value={25}>Top 25</option>
                                                <option value={50}>Top 50</option>
                                                <option value={100}>Top 100</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                        {stats.profiles.oldestProfiles
                                            .slice(0, doyensLimit)
                                            .slice((doyensPage - 1) * 10, doyensPage * 10)
                                            .map(p => (
                                                <div key={p.id} className="bg-theme-bg rounded-xl md:rounded-2xl p-3 md:p-4 border border-theme-border flex gap-3 md:gap-4 items-center">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-theme-surface-hover overflow-hidden shrink-0">
                                                        {p.avatar_url ? (
                                                            <img loading="lazy" src={p.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[#FF3D71] font-bold text-lg">
                                                                {p.prenom?.[0] || p.nom?.[0] || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-sm text-theme-text-primary line-clamp-1">
                                                                {p.prenom} {p.nom}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs font-black text-[#FF9E7D] mt-0.5">
                                                            {p.age} ans <span className="text-theme-text-secondary opacity-70 font-normal">({new Date(p.date_naissance).toLocaleDateString()})</span>
                                                        </div>
                                                        <p className="text-[9px] text-theme-text-secondary opacity-70 font-bold uppercase tracking-widest mt-1.5 line-clamp-1">
                                                            {p.fonction || 'Membre'} • {p.branche || 'Non défini'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        {stats.profiles.oldestProfiles.length === 0 && (
                                            <p className="text-sm text-theme-text-secondary opacity-70 italic col-span-full">Aucun profil avec date de naissance renseignée.</p>
                                        )}
                                    </div>
                                    {Math.ceil(Math.min(stats.profiles.oldestProfiles.length, doyensLimit) / 10) > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4 border-t border-theme-border">
                                            {Array.from({ length: Math.ceil(Math.min(stats.profiles.oldestProfiles.length, doyensLimit) / 10) }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setDoyensPage(i + 1)}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${doyensPage === i + 1 ? 'bg-gradient-to-br from-[#FF3D71] to-[#FF9E7D] text-theme-text-primary shadow-lg' : 'bg-theme-surface text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text-primary'}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: STRUCTURES */}
                        {activeTab === 'structures' && (
                            <div className="space-y-4">
                                <div className="bg-theme-surface border border-theme-border p-3 rounded-xl flex items-center gap-3 max-w-xs">
                                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest leading-none mb-0.5">Total Structures</p>
                                        <h2 className="text-lg font-black text-theme-text-primary leading-none">{stats.structures.total}</h2>
                                    </div>
                                </div>

                                <div className="bg-theme-surface border border-theme-border p-3 md:p-4 rounded-2xl space-y-2">
                                    <h3 className="text-theme-text-primary font-bold text-sm mb-3">Hiérarchie des Structures</h3>
                                    <div className="space-y-1">
                                        {stats.structures.tree.map(root => (
                                            <StructureTreeNode key={root.id} node={root} />
                                        ))}
                                        {stats.structures.tree.length === 0 && (
                                            <p className="text-sm text-theme-text-secondary opacity-70 italic">Aucune structure trouvée.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: PUBLICATIONS */}
                        {activeTab === 'publications' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-2 md:gap-4">
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-3 rounded-2xl flex items-center gap-2">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                            <FileText className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] md:text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest leading-none mb-1">Pubs</p>
                                            <h2 className="text-base md:text-xl font-black text-theme-text-primary leading-none">{stats.engagement.totalPublications}</h2>
                                        </div>
                                    </div>
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-3 rounded-2xl flex items-center gap-2">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#FF3D71]/20 flex items-center justify-center text-[#FF3D71] shrink-0">
                                            <Heart className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] md:text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest leading-none mb-1">Likes</p>
                                            <h2 className="text-base md:text-xl font-black text-theme-text-primary leading-none">{stats.engagement.totalReactions}</h2>
                                        </div>
                                    </div>
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-3 rounded-2xl flex items-center gap-2">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                            <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] md:text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest leading-none mb-1">Comms</p>
                                            <h2 className="text-base md:text-xl font-black text-theme-text-primary leading-none">{stats.engagement.totalComments}</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-6 rounded-[2rem] space-y-6">
                                    <h3 className="text-theme-text-primary font-bold text-lg">Publications Récentes</h3>
                                    <div className="space-y-4">
                                        {stats.engagement.recentPublications.map(pub => (
                                            <div key={pub.id} className="bg-theme-bg rounded-2xl p-4 border border-theme-border flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-theme-surface-hover overflow-hidden shrink-0">
                                                    {pub.author?.avatar_url ? (
                                                        <img loading="lazy" src={pub.author.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#FF3D71] font-bold">
                                                            {pub.author?.prenom?.[0] || 'A'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-sm text-theme-text-primary">
                                                            {pub.author?.prenom} {pub.author?.nom}
                                                        </span>
                                                        <span className="text-[10px] text-theme-text-secondary opacity-70">
                                                            {new Date(pub.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-theme-text-primary opacity-80 line-clamp-2">{pub.content}</p>
                                                    <div className="flex gap-4 pt-2">
                                                        <div className="flex items-center gap-1.5 text-xs text-theme-text-secondary">
                                                            <Heart className="w-3.5 h-3.5" /> {pub.reactionsCount}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-theme-text-secondary">
                                                            <MessageCircle className="w-3.5 h-3.5" /> {pub.commentsCount}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {stats.engagement.recentPublications.length === 0 && (
                                            <p className="text-sm text-theme-text-secondary opacity-70 italic">Aucune publication.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: SIGNALEMENTS */}
                        {activeTab === 'signalements' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest mb-1">Total</p>
                                        <h2 className="text-2xl font-black text-theme-text-primary">{stats.signalements.total}</h2>
                                    </div>
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest mb-1">Bugs</p>
                                        <h2 className="text-2xl font-black text-theme-text-primary">{stats.signalements.byType['bug'] || 0}</h2>
                                    </div>
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-theme-text-secondary uppercase tracking-widest mb-1">Améliorations</p>
                                        <h2 className="text-2xl font-black text-theme-text-primary">{stats.signalements.byType['amelioration'] || 0}</h2>
                                    </div>
                                    <div className="bg-theme-surface backdrop-blur-xl border border-theme-border p-4 rounded-2xl border-orange-500/30">
                                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Ouverts</p>
                                        <h2 className="text-2xl font-black text-orange-400">{stats.signalements.byStatut['ouvert'] || 0}</h2>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {renderBarChart('Par Statut', stats.signalements.byStatut, 'bg-blue-500')}
                                    {renderPieChart('Par Type', stats.signalements.byType, ['bg-[#FF3D71]', 'bg-[#FF9E7D]'])}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </main>
        </div>
    );
};
