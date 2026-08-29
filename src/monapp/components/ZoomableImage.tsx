import { useState, useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ZoomableImageProps {
    src: string;
    alt?: string;
    className?: string;
}

export const ZoomableImage = ({ src, alt = "Image", className = "" }: ZoomableImageProps) => {
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        if (isZoomed) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isZoomed]);

    return (
        <>
            <div 
                className={`relative group cursor-pointer overflow-hidden ${className}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(true);
                }}
            >
                <img 
                    src={src} 
                    alt={alt} 
                    loading="lazy" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {isZoomed && createPortal(
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsZoomed(false)}
                >
                    <button 
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsZoomed(false);
                        }}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img 
                        src={src} 
                        alt={alt} 
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>,
                document.body
            )}
        </>
    );
};
