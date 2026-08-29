import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications';
import type { CalendarEvent } from '../types';

// Fonction utilitaire pour générer un ID numérique (requis par Capacitor) à partir d'une string
const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export const NotificationService = {
    async requestPermissions(): Promise<boolean> {
        try {
            const permission = await LocalNotifications.requestPermissions();
            return permission.display === 'granted';
        } catch (error) {
            console.error('Erreur lors de la demande de permission:', error);
            // Fallback silencieux (ex: sur le web si non supporté ou bloqué)
            return false;
        }
    },

    async scheduleEventReminders(event: CalendarEvent) {
        if (!event.start_date) return;
        
        const startDate = new Date(event.start_date);
        const now = new Date();
        const notifications: ScheduleOptions['notifications'] = [];

        // ID de base (doit être un entier)
        const baseId = hashCode(event.id);

        // 1. Rappel 1 jour avant
        const oneDayBefore = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        if (oneDayBefore > now) {
            notifications.push({
                id: baseId + 1, // ID unique pour le rappel de 24h
                title: 'Événement demain !',
                body: `${event.title} aura lieu demain à ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                schedule: { at: oneDayBefore },
                extra: { eventId: event.id }
            });
        }

        // 2. Rappel 1 heure avant
        const oneHourBefore = new Date(startDate.getTime() - 60 * 60 * 1000);
        if (oneHourBefore > now) {
            notifications.push({
                id: baseId + 2, // ID unique pour le rappel de 1h
                title: 'Événement imminent !',
                body: `${event.title} commence dans 1 heure.`,
                schedule: { at: oneHourBefore },
                extra: { eventId: event.id }
            });
        }

        if (notifications.length > 0) {
            try {
                await LocalNotifications.schedule({ notifications });
            } catch (error) {
                console.error('Erreur lors de la programmation des notifications:', error);
            }
        }
    },

    async cancelEventReminders(event: CalendarEvent) {
        const baseId = hashCode(event.id);
        try {
            await LocalNotifications.cancel({
                notifications: [{ id: baseId + 1 }, { id: baseId + 2 }]
            });
        } catch (error) {
            console.error('Erreur lors de l\'annulation des notifications:', error);
        }
    }
};
