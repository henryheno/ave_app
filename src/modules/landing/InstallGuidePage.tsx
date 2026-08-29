import { useState, useEffect } from 'react';
import {
    Smartphone,
    Monitor,
    Share2,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Globe,
    Download,
    Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Détection d'appareil ──────────────────────────────────────────────────────

type DeviceType = 'ios' | 'android' | 'desktop';

const detectDevice = (): DeviceType => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
};

// ─── Composant numéro d'étape ────────────────────────────────────────────────

const Step = ({
    number,
    children,
}: {
    number: number;
    children: React.ReactNode;
}) => (
    <div className="flex gap-4 items-start">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF3D71] to-[#FF9E7D] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-lg shadow-[#FF3D71]/20 mt-0.5">
            {number}
        </div>
        <p className="text-gray-300 text-sm leading-relaxed pt-1">{children}</p>
    </div>
);

// ─── Card de guide ────────────────────────────────────────────────────────────

const GuideCard = ({
    id,
    title,
    subtitle,
    icon,
    accentColor,
    steps,
    isActive,
    isOpen,
    onToggle,
}: {
    id: DeviceType;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    accentColor: string;
    steps: React.ReactNode[];
    isActive: boolean;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    // Silence unused id warning
    void id;
    return (
        <div
            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isActive
                ? 'border-[#FF3D71]/50 shadow-xl shadow-[#FF3D71]/10 bg-white/[0.06]'
                : 'border-white/8 bg-white/[0.03]'
                }`}
        >
            {/* En-tête de la carte */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-5 text-left group cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-lg shrink-0 ${accentColor}`}
                    >
                        {icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-black text-white text-base leading-none">{title}</h2>
                            {isActive && (
                                <span className="px-2 py-0.5 bg-[#FF3D71]/20 border border-[#FF3D71]/30 text-[#FF3D71] text-[9px] font-black uppercase tracking-widest rounded-full">
                                    Votre appareil
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-xs mt-1 font-medium">{subtitle}</p>
                    </div>
                    <div className="text-gray-500 group-hover:text-gray-300 transition-colors shrink-0 ml-2">
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </div>
            </button>
            {/* Contenu (accordéon) */}
            {isOpen && (
                <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-white/5 w-full" />
                    {steps.map((step, i) => (
                        <Step key={i} number={i + 1}>
                            {step}
                        </Step>
                    ))}
                </div>
            )}
        </div>
    );
};


// ─── Page principale ──────────────────────────────────────────────────────────

export const InstallGuidePage = () => {
    const navigate = useNavigate();
    const [device] = useState<DeviceType>(detectDevice);
    const [openGuide, setOpenGuide] = useState<DeviceType>(device);

    // Si l'appareil change (navigateur redimensionné etc.), on ne change pas l'état ouvert
    useEffect(() => {
        setOpenGuide(device);
    }, [device]);

    const toggle = (id: DeviceType) =>
        setOpenGuide((prev) => (prev === id ? ('none' as DeviceType) : id));

    const guides: {
        id: DeviceType;

        title: string;
        subtitle: string;
        accentColor: string;
        icon: React.ReactNode;
        steps: React.ReactNode[];
    }[] = [
            {
                id: 'ios',

                title: 'iPhone / iPad',
                subtitle: 'Safari uniquement',
                accentColor: 'bg-gray-800 border border-white/10',
                icon: <Smartphone className="w-5 h-5" />,
                steps: [
                    <>
                        Ouvrez notre application dans{' '}
                        <strong className="text-white">Safari</strong>
                        {' '}(obligatoire sur iOS, pas Chrome ni Firefox).
                    </>,
                    <>
                        Appuyez sur l'icône{' '}
                        <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-white font-bold text-xs">
                            <Share2 className="w-3 h-3" /> Partager
                        </span>{' '}
                        en bas de votre écran (carré avec une flèche vers le haut).
                    </>,
                    <>
                        Faites défiler vers le bas et appuyez sur{' '}
                        <strong className="text-white">« Sur l'écran d'accueil »</strong>.
                    </>,
                    <>
                        Validez en cliquant sur{' '}
                        <strong className="text-white">Ajouter</strong> en haut à droite.
                        L'icône de l'application apparaît sur votre écran d'accueil !
                    </>,
                ],
            },
            {
                id: 'android',

                title: 'Android',
                subtitle: 'Chrome / Edge / Firefox',
                accentColor: 'bg-green-900/40 border border-green-500/20',
                icon: <Smartphone className="w-5 h-5" />,
                steps: [
                    <>
                        Ouvrez l'application dans votre navigateur (ex:{' '}
                        <strong className="text-white">Chrome</strong>).
                    </>,
                    <>
                        Si un bandeau{' '}
                        <strong className="text-white">« Installer l'application »</strong>{' '}
                        apparaît en bas, cliquez simplement dessus et c'est fait !
                    </>,
                    <>
                        Sinon, appuyez sur les{' '}
                        <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-white font-bold text-xs">
                            <MoreVertical className="w-3 h-3" /> 3 points
                        </span>{' '}
                        en haut à droite du navigateur.
                    </>,
                    <>
                        Sélectionnez{' '}
                        <strong className="text-white">Installer l'application</strong>{' '}
                        ou{' '}
                        <strong className="text-white">Ajouter à l'écran d'accueil</strong>.
                    </>,
                    <>
                        Confirmez en cliquant sur{' '}
                        <strong className="text-white">Installer</strong>. L'icône
                        apparaît sur votre écran d'accueil comme une app native !
                    </>,
                ],
            },
            {
                id: 'desktop',

                title: 'Ordinateur',
                subtitle: 'Chrome / Edge / Safari Mac',
                accentColor: 'bg-blue-900/40 border border-blue-500/20',
                icon: <Monitor className="w-5 h-5" />,
                steps: [
                    <>
                        Ouvrez l'application dans{' '}
                        <strong className="text-white">Chrome</strong> ou{' '}
                        <strong className="text-white">Edge</strong>.
                    </>,
                    <>
                        Regardez tout à droite de la barre d'adresse : vous verrez une
                        icône{' '}
                        <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md text-white font-bold text-xs">
                            <Download className="w-3 h-3" /> Installer
                        </span>
                        . Cliquez dessus.
                    </>,
                    <>
                        Ou via le menu : cliquez sur les{' '}
                        <strong className="text-white">3 points</strong> en haut à droite,
                        puis sur{' '}
                        <strong className="text-white">
                            Enregistrer et partager → Installer l'application
                        </strong>
                        .
                    </>,
                    <>
                        L'application s'ouvre dans une{' '}
                        <strong className="text-white">fenêtre indépendante</strong> sans
                        barre de navigation, comme une application de bureau classique.
                    </>,
                ],
            },
        ];

    return (
        <div className="min-h-screen bg-[#09090B] text-white font-sans relative overflow-x-hidden pb-16">
            {/* Arrière-plan décoratif */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-15%] right-[-10%] w-[350px] h-[350px] bg-[#FF3D71]/6 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-24 relative z-10">
                {/* Header */}
                <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center bg-[#09090B]/80 backdrop-blur-md border-b border-white/5 px-4 py-4 md:px-8">
                    <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/10 blur-md rounded-full"></div>
                                <img loading="lazy" src="/logo2.webp" alt="Logo APA" className="w-10 h-10 object-contain relative z-10 drop-shadow-lg" />
                            </div>
                            <div className="text-xl font-black tracking-widest drop-shadow-md">
                                <span className="text-[#FF3D71]">A</span>.
                                <span className="text-blue-500">P</span>.
                                <span className="text-yellow-500">A</span>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                title="Retour à l'accueil"
                            >
                                <Home className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </nav>

                <div className="mb-8">
                    <h1 className="font-black text-white text-xl leading-none uppercase tracking-tighter">
                        Guide d'installation
                    </h1>
                    <span className="text-[9px] font-bold text-[#FF9E7D] uppercase tracking-[0.25em] opacity-80">
                        Application Mobile & Desktop
                    </span>
                </div>

                {/* Bannière intro */}
                <div className="bg-gradient-to-r from-[#FF3D71]/10 to-[#FF9E7D]/5 border border-[#FF3D71]/20 rounded-2xl p-5 mb-6 flex gap-4 items-start">
                    <div className="w-10 h-10 bg-[#FF3D71]/20 rounded-xl flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-[#FF3D71]" />
                    </div>
                    <div>
                        <p className="text-white font-black text-sm mb-1">
                            Installez l'application en quelques secondes
                        </p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Sans passer par l'App Store ou Google
                            Play Store.
                        </p>
                    </div>
                </div>

                {/* Badge appareil détecté */}
                <div className="flex items-center gap-2 mb-4 px-1">
                    <CheckCircle2 className="w-4 h-4 text-[#FF3D71]" />
                    <p className="text-xs text-gray-400 font-medium">
                        Appareil détecté :{' '}
                        <span className="text-white font-black">
                            {device === 'ios'
                                ? 'iPhone / iPad'
                                : device === 'android'
                                    ? 'Android'
                                    : 'Ordinateur'}
                        </span>{' '}
                        <br />
                        Le guide correspondant est affiché en premier.
                    </p>
                </div>

                {/* Guides (accordéon) */}
                <div className="space-y-3">
                    {guides.map((g) => (
                        <GuideCard
                            key={g.id}
                            {...g}
                            isActive={g.id === device}
                            isOpen={openGuide === g.id}
                            onToggle={() => toggle(g.id)}
                        />
                    ))}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-10 font-medium tracking-wide">
                    {new Date().getFullYear()} A.P.A. TOUS DROITS RÉSERVÉS.
                </p>
            </div>
        </div>
    );
};
