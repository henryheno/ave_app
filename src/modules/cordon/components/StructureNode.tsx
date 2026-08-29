import { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

interface StructureNodeProps {
    node: any;
    level?: number;
    members: any[];
}

export const StructureNode = ({ node, level = 0, members }: StructureNodeProps) => {
    const [isExpanded, setIsExpanded] = useState(level === 0);
    const hasChildren = node.children && node.children.length > 0;
    const directMembers = useMemo(() => members.filter(m => m.comi_id === node.id), [members, node.id]);

    const getTypeBadgeStyle = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'PROV':
                return 'from-indigo-600 to-blue-600 text-white border-indigo-400/20';
            case 'CODI':
                return 'from-blue-500 to-cyan-500 text-white border-blue-400/20';
            case 'CORE':
                return 'from-emerald-500 to-teal-500 text-white border-emerald-400/20';
            case 'COMA':
                return 'from-amber-500 to-orange-500 text-white border-amber-400/20';
            case 'COMI':
                return 'from-pink-500 to-rose-500 text-white border-pink-400/20';
            default:
                return 'bg-theme-surface text-theme-text-secondary border-theme-border';
        }
    };

    return (
        <div className="flex flex-col w-full animate-in fade-in duration-300">
            <div
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}
                className={`
                    flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all duration-300 gap-3
                    ${level === 0 ? 'bg-theme-surface/60 backdrop-blur-xl border-theme-border/80 shadow-lg shadow-theme-accent-start/5' : 'bg-theme-surface/30 backdrop-blur-md border-theme-border/40 ml-4 sm:ml-8'}
                    ${isExpanded && hasChildren ? 'border-theme-accent-start/40 shadow-sm shadow-theme-accent-start/5' : 'hover:bg-theme-surface/50'}
                    cursor-pointer group
                `}
            >
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`
                        px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest bg-gradient-to-br shadow border shrink-0
                        ${getTypeBadgeStyle(node.type)}
                    `}>
                        {node.type || 'UNIT'}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-theme-text-primary text-xs md:text-sm leading-none tracking-tight group-hover:text-theme-accent-end transition-colors truncate">
                            {node.name}
                        </h3>
                        <p className="text-[8px] text-theme-text-secondary font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                            <span className="text-theme-accent-start font-black">♂</span> {node.stats?.male}
                            <span className="opacity-40">|</span>
                            <span className="text-pink-500 font-black">♀</span> {node.stats?.female}
                            {node.province && (
                                <>
                                    <span className="opacity-40">|</span>
                                    <span className="opacity-80">{node.province}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-theme-border/10 pt-2.5 sm:pt-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-theme-text-secondary bg-theme-bg/60 border border-theme-border/50 px-2 py-1 rounded-lg">
                            Direct: {node.stats?.directCount}
                        </span>
                        <span className="text-[9px] font-black text-white bg-gradient-to-r from-theme-accent-start to-theme-accent-end px-3 py-1 rounded-full shadow-sm">
                            Total: {node.stats?.total}
                        </span>
                    </div>
                    {hasChildren && (
                        <ChevronRight className={`w-4 h-4 text-theme-text-secondary transition-all duration-300 ${isExpanded ? 'rotate-90 text-theme-accent-end' : ''}`} />
                    )}
                </div>
            </div>

            {/* Affichage des membres directs */}
            {isExpanded && directMembers.length > 0 && (
                <div className="ml-6 sm:ml-12 mt-2 mb-2 bg-theme-bg/30 border border-theme-border/20 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center border-b border-theme-border/20 pb-1.5">
                        <span className="text-[8px] font-black uppercase tracking-wider text-theme-text-secondary">Membres Directs ({directMembers.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {directMembers.map((m: any) => {
                            const branchNorm = (m.branche || 'enfant').toLowerCase();
                            const branchBg = branchNorm.includes('enfant') ? 'bg-yellow-500/20 text-yellow-600' : branchNorm.includes('arch') ? 'bg-red-500/20 text-red-600' : 'bg-blue-500/20 text-blue-600';
                            const branchAbbr = branchNorm.includes('enfant') ? 'KA' : branchNorm.includes('arch') ? 'AR' : 'PE';
                            return (
                                <div key={m.id} className="flex items-center justify-between p-2 bg-theme-surface/50 rounded-lg border border-theme-border/20 text-[9px] hover:border-theme-accent-start/30 transition-all duration-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-5 h-5 bg-theme-bg rounded flex items-center justify-center text-[7px] font-black text-theme-text-secondary shrink-0">
                                            {m.prenom?.[0]}{m.nom?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black uppercase text-theme-text-primary truncate">{m.prenom} {m.nom}</p>
                                            <p className="text-[7px] text-theme-text-secondary uppercase">{m.fonction || 'Membre'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[6px] font-bold px-1.5 py-0.5 rounded uppercase ${branchBg}`}>
                                            {branchAbbr}
                                        </span>
                                        <div className={`w-1 h-1 rounded-full ${m.sexe === 'M' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isExpanded && hasChildren && (
                <div className="border-l border-theme-border/30 ml-6 pl-2 sm:pl-4 mt-2 mb-2 space-y-2.5">
                    {node.children.map((child: any) => (
                        <StructureNode key={child.id} node={child} level={level + 1} members={members} />
                    ))}
                </div>
            )}
        </div>
    );
};
