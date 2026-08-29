import React, { useState } from 'react';
import { Building2, X, Users, ChevronRight, Globe, LayoutGrid, Layers, MapPin, Building } from 'lucide-react';

export const getTypeIcon = (type: string) => {
    switch (type) {
        case 'PROV': return <Globe className="w-4 h-4" />;
        case 'CODI': return <Building2 className="w-4 h-4" />;
        case 'CORE': return <LayoutGrid className="w-4 h-4" />;
        case 'COMA': return <Layers className="w-4 h-4" />;
        case 'COMI': return <MapPin className="w-4 h-4" />;
        default: return <Building className="w-4 h-4" />;
    }
};

export const getTypeColor = (type: string) => {
    switch (type) {
        case 'PROV': return 'text-purple-600 bg-purple-500/10 dark:text-purple-400';
        case 'CODI': return 'text-blue-600 bg-blue-500/10 dark:text-blue-400';
        case 'CORE': return 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400';
        case 'COMA': return 'text-amber-600 bg-amber-500/10 dark:text-amber-400';
        case 'COMI': return 'text-green-600 bg-green-500/10 dark:text-green-400';
        default: return 'text-theme-text-secondary bg-theme-surface';
    }
};

interface CommunitySidebarProps {
    showSidebar: boolean;
    setShowSidebar: (val: boolean) => void;
    structureTree: any[];
    selectedStructure: any;
    setSelectedStructure: (node: any) => void;
}

export const CommunitySidebar: React.FC<CommunitySidebarProps> = ({
    showSidebar,
    setShowSidebar,
    structureTree,
    selectedStructure,
    setSelectedStructure
}) => {

    const StructureNode = ({ node, level = 0 }: { node: any, level?: number }) => {
        const [isExpanded, setIsExpanded] = useState(level < 1);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedStructure?.id === node.id;

        return (
            <div className="flex flex-col">
                <div
                    className={`
                        flex items-center justify-between p-3 rounded-2xl mb-1 transition-all cursor-pointer group
                        ${isSelected ? 'bg-theme-accent-start/10 text-theme-text-primary translate-x-1' : 'hover:bg-theme-surface-hover text-theme-text-secondary'}
                    `}
                >
                    <div
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => {
                            setSelectedStructure(node);
                            if (window.innerWidth < 768) setShowSidebar(false);
                        }}
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-theme-accent-start/15' : getTypeColor(node.type)}`}>
                            {getTypeIcon(node.type)}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-theme-text-primary' : 'text-theme-text-secondary'}`}>{node.name}</p>
                            <p className={`text-[8px] font-bold uppercase opacity-60 ${isSelected ? 'text-theme-text-secondary' : 'text-theme-text-secondary/70'}`}>{node.type}</p>
                        </div>
                    </div>

                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className={`p-1.5 rounded-lg transition-all ${isSelected ? 'hover:bg-theme-accent-start/15 text-theme-accent-start' : 'hover:bg-theme-surface-hover text-theme-text-secondary'}`}
                        >
                            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </div>

                {isExpanded && hasChildren && (
                    <div className="ml-6 pl-2 border-l border-theme-border/50 space-y-1 animate-in slide-in-from-left-2 duration-300">
                        {node.children.map((child: any) => (
                            <StructureNode key={child.id} node={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {/* OVERLAY FOR MOBILE SIDEBAR */}
            {showSidebar && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] md:hidden"
                    onClick={() => setShowSidebar(false)}
                ></div>
            )}

            {/* SIDEBAR - STRUCTURES TREE */}
            <aside className={`
                fixed inset-y-0 left-0 z-[60] md:relative md:z-auto
                bg-theme-surface border-r border-theme-border flex flex-col shrink-0 overflow-hidden 
                transition-all duration-300 ease-in-out
                ${showSidebar ? 'w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'}
                md:flex
            `}>
                <div className="p-6 border-b border-theme-border bg-theme-bg/80 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 text-theme-text-primary mb-1">
                            <Building2 className="w-4 h-4 text-theme-accent-start" />
                            <h2 className="text-[11px] font-black uppercase tracking-widest">Hiérarchie</h2>
                        </div>
                        <p className="text-[9px] text-theme-text-secondary font-bold uppercase tracking-tight">Navigation par niveau</p>
                    </div>
                    <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 text-theme-text-secondary">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    <button
                        onClick={() => {
                            setSelectedStructure(null);
                            if (window.innerWidth < 768) setShowSidebar(false);
                        }}
                        className={`w-full text-left p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${!selectedStructure ? 'bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white shadow-lg shadow-theme-accent-start/30' : 'text-theme-text-secondary hover:bg-theme-surface-hover'}`}
                    >
                        <Users className="w-4 h-4" />
                        Toute la communauté
                    </button>

                    <div className="space-y-1">
                        {structureTree.map((node: any) => (
                            <StructureNode key={node.id} node={node} />
                        ))}
                    </div>
                </div>
            </aside>
        </>
    );
};
