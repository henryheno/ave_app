/* eslint-disable react-refresh/only-export-components */
// Chemins des logos dans /public
export const BRANDING = {
    LOGO: '/logo2.webp',
    LOGO2: '/logo2.webp',
    COLORS: {
        PRIMARY: 'blue-600',
        SECONDARY: 'blue-900',
        SUCCESS: 'green-500',
        ERROR: 'red-500'
    }
};

export const PageLoader = () => {
    return (
        <div className="fixed inset-0 bg-theme-bg z-[9999] flex flex-col items-center justify-center p-6 text-center transition-theme">
            <div className="relative">
                <div className="w-24 h-24 border-4 border-theme-border border-t-theme-accent-start rounded-full animate-spin"></div>
                <img loading="lazy"
                    src={BRANDING.LOGO}
                    alt="Loading..."
                    className="absolute inset-0 m-auto w-12 h-12 object-contain animate-pulse"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                />
            </div>
            <p className="mt-6 text-xs font-black text-theme-text-primary uppercase tracking-[0.2em] animate-pulse">Chargement en cours...</p>
        </div>
    );
};

export const AppNotification = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
    <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-theme-bg/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
    >
        <div
            className={`bg-theme-surface p-6 w-full max-w-sm rounded-[2rem] shadow-2xl border ${type === 'error' ? 'border-red-500/20' : 'border-blue-500/20'} flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-300`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 ${type === 'error' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                <img loading="lazy" src={BRANDING.LOGO2} alt="Alert" className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/564/564619.png' }} />
            </div>
            <div className="flex-1 w-full space-y-1">
                <p className={`text-[10px] font-black uppercase tracking-widest ${type === 'error' ? 'text-red-500' : 'text-theme-accent-start'}`}>
                    {type === 'error' ? 'Attention' : 'Notification'}
                </p>
                <p className="text-base font-bold text-theme-text-primary leading-tight">{message}</p>
            </div>
            <button onClick={onClose} className="w-full mt-2 py-3 bg-theme-bg text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text-primary rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer">
                Fermer
            </button>
        </div>
    </div>
);

// MODALE DE CONFIRMATION PERSONNALISÉE (Logo2)
export const ConfirmModal = ({ message, onConfirm, onCancel }: { message: string, onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm z-[20000] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <img loading="lazy" src={BRANDING.LOGO2} alt="Confirm" className="w-12 h-12 object-contain" />
            </div>
            <div className="space-y-2">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Confirmation</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
                <button
                    onClick={onConfirm}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 active:scale-95 transition-all"
                >
                    Confirmer
                </button>
                <button
                    onClick={onCancel}
                    className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                    Annuler
                </button>
            </div>
        </div>
    </div>
);
