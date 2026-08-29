import { useEffect, useState } from "react";
import { Download, RefreshCw, X, Sparkles } from "lucide-react";

interface ServiceWorkerRegistrationWithWaiting extends ServiceWorkerRegistration {
    waiting: ServiceWorker | null;
}

export const UpdatePrompt = () => {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [offlineReady, setOfflineReady] = useState(false);
    const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        const handleControllerChange = () => {
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const reg of registrations) {
                const registration = reg as ServiceWorkerRegistrationWithWaiting;
                if (registration.waiting) {
                    setNeedRefresh(true);
                    const sw = registration.waiting;
                    setUpdateSW(() => () => {
                        sw.postMessage({ type: "SKIP_WAITING" });
                    });
                }

                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            setNeedRefresh(true);
                            setUpdateSW(() => () => {
                                newWorker.postMessage({ type: "SKIP_WAITING" });
                            });
                        }
                        if (newWorker.state === "activated" && !navigator.serviceWorker.controller) {
                            setOfflineReady(true);
                        }
                    });
                });
            }
        });

        const interval = setInterval(() => {
            navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((r) => r.update().catch(console.error));
            });
        }, 10 * 60 * 1000);

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
            clearInterval(interval);
        };
    }, []);

    const handleUpdate = () => {
        if (!updateSW) return;
        setIsUpdating(true);
        try {
            updateSW();
        } catch {
            window.location.reload();
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setOfflineReady(false);
    };

    if ((!needRefresh && !offlineReady) || dismissed) return null;

    return (
        <div className="fixed bottom-20 left-0 right-0 z-[200] flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-theme-bg/80 backdrop-blur-2xl border border-theme-border/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-500">
                <div className="h-0.5 w-full bg-gradient-to-r from-theme-accent-start to-theme-accent-end" />
                <div className="p-4 flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-theme-accent-start to-theme-accent-end flex items-center justify-center shadow-lg shadow-theme-accent-start/30">
                        {needRefresh ? <Download className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-theme-text-primary leading-tight">
                            {needRefresh ? "Mise à jour disponible !" : "Ave est prête hors-ligne"}
                        </p>
                        <p className="text-[11px] text-theme-text-secondary mt-0.5 leading-relaxed">
                            {needRefresh
                                ? "Une nouvelle version a été téléchargée. Appuyez pour l''installer."
                                : "L''application peut maintenant fonctionner sans connexion."}
                        </p>
                    </div>
                    <button onClick={handleDismiss} className="shrink-0 p-1.5 rounded-lg text-theme-text-secondary hover:bg-theme-surface hover:text-theme-text-primary transition-colors cursor-pointer" title="Ignorer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {needRefresh && (
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-theme-accent-start/30 hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isUpdating ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" /> Mise à jour en cours...</>
                            ) : (
                                <><Download className="w-4 h-4" /> Mettre à jour maintenant</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
