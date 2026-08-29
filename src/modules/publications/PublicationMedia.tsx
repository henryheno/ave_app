import { useState } from 'react';
import { FileText, Mic, ChevronLeft, ChevronRight } from 'lucide-react';

interface PublicationMediaProps {
    mediaItems: any[];
    className?: string;
}

export const PublicationMedia = ({ mediaItems, className = '' }: PublicationMediaProps) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const nextSlide = () => {
        if (mediaItems && currentSlide < mediaItems.length - 1) {
            setCurrentSlide(s => s + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(s => s - 1);
        }
    };

    if (!mediaItems || mediaItems.length === 0) return null;

    return (
        <div className={`relative group overflow-hidden bg-black/5 ${className}`}>
            <div
                className="flex transition-transform duration-300 ease-out h-full"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
                {mediaItems.map((item, i: number) => (
                    <div key={i} className="w-full h-full shrink-0 flex items-center justify-center bg-black/5">
                        {item.type === 'pdf' || item.type === 'document' ? (
                            <div className="space-y-0 w-full h-full flex flex-col">
                                <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(item.url)}&embedded=true`} className="w-full flex-1 border-none bg-white min-h-[360px]" title={`Document ${i}`} />
                                <div className="p-3 bg-theme-bg border-t border-theme-border flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-theme-surface text-theme-accent-start rounded-lg"><FileText className="w-4 h-4" /></div>
                                        <p className="text-[9px] font-black text-theme-text-secondary uppercase tracking-widest">
                                            {item.type === 'pdf' ? 'Document PDF' : 'Document Word'}
                                        </p>
                                    </div>
                                    <a href={item.url} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-theme-accent-start to-theme-accent-end text-white px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider">Télécharger</a>
                                </div>
                            </div>
                        ) : item.type === 'video' ? (
                            <video src={item.url} controls className="w-full h-full max-h-[85vh] md:max-h-screen bg-black object-contain" />
                        ) : item.type === 'audio' ? (
                            <div className="p-5 bg-theme-bg w-full flex flex-col items-center justify-center gap-3 text-theme-accent-start text-center h-full min-h-[360px]">
                                <Mic className="w-8 h-8 animate-bounce" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-theme-text-secondary">Note Vocale</p>
                                <audio src={item.url} controls className="w-full max-w-md" />
                            </div>
                        ) : (
                            <img loading="lazy" src={item.url} className="w-full h-full max-h-[85vh] md:max-h-screen object-contain" alt={`Media ${i}`} />
                        )}
                    </div>
                ))}
            </div>

            {mediaItems.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer z-10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextSlide}
                        disabled={currentSlide === mediaItems.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer z-10"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full z-10">
                        {mediaItems.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${currentSlide === i ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
