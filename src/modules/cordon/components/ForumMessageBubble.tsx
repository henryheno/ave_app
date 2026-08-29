import React, { useState, useRef } from 'react';
import { Reply } from 'lucide-react';

export const cleanLegacyReply = (text: string) => {
    if (text.startsWith('↩ En réponse à ')) {
        const parts = text.split('\n\n');
        if (parts.length > 1) {
            return parts.slice(1).join('\n\n');
        }
    }
    return text;
};

export const MessageContent = ({ content }: { content: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cleanedContent = cleanLegacyReply(content);
    const isLong = cleanedContent.length > 300;
    const displayContent = isExpanded || !isLong ? cleanedContent : `${cleanedContent.slice(0, 300)}...`;

    // Surligner les mentions (@[Nom])
    const renderContent = (text: string) => {
        // Détecte @[n'importe quoi]
        const mentionRegex = /(@\[.*?\])/g;
        return text.split(mentionRegex).map((part, index) => {
            if (part.match(mentionRegex)) {
                // Nettoyer les crochets pour l'affichage
                const cleanName = part.replace(/^@\[/, '@').replace(/\]$/, '');
                return <span key={index} className="font-bold text-yellow-400 bg-yellow-400/20 px-1 rounded">{cleanName}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="flex flex-col items-start">
            <span className="whitespace-pre-wrap">{renderContent(displayContent)}</span>
            {isLong && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="text-[10px] font-black uppercase tracking-wider mt-1.5 opacity-70 hover:opacity-100 transition-opacity text-theme-accent-end"
                >
                    {isExpanded ? 'Réduire' : 'Voir plus'}
                </button>
            )}
        </div>
    );
};

export const SwipeableMessage = ({ children, onSwipeLeft }: { children: React.ReactNode, onSwipeLeft: () => void }) => {
    const [translateX, setTranslateX] = useState(0);
    const startXRef = useRef<number | null>(null);
    const SWIPE_THRESHOLD = 60; // Pixels required to trigger reply

    const handleTouchStart = (e: React.TouchEvent) => {
        startXRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startXRef.current === null) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startXRef.current;
        // Only allow swiping left (negative diff)
        if (diff < 0 && diff > -100) {
            setTranslateX(diff);
        }
    };

    const handleTouchEnd = () => {
        if (translateX < -SWIPE_THRESHOLD) {
            onSwipeLeft();
        }
        setTranslateX(0);
        startXRef.current = null;
    };

    return (
        <div 
            className="relative flex items-center w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="absolute right-4 text-theme-text-secondary opacity-50 flex items-center justify-center pointer-events-none transition-opacity" style={{ opacity: translateX < -30 ? 1 : 0 }}>
                <Reply className="w-5 h-5" />
            </div>
            <div 
                className="w-full transition-transform duration-200 ease-out"
                style={{ transform: `translateX(${translateX}px)` }}
            >
                {children}
            </div>
        </div>
    );
};
