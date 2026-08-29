import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../AuthContext';
import { useNotification } from '../NotificationContext';
import { getStoredShortcuts } from '../../modules/home/ParametresPage';
import {
  ArrowLeft,
  Shield,
  BarChart,
  Wrench,
  Settings,
  LifeBuoy,
  BookOpen,
  Users,
  Bell,
  User as UserIcon,
  CalendarDays,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  mode?: 'home' | 'subpage';
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
}

export const Navbar = ({
  mode = 'subpage',
  title,
  subtitle,
  showLogo = false,
  onBack,
  rightActions,
}: NavbarProps) => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [shortcuts, setShortcuts] = useState(getStoredShortcuts);

  // Sync shortcuts on window focus (for home mode)
  useEffect(() => {
    if (mode !== 'home') return;
    const onFocus = () => setShortcuts(getStoredShortcuts());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [mode]);

  // Fetch unread count with React Query
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificationsUnread', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!user?.id
  });

  // Realtime notification listener
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase.channel(`nav-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notificationsUnread', user.id] });
          showNotification("Nouvelle notification !", 'info');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification, queryClient]);

  const userRole = role || 'membre';

  const activeShortcutsCount = [
    shortcuts.service,
    shortcuts.formation,
    shortcuts.communaute,
    shortcuts.notifications,
    shortcuts.profil,
    shortcuts.calendrier,
    shortcuts.rapports
  ].filter(Boolean).length;

  if (mode === 'home') {
    return (
      <header className="bg-theme-bg/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 gap-4 transition-theme">
        <div className="flex items-center gap-2.5 shrink-0">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform p-0 border-none bg-transparent">
            <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
          </button>
          <div className="min-w-0">
            <span className="text-[12px] font-bold uppercase tracking-[0.25em] opacity-80 whitespace-nowrap">
              {activeShortcutsCount > 3 ? (
                <>
                  <span className="text-red-500">A</span>
                  <span className="text-blue-400">P</span>
                  <span className="text-yellow-400">A</span>
                </>
              ) : (
                <>
                  <span className="text-red-500">Armée</span>
                  {' '}
                  <span className="text-blue-400">de petits</span>
                  {' '}
                  <span className="text-yellow-400">Anges</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userRole !== 'membre' && (
            <button
              onClick={() => {
                const roleRoutes: Record<string, string> = {
                  'admin': '/admin',
                  'coordonateur': '/cordon',
                  'moderateur': '/admin'
                };
                const route = roleRoutes[userRole] || '/profil';
                navigate(route);
              }}
              className="p-2.5 bg-theme-accent-start/10 text-theme-accent-start rounded-xl border border-theme-accent-start/20 hover:bg-theme-accent-start hover:text-white transition-all cursor-pointer"
              title={`Tableau de bord ${userRole}`}
            >
              {userRole === 'admin' ? <Shield className="w-4.5 h-4.5" /> : userRole === 'coordonateur' ? <BarChart className="w-4.5 h-4.5" /> : <Wrench className="w-4.5 h-4.5" />}
            </button>
          )}

          <button
            onClick={() => navigate('/parametres')}
            className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>

          {shortcuts.calendrier && (
            <button
              onClick={() => navigate('/calendrier')}
              className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
              title="Calendrier"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          )}

          {shortcuts.rapports && userRole !== 'membre' && (
            <button
              onClick={() => navigate('/rapports')}
              className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
              title="Rapports"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          {shortcuts.service && (
            <button
              onClick={() => navigate('/service')}
              className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
              title="Service & Signalement"
            >
              <LifeBuoy className="w-4 h-4" />
            </button>
          )}

          {shortcuts.formation && (
            <button
              onClick={() => navigate('/formation')}
              className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
              title="Formation & Leçons"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          {shortcuts.communaute && (
            <button
              onClick={() => navigate('/communaute')}
              className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer"
              title="Communauté"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {shortcuts.notifications && (
            <button
              onClick={() => navigate('/notifications')}
              className={`p-2.5 rounded-xl transition-all relative border ${unreadCount > 0 ? 'bg-theme-surface border-theme-accent-start text-theme-text-primary' : 'bg-theme-surface text-theme-text-secondary border-theme-border hover:bg-theme-surface-hover'} cursor-pointer`}
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-theme-accent-start text-white text-[7px] font-black rounded-full border border-theme-bg flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {shortcuts.profil && (
            <button
              onClick={() => navigate('/profil')}
              className="w-9 h-9 rounded-xl overflow-hidden border-2 border-theme-accent-start p-0.5 hover:scale-105 transition-transform cursor-pointer"
              title="Profil"
            >
              <div className="w-full h-full bg-theme-surface rounded-lg flex items-center justify-center text-theme-text-primary">
                <UserIcon className="w-4.5 h-4.5" />
              </div>
            </button>
          )}
        </div>
      </header>
    );
  }

  // mode === 'subpage'
  return (
    <header className="bg-theme-bg/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-theme-border sticky top-0 z-50 transition-theme gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack ? onBack : () => navigate(-1)}
          className="p-2.5 bg-theme-surface text-theme-text-secondary rounded-xl hover:bg-theme-surface-hover hover:text-theme-text-primary transition-all border border-theme-border cursor-pointer shrink-0"
          title="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {showLogo && (
          <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shrink-0">
            <img loading="lazy" src="/logo2.webp" alt="Logo" className="w-7 h-7 object-contain" />
          </button>
        )}
        <div className="min-w-0">
          {title && (
            <span className="block font-black text-theme-text-primary text-base leading-none uppercase tracking-tighter truncate">
              {title}
            </span>
          )}
          {subtitle && (
            <span className="text-[8px] font-bold text-theme-accent-end uppercase tracking-[0.25em] opacity-80 truncate block mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {rightActions && (
        <div className="flex items-center gap-2 shrink-0">
          {rightActions}
        </div>
      )}
    </header>
  );
};
