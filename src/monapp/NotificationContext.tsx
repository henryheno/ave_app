/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, type ReactNode } from 'react';
import { AppNotification, ConfirmModal } from './Branding';

type NotificationType = 'success' | 'error' | 'info';

export type FollowerData = {
  id: string;
  follower?: {
    prenom?: string;
    nom?: string;
  };
};

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
  askConfirmation: (message: string, onConfirm: () => void) => void;
  showFollowersNotification: (count: number, target: 'profile' | 'structure') => void;
  showFollowersModal: (title: string, followers: FollowerData[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notif, setNotif] = useState<{ message: string; type: NotificationType } | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalBody, setModalBody] = useState<ReactNode>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotif({ message, type });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setNotif(null);
      timeoutRef.current = null;
    }, 2000); // Réduit à 2 secondes pour une meilleure réactivité
  };

  const askConfirmation = (message: string, onConfirm: () => void) => {
    setConfirm({ message, onConfirm });
  };

  const showFollowersNotification = (count: number, target: 'profile' | 'structure') => {
    const entity = target === 'profile' ? 'à toi' : 'à la structure';
    showNotification(`${count} personne${count > 1 ? 's' : ''} se sont abonnées ${entity}`);
  };

  const showFollowersModal = (title: string, followers: FollowerData[]) => {
    setModalTitle(title);
    setModalBody(
      <div className="max-h-80 overflow-y-auto">
        {followers.map((f) => (
          <div
            key={f.id}
            className="p-2 border-b border-theme-border flex justify-between items-center"
          >
            <span>{f.follower?.prenom ?? 'Inconnu'} {f.follower?.nom ?? ''}</span>
            <button
              onClick={() => {
                // TODO: implement follow‑back logic
              }}
              className="px-2 py-1 bg-theme-accent-start text-white rounded"
            >
              Suivre
            </button>
          </div>
        ))}
      </div>
    );
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const contextValue: NotificationContextType = {
    showNotification,
    askConfirmation,
    showFollowersNotification,
    showFollowersModal,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notif && <AppNotification message={notif.message} type={notif.type} onClose={() => setNotif(null)} />}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={() => {
            confirm.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-theme-surface rounded-xl p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold">{modalTitle}</h3>
              <button onClick={closeModal} className="text-theme-text-secondary">
                ✕
              </button>
            </div>
            {modalBody}
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
