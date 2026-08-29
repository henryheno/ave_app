import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNotification } from '../../../monapp/NotificationContext';
import { X, Save, Loader2, Lock } from 'lucide-react';
import { EVENT_TYPES, getInitiaticYear } from '../types';
import type { CalendarEvent } from '../types';

interface EventModalProps {
    event?: CalendarEvent | null;
    myStructureId: string;
    onClose: () => void;
    onSaved: () => void;
    authorId: string;
    isCoordinator: boolean;
}

export const EventModal = ({ event, myStructureId, onClose, onSaved, authorId, isCoordinator }: EventModalProps) => {
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        title: event?.title ?? '',
        description: event?.description ?? '',
        event_type: event?.event_type ?? 'Activité',
        annee_initiatique: event?.annee_initiatique ?? getInitiaticYear(),
        start_date: event?.start_date ?? '',
        end_date: event?.end_date ?? '',
        is_mandatory: event?.is_mandatory ?? false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.start_date) {
            showNotification('Le titre et la date de début sont obligatoires.', 'error');
            return;
        }
        if (form.end_date && form.end_date < form.start_date) {
            showNotification('La date de fin ne peut pas être avant la date de début.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                structure_id: myStructureId,
                author_id: authorId,
                title: form.title.trim(),
                description: form.description.trim() || null,
                event_type: form.event_type,
                annee_initiatique: form.annee_initiatique,
                start_date: form.start_date,
                end_date: form.end_date || null,
                is_mandatory: isCoordinator ? form.is_mandatory : false,
            };

            let error;
            if (event?.id) {
                ({ error } = await supabase.from('calendar_events').update(payload).eq('id', event.id));
            } else {
                ({ error } = await supabase.from('calendar_events').insert(payload));
            }

            if (error) throw error;
            showNotification(event?.id ? 'Événement modifié !' : 'Événement créé !', 'success');
            onSaved();
            onClose();
        } catch (err: any) {
            showNotification(err.message || 'Erreur lors de la sauvegarde.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-theme-bg border border-theme-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-theme-border sticky top-0 bg-theme-bg z-10">
                    <h2 className="font-black text-theme-text-primary text-base">
                        {event?.id ? 'Modifier l\'événement' : 'Nouvel événement'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl bg-theme-surface border border-theme-border cursor-pointer hover:bg-theme-surface-hover">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Titre */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5 block">Titre *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Ex: Journée d'amitié annuelle"
                            className="w-full bg-theme-surface border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none"
                            required
                        />
                    </div>

                    {/* Type & Année Initiatique */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5 block">Type d'événement</label>
                            <select
                                value={form.event_type}
                                onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                                className="w-full bg-theme-surface border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none appearance-none"
                            >
                                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5 block">Année Init.</label>
                            <input
                                type="text"
                                value={form.annee_initiatique}
                                onChange={e => setForm(f => ({ ...f, annee_initiatique: e.target.value }))}
                                placeholder="ex: 2025-2026"
                                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-3 text-sm text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5 block">Date de début *</label>
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-3 text-sm text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5 block">Date de fin</label>
                            <input
                                type="date"
                                value={form.end_date}
                                min={form.start_date}
                                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-3 text-sm text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-text-secondary mb-1.5 block">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3}
                            placeholder="Détails supplémentaires..."
                            className="w-full bg-theme-surface border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-text-primary focus:ring-2 focus:ring-theme-accent-start/20 outline-none resize-none"
                        />
                    </div>

                    {/* Obligatoire (seulement pour les coordonnateurs) */}
                    {isCoordinator && (
                        <label className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl cursor-pointer hover:bg-red-500/15 transition-colors">
                            <input
                                type="checkbox"
                                checked={form.is_mandatory}
                                onChange={e => setForm(f => ({ ...f, is_mandatory: e.target.checked }))}
                                className="mt-0.5 w-4 h-4 accent-red-500 cursor-pointer"
                            />
                            <div>
                                <p className="text-sm font-black text-red-400 flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5" /> Imposer aux structures filles
                                </p>
                                <p className="text-[10px] text-red-400/70 mt-0.5">
                                    Cet événement sera visible et marqué comme obligatoire pour toutes vos structures enfants.
                                </p>
                            </div>
                        </label>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-3.5 bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {event?.id ? 'Modifier' : 'Créer'}
                    </button>
                </form>
            </div>
        </div>
    );
};
