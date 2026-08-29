import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCurrentProfile } from '../../lib/profileCache';
import { getStructures } from '../../lib/structureCache';
import { PageLoader } from '../../monapp/Branding';
import { useAuth } from '../../monapp/AuthContext';
import { useNotification } from '../../monapp/NotificationContext';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, CalendarDays, Lock } from 'lucide-react';

import { MONTHS, DAYS, ORIGIN_STYLES } from './types';
import type { CalendarEvent } from './types';
import { EventModal } from './components/EventModal';
import { EventPopover } from './components/EventPopover';
import { StructureNavigator } from './components/StructureNavigator';
import { NotificationService } from './services/notifications';

export const CalendarPage = () => {
    const navigate = useNavigate();
    const { showNotification, askConfirmation } = useNotification();

    const [currentDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
    const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
    const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [showStructureModal, setShowStructureModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [navPath, setNavPath] = useState<any[]>([]);

    useEffect(() => {
        NotificationService.requestPermissions();
    }, []);

    const goToStructureRoot = () => setNavPath([]);
    const goToBreadcrumb = (index: number) => setNavPath(prev => prev.slice(0, index + 1));
    const drillIntoStructure = (structure: any) => setNavPath(prev => [...prev, structure]);
    const selectStructureAndClose = (structureId: string) => {
        setSelectedStructureId(structureId);
        setShowStructureModal(false);
    };

    const { data: userProfile } = useQuery({
        queryKey: ['calendarProfile'],
        queryFn: () => getCurrentProfile()
    });

    const { role } = useAuth();
    const isCoordinator = ['admin', 'superadmin', 'coordonateur', 'coordinateur_general', 'coordinateur_provincial'].includes(role ?? '');

    const { data: allStructures = [] } = useQuery({
        queryKey: ['structures'],
        queryFn: async () => await getStructures()
    });

    const myStructure = useMemo(() => {
        if (!userProfile || !allStructures.length) return null;
        const myStructId = userProfile.coordinated_structure_id ?? userProfile.comi_id;
        return allStructures.find(s => s.id === myStructId) ?? null;
    }, [userProfile, allStructures]);

    const relatedStructures = useMemo(() => {
        if (!myStructure || !allStructures.length) return { ancestors: [], children: [] };
        
        const ancestors: any[] = [];
        let cur = allStructures.find(s => s.id === myStructure.parent_id) ?? null;
        const visited = new Set<string>();
        while (cur && !visited.has(cur.id)) {
            visited.add(cur.id);
            ancestors.push(cur);
            cur = allStructures.find(s => s.id === cur.parent_id) ?? null;
        }
        ancestors.reverse();

        const descendants: any[] = [];
        const queue = [myStructure.id];
        while (queue.length > 0) {
            const pid = queue.shift();
            const directChildren = allStructures.filter(s => s.parent_id === pid);
            descendants.push(...directChildren);
            queue.push(...directChildren.map(s => s.id));
        }

        return { ancestors, children: descendants };
    }, [myStructure, allStructures]);

    const { data: events = [], refetch: loadEvents } = useQuery({
        queryKey: ['calendar_events', myStructure?.id],
        queryFn: async () => {
            if (!myStructure || !allStructures.length) return [];

            const ancestorIds = relatedStructures.ancestors.map(s => s.id);
            const childIds = relatedStructures.children.map(s => s.id);
            const allIds = [myStructure.id, ...ancestorIds, ...childIds];
            
            if (!allIds.length) return [];

            const { data, error } = await supabase
                .from('calendar_events')
                .select('*, author:profiles(*), structure:structures(*)')
                .in('structure_id', allIds)
                .order('start_date', { ascending: true });

            if (error) { console.error(error); return []; }

            const structMap = Object.fromEntries(allStructures.map(s => [s.id, s]));
            const myStructId = myStructure.id;

            return (data ?? []).map(ev => {
                const struct = structMap[ev.structure_id];
                let origin: 'mine' | 'parent' | 'child' = 'mine';
                if (ev.structure_id !== myStructId) {
                    if (ancestorIds.includes(ev.structure_id)) origin = 'parent';
                    else if (childIds.includes(ev.structure_id)) origin = 'child';
                }
                return {
                    ...ev,
                    structure_name: struct?.name,
                    structure_type: struct?.type,
                    origin,
                };
            });
        },
        enabled: !!myStructure && allStructures.length > 0
    });

    useEffect(() => {
        events.forEach(ev => NotificationService.scheduleEventReminders(ev));
    }, [events]);

    // ─── Filtrage par vue ─────────────────────────────────────────────────────
    const visibleEvents = useMemo(() => {
        const targetId = selectedStructureId ?? myStructure?.id;
        if (!targetId) return [];

        if (targetId === myStructure?.id) {
            return events.filter(ev =>
                ev.structure_id === targetId || (ev.origin === 'parent' && ev.is_mandatory)
            );
        } else {
            return events.filter(ev => ev.structure_id === targetId);
        }
    }, [events, selectedStructureId, myStructure]);

    // ─── Jours du mois avec événements ────────────────────────────────────────
    const daysInMonth = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        const cells: (number | null)[] = Array(firstDay).fill(null);
        for (let d = 1; d <= totalDays; d++) cells.push(d);
        return cells;
    }, [currentMonth, currentYear]);

    const getEventsForDay = useCallback((day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return visibleEvents.filter(ev => {
            const start = ev.start_date;
            const end = ev.end_date ?? ev.start_date;
            return dateStr >= start && dateStr <= end;
        });
    }, [visibleEvents, currentMonth, currentYear]);

    const today = new Date();
    const isToday = (day: number) =>
        day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

    // ─── Actions ──────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        askConfirmation('Cette action est irréversible. Supprimer cet événement ?', async () => {
            const { error } = await supabase.from('calendar_events').delete().eq('id', id);
            if (error) showNotification('Erreur lors de la suppression.', 'error');
            else { 
                showNotification('Événement supprimé.', 'success'); 
                NotificationService.cancelEventReminders({ id } as CalendarEvent);
                loadEvents(); 
            }
        });
    };

    const childStructures = allStructures.filter(s => s.parent_id === myStructure?.id);
    const hasChildren = childStructures.length > 0;
    const hasParent = myStructure?.parent_id != null;

    const loading = !userProfile || allStructures.length === 0;

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text-primary pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-theme-bg/90 backdrop-blur-xl border-b border-theme-border">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-theme-surface border border-theme-border rounded-xl cursor-pointer hover:bg-theme-surface-hover transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black text-sm uppercase tracking-widest text-theme-text-primary truncate">Calendrier</h1>
                        <p className="text-[10px] font-bold text-theme-text-secondary truncate">{myStructure?.name ?? 'Personnel'}</p>
                    </div>
                    {isCoordinator && myStructure && (
                        <button
                            onClick={() => { setEditingEvent(null); setShowModal(true); }}
                            className="p-2.5 bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Bouton de sélection de structure */}
                {(relatedStructures.ancestors.length > 0 || relatedStructures.children.length > 0) && (
                    <div className="px-4 py-3 bg-theme-surface border-t border-theme-border flex items-center justify-between gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary shrink-0">
                            Affichage :
                        </span>
                        <button
                            onClick={() => setShowStructureModal(true)}
                            className="flex-1 bg-theme-bg border border-theme-border rounded-xl px-4 py-2 flex items-center justify-between hover:border-theme-accent-start/50 transition-colors"
                        >
                            <div className="text-left truncate mr-2">
                                <span className="block text-xs font-bold text-theme-text-primary truncate">
                                    {selectedStructureId === myStructure.id || !selectedStructureId
                                        ? `Mon Calendrier (${myStructure.type} ${myStructure.name})`
                                        : (() => {
                                            const s = allStructures.find(s => s.id === selectedStructureId);
                                            return s ? `${s.type} ${s.name}` : "Sélectionner...";
                                        })()}
                                </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-theme-text-secondary shrink-0" />
                        </button>
                    </div>
                )}
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-4">
                {/* Navigation mois */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                            else setCurrentMonth(m => m - 1);
                        }}
                        className="p-2 rounded-xl bg-theme-surface border border-theme-border cursor-pointer hover:bg-theme-surface-hover transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="font-black text-theme-text-primary text-base">
                        {MONTHS[currentMonth]} {currentYear}
                    </h2>
                    <button
                        onClick={() => {
                            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                            else setCurrentMonth(m => m + 1);
                        }}
                        className="p-2 rounded-xl bg-theme-surface border border-theme-border cursor-pointer hover:bg-theme-surface-hover transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Grille */}
                <div className="bg-theme-surface rounded-3xl border border-theme-border overflow-hidden shadow-sm">
                    {/* Entêtes jours */}
                    <div className="grid grid-cols-7">
                        {DAYS.map(d => (
                            <div key={d} className="py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-theme-text-secondary border-b border-theme-border">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Cellules */}
                    <div className="grid grid-cols-7">
                        {daysInMonth.map((day, idx) => {
                            const dayEvents = day ? getEventsForDay(day) : [];
                            const hasMandatory = dayEvents.some(e => e.is_mandatory && e.origin !== 'mine');
                            const hasOwn = dayEvents.some(e => e.origin === 'mine');
                            const hasChild = dayEvents.some(e => e.origin === 'child');
                            const hasParentEv = dayEvents.some(e => e.origin === 'parent' && !e.is_mandatory);

                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (!day || !dayEvents.length) return;
                                        if (dayEvents.length === 1) { setSelectedEvent(dayEvents[0]); }
                                    }}
                                    className={`min-h-[52px] p-1 border-r border-b border-theme-border/40 last:border-r-0 flex flex-col gap-0.5 transition-colors ${day ? 'cursor-pointer hover:bg-theme-bg/50' : ''}`}
                                >
                                    {day && (
                                        <>
                                            <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full mx-auto ${
                                                isToday(day)
                                                    ? 'bg-gradient-to-br from-theme-accent-start to-theme-accent-end text-white shadow-sm'
                                                    : 'text-theme-text-primary'
                                            }`}>{day}</span>
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                {hasMandatory && <div className="h-1 rounded-full bg-red-400" title="Obligatoire" />}
                                                {hasOwn && <div className="h-1 rounded-full bg-theme-accent-start" />}
                                                {hasParentEv && <div className="h-1 rounded-full bg-blue-400" />}
                                                {hasChild && <div className="h-1 rounded-full bg-emerald-400" />}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Légende */}
                <div className="flex flex-wrap gap-3 px-1">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-theme-accent-start" /><span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider">Mes événements</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-red-400" /><span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider">Obligatoire</span></div>
                    {hasParent && <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-400" /><span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider">Hiérarchie</span></div>}
                    {hasChildren && <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-emerald-400" /><span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-wider">Fils</span></div>}
                </div>

                {/* Liste des événements du mois */}
                {(() => {
                    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                    const monthEvents = visibleEvents.filter(ev => ev.start_date.startsWith(monthStr) || (ev.end_date ?? '').startsWith(monthStr));
                    if (!monthEvents.length) return (
                        <div className="text-center py-10 text-theme-text-secondary">
                            <CalendarDays className="w-8 h-8 mx-auto opacity-30 mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-50">Aucun événement ce mois</p>
                        </div>
                    );

                    return (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary px-1">Événements du mois</h3>
                            {monthEvents.map(ev => {
                                const style = ev.is_mandatory && ev.origin !== 'mine'
                                    ? ORIGIN_STYLES.mandatory
                                    : ORIGIN_STYLES[ev.origin ?? 'mine'];
                                return (
                                    <button
                                        key={ev.id}
                                        onClick={() => setSelectedEvent(ev)}
                                        className="w-full text-left bg-theme-surface border border-theme-border rounded-2xl p-3.5 hover:bg-theme-surface-hover transition-colors cursor-pointer flex items-start gap-3"
                                    >
                                        <div className={`shrink-0 mt-0.5 px-2 py-1 rounded-lg text-[9px] font-black border ${style} flex items-center gap-1`}>
                                            {ev.is_mandatory && ev.origin !== 'mine' && <Lock className="w-2.5 h-2.5" />}
                                            {new Date(ev.start_date + 'T00:00').getDate()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-theme-text-primary text-sm truncate">{ev.title}</p>
                                            <p className="text-[10px] text-theme-text-secondary font-bold truncate">{ev.event_type} · {ev.structure_name}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })()}
            </main>

            {/* Modals */}
            {showModal && myStructure && userProfile && (
                <EventModal
                    event={editingEvent}
                    myStructureId={myStructure.id}
                    authorId={userProfile.id}
                    isCoordinator={!!isCoordinator}
                    onClose={() => { setShowModal(false); setEditingEvent(null); }}
                    onSaved={loadEvents}
                />
            )}

            {selectedEvent && (
                <EventPopover
                    event={selectedEvent}
                    currentUserId={userProfile?.id ?? ''}
                    onClose={() => setSelectedEvent(null)}
                    onEdit={e => { setSelectedEvent(null); setEditingEvent(e); setShowModal(true); }}
                    onDelete={handleDelete}
                />
            )}

            {/* Modal Drill-down de Sélection de Structure */}
            {showStructureModal && myStructure && (
                <StructureNavigator
                    myStructure={myStructure}
                    allStructures={allStructures}
                    relatedStructures={relatedStructures}
                    selectedStructureId={selectedStructureId}
                    navPath={navPath}
                    onClose={() => setShowStructureModal(false)}
                    onGoToRoot={goToStructureRoot}
                    onGoToBreadcrumb={goToBreadcrumb}
                    onDrillIntoStructure={drillIntoStructure}
                    onSelectStructureAndClose={selectStructureAndClose}
                />
            )}
        </div>
    );
};
