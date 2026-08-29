import { X, ChevronRight, Info } from 'lucide-react';

interface StructureNavigatorProps {
    myStructure: any;
    allStructures: any[];
    relatedStructures: { ancestors: any[], children: any[] };
    selectedStructureId: string | null;
    navPath: any[];
    onClose: () => void;
    onGoToRoot: () => void;
    onGoToBreadcrumb: (index: number) => void;
    onDrillIntoStructure: (struct: any) => void;
    onSelectStructureAndClose: (id: string) => void;
}

export const StructureNavigator = ({
    myStructure,
    relatedStructures,
    selectedStructureId,
    navPath,
    onClose,
    onGoToRoot,
    onGoToBreadcrumb,
    onDrillIntoStructure,
    onSelectStructureAndClose
}: StructureNavigatorProps) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-theme-bg border border-theme-border w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between shrink-0">
                    <h3 className="text-base font-black text-theme-text-primary uppercase tracking-tighter">
                        Choisir un calendrier
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 bg-theme-surface rounded-full text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 shrink-0 border-b border-theme-border/50">
                    <button
                        type="button"
                        onClick={onGoToRoot}
                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase shrink-0 transition-colors cursor-pointer ${
                            navPath.length === 0 
                                ? 'bg-theme-accent-start/20 text-theme-accent-start border border-theme-accent-start/30' 
                                : 'bg-theme-surface text-theme-text-secondary hover:text-theme-accent-start border border-transparent'
                        }`}
                    >
                        RACINE
                    </button>
                    {navPath.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-1 shrink-0">
                            <ChevronRight className="w-3 h-3 text-theme-text-secondary/35" />
                            <button
                                type="button"
                                onClick={() => onGoToBreadcrumb(i)}
                                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase shrink-0 transition-colors cursor-pointer ${
                                    i === navPath.length - 1
                                        ? 'bg-theme-accent-start/20 text-theme-accent-start border border-theme-accent-start/30'
                                        : 'bg-theme-surface text-theme-text-secondary hover:text-theme-accent-start border border-transparent'
                                }`}
                            >
                                {p.type} {p.name}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-5 no-scrollbar pb-2">
                    {navPath.length === 0 ? (
                        <>
                            {/* Racine : Mon calendrier, Parents, Enfants directs */}
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Moi</p>
                                <button
                                    onClick={() => onSelectStructureAndClose(myStructure.id)}
                                    className="w-full text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all flex items-center justify-between group cursor-pointer"
                                >
                                    <div>
                                        <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">Mon Calendrier</p>
                                        <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{myStructure.name}</p>
                                    </div>
                                    {(selectedStructureId === myStructure.id || !selectedStructureId) && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                </button>
                            </div>

                            {relatedStructures.ancestors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Hiérarchie (Parents)</p>
                                    {relatedStructures.ancestors.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => onSelectStructureAndClose(s.id)}
                                            className="w-full text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all flex items-center justify-between group cursor-pointer"
                                        >
                                            <div>
                                                <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{s.name}</p>
                                                <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{s.type}</p>
                                            </div>
                                            {selectedStructureId === s.id && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {relatedStructures.children.filter(s => s.parent_id === myStructure.id).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Structures Filles</p>
                                    {relatedStructures.children.filter(s => s.parent_id === myStructure.id).map(s => {
                                        const hasGrandchildren = relatedStructures.children.some(c => c.parent_id === s.id);
                                        return (
                                            <div key={s.id} className="flex gap-2 group">
                                                <button
                                                    onClick={() => onSelectStructureAndClose(s.id)}
                                                    className="flex-1 text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all cursor-pointer flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{s.name}</p>
                                                        <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{s.type}</p>
                                                    </div>
                                                    {selectedStructureId === s.id && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                                </button>
                                                {hasGrandchildren && (
                                                    <button
                                                        onClick={() => onDrillIntoStructure(s)}
                                                        className="px-3 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:bg-theme-surface-hover hover:border-theme-text-secondary/50 text-[9px] font-black uppercase text-theme-text-secondary hover:text-theme-text-primary flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer w-20"
                                                    >
                                                        Explorer
                                                        <ChevronRight className="w-4 h-4 mt-0.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Dans une sous-structure */}
                            {(() => {
                                const currentParent = navPath[navPath.length - 1];
                                const subChildren = relatedStructures.children.filter(s => s.parent_id === currentParent.id);
                                return (
                                    <div className="space-y-5">
                                        <div className="p-4 rounded-2xl bg-theme-accent-start/5 border border-theme-accent-start/20 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-theme-accent-start" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary">Structure courante</p>
                                            <p className="font-black text-theme-text-primary text-base mt-1">{currentParent.type} {currentParent.name}</p>
                                            <button
                                                onClick={() => onSelectStructureAndClose(currentParent.id)}
                                                className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                    selectedStructureId === currentParent.id
                                                        ? 'bg-theme-accent-start text-white shadow-md shadow-theme-accent-start/20'
                                                        : 'bg-theme-surface border border-theme-border text-theme-text-primary hover:border-theme-accent-start/50'
                                                }`}
                                            >
                                                {selectedStructureId === currentParent.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                Voir son calendrier
                                            </button>
                                        </div>

                                        {subChildren.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary pl-2">Sous-structures</p>
                                                {subChildren.map(s => {
                                                    const hasGrandchildren = relatedStructures.children.some(c => c.parent_id === s.id);
                                                    return (
                                                        <div key={s.id} className="flex gap-2 group">
                                                            <button
                                                                onClick={() => onSelectStructureAndClose(s.id)}
                                                                className="flex-1 text-left px-4 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-accent-start/50 transition-all cursor-pointer flex items-center justify-between"
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-sm text-theme-text-primary group-hover:text-theme-accent-start transition-colors">{s.name}</p>
                                                                    <p className="text-[10px] text-theme-text-secondary uppercase mt-0.5">{s.type}</p>
                                                                </div>
                                                                {selectedStructureId === s.id && <div className="w-2.5 h-2.5 rounded-full bg-theme-accent-start shadow-[0_0_8px_rgba(235,87,87,0.6)]" />}
                                                            </button>
                                                            {hasGrandchildren && (
                                                                <button
                                                                    onClick={() => onDrillIntoStructure(s)}
                                                                    className="px-3 py-3 rounded-2xl bg-theme-surface border border-theme-border hover:bg-theme-surface-hover hover:border-theme-text-secondary/50 text-[9px] font-black uppercase text-theme-text-secondary hover:text-theme-text-primary flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer w-20"
                                                                >
                                                                    Explorer
                                                                    <ChevronRight className="w-4 h-4 mt-0.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center bg-theme-surface/50 rounded-2xl border border-theme-border/50 border-dashed">
                                                <Info className="w-6 h-6 mx-auto mb-2 text-theme-text-secondary/50" />
                                                <p className="text-xs font-bold text-theme-text-secondary">Aucune sous-structure</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
