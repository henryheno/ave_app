import React from 'react';
import { Gift } from 'lucide-react';

interface BirthdayRingProps {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const sizeConfig = {
  sm: {
    outer: 'w-12 h-12',
    cake: 'text-base -top-2 -right-2',
    ring: 'ring-2',
  },
  md: {
    outer: 'w-24 h-24 md:w-28 md:h-28',
    cake: 'text-xl -top-2 -right-2',
    ring: 'ring-[3px]',
  },
  lg: {
    outer: 'w-32 h-32',
    cake: 'text-2xl -top-3 -right-3',
    ring: 'ring-4',
  },
};

export const BirthdayRing: React.FC<BirthdayRingProps> = ({ size = 'md', children }) => {
  const cfg = sizeConfig[size];

  return (
    <div className={`relative ${cfg.outer} shrink-0`}>
      {/* Anneau animé arc-en-ciel */}
      <div
        className={`absolute inset-0 rounded-2xl ${cfg.ring} ring-offset-1`}
        style={{
          background: 'transparent',
          boxShadow: '0 0 0 3px transparent',
          borderRadius: '1rem',
        }}
      >
        {/* Gradient animé */}
        <div
          className="absolute inset-[-3px] rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #ff6bcd, #ff6b6b)',
            backgroundSize: '300% 300%',
            animation: 'birthdayGradient 3s ease infinite',
            zIndex: -1,
            borderRadius: '1rem',
          }}
        />
      </div>

      {/* Contenu (avatar) */}
      <div className="relative z-10 w-full h-full rounded-[14px] overflow-hidden border-[3px] border-theme-bg">
        {children}
      </div>

      {/* Icône gâteau / cadeau */}
      <div className={`absolute ${cfg.cake} z-20 drop-shadow-lg p-1 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full text-white border border-white/20`}>
        <Gift className="w-full h-full" />
      </div>

      <style>{`
        @keyframes birthdayGradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};
