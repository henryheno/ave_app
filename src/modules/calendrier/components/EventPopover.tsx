import { CalendarDays, Lock, X, Pencil, Trash2 } from 'lucide-react';
import { ORIGIN_STYLES } from '../types';
import type { CalendarEvent } from '../types';

interface EventPopoverProps {
    event: CalendarEvent;
    onClose: () => void;
    onEdit: (e: CalendarEvent) => void;
    onDelete: (id: string) => void;
    currentUserId: string;
}

export const EventPopover = ({ event, onClose, onEdit, onDelete, currentUserId }: EventPopoverProps) => {
    const isMine = event.author_id === currentUserId;
    const style = event.is_mandatory && event.origin !== 'mine'
        ? ORIGIN_STYLES.mandatory
        : ORIGIN_STYLES[event.origin ?? 'mine'];

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                className="bg-theme-bg border border-theme-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-5 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mb-2 ${style}`}>
                            {event.is_mandatory && event.origin !== 'mine' && <Lock className="w-2.5 h-2.5" />}
                            {event.event_type}
                        </span>
                        <h3 className="font-black text-theme-text-primary text-base leading-tight">{event.title}</h3>
                        {event.structure_name || event.structure?.name ? (
                            <p className="text-[10px] text-theme-text-secondary font-bold uppercase tracking-wider mt-1">{event.structure_name || event.structure?.name}</p>
                        ) : null}
                        {event.author && (
                            <p className="text-[10px] text-theme-text-secondary italic mt-0.5">
                                Par {event.author.prenom} {event.author.nom}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg bg-theme-surface border border-theme-border cursor-pointer shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-theme-text-secondary">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    <span>
                        {new Date(event.start_date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {event.end_date && event.end_date !== event.start_date && (
                            <> → {new Date(event.end_date + 'T00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                        )}
                    </span>
                </div>

                {event.description && (
                    <p className="text-sm text-theme-text-secondary leading-relaxed">{event.description}</p>
                )}

                {event.is_mandatory && event.origin !== 'mine' && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                        <Lock className="w-3.5 h-3.5 shrink-0" /> Événement obligatoire imposé par votre hiérarchie
                    </div>
                )}

                {isMine && (
                    <div className="flex gap-2 pt-2 border-t border-theme-border">
                        <button
                            onClick={() => { onEdit(event); onClose(); }}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-theme-surface border border-theme-border text-theme-text-primary text-xs font-black hover:bg-theme-surface-hover transition-colors cursor-pointer"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Modifier
                        </button>
                        <button
                            onClick={() => { onDelete(event.id); onClose(); }}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
