import React from 'react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SamanvayLogo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) => {
  const dimensions = {
    sm: { box: 30, text: 'text-sm', sub: 'text-[8.5px]' },
    md: { box: 38, text: 'text-base', sub: 'text-[9.5px]' },
    lg: { box: 44, text: 'text-lg', sub: 'text-[10px]' },
    xl: { box: 56, text: 'text-xl', sub: 'text-[11px]' },
  };

  const { box, text, sub } = dimensions[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* High-Resolution Vector Emblem Tile */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl shadow-md overflow-hidden transition-all duration-200 group-hover:scale-105"
        style={{
          width: box,
          height: box,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
          boxShadow: '0 3px 10px rgba(37, 99, 235, 0.28)',
          border: '1.5px solid rgba(255, 255, 255, 0.35)',
        }}
        aria-label="SAMANVAY Official Emblem"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Subtle gold and saffron gradients */}
          <defs>
            <linearGradient id="goldScales" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="saffronKnot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9933" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <radialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Radiant Halo */}
          <circle cx="24" cy="24" r="19" fill="url(#haloGlow)" />
          <circle cx="24" cy="24" r="18" stroke="url(#goldScales)" strokeWidth="0.8" strokeDasharray="1.5 1.5" strokeOpacity="0.8" />

          {/* Indian Tricolor Mini Accent Bar at Top */}
          <rect x="19.5" y="4.5" width="2.8" height="1.6" fill="#FF9933" rx="0.4" />
          <rect x="22.6" y="4.5" width="2.8" height="1.6" fill="#FFFFFF" rx="0.4" />
          <rect x="25.7" y="4.5" width="2.8" height="1.6" fill="#138808" rx="0.4" />

          {/* Central Spire / Ashoka Pillar */}
          <path d="M24 7.5L25.8 11.5H22.2L24 7.5Z" fill="url(#goldScales)" />
          <rect x="23.2" y="11.5" width="1.6" height="24" fill="url(#goldScales)" />

          {/* Pedestal Base */}
          <path d="M16 37.5H32V35.5C32 35 31.5 34.5 31 34.5H17C16.5 34.5 16 35 16 35.5V37.5Z" fill="url(#goldScales)" />
          <rect x="13.5" y="37.5" width="21" height="2.2" rx="0.8" fill="#FFFFFF" fillOpacity="0.95" />

          {/* Crossbeam of Justice */}
          <rect x="9.5" y="14.5" width="29" height="2.2" rx="1.1" fill="#FFFFFF" />

          {/* Central Fulcrum Chakra */}
          <circle cx="24" cy="15.6" r="3.6" fill="#1E3A8A" stroke="url(#goldScales)" strokeWidth="1.4" />
          <circle cx="24" cy="15.6" r="1.4" fill="url(#saffronKnot)" />

          {/* Left Scale Suspension Chains */}
          <line x1="12" y1="16.5" x2="8" y2="24.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.95" />
          <line x1="12" y1="16.5" x2="16" y2="24.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.95" />
          <line x1="12" y1="16.5" x2="12" y2="24.5" stroke="url(#goldScales)" strokeWidth="0.9" strokeLinecap="round" />
          {/* Left Pan Dish */}
          <path d="M7 24.5C7 27.3 9.2 29.5 12 29.5C14.8 29.5 17 27.3 17 24.5H7Z" fill="url(#goldScales)" />

          {/* Right Scale Suspension Chains */}
          <line x1="36" y1="16.5" x2="32" y2="24.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.95" />
          <line x1="36" y1="16.5" x2="40" y2="24.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" strokeOpacity="0.95" />
          <line x1="36" y1="16.5" x2="36" y2="24.5" stroke="url(#goldScales)" strokeWidth="0.9" strokeLinecap="round" />
          {/* Right Pan Dish */}
          <path d="M31 24.5C31 27.3 33.2 29.5 36 29.5C38.8 29.5 41 27.3 41 24.5H31Z" fill="url(#goldScales)" />
        </svg>
      </div>

      {/* Official Typography Branding */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${text} font-black tracking-wider font-heading samanvay-logo-title`}>
              SAMANVAY
            </span>
            <span className="text-[10px] font-bold font-sans tracking-normal hidden xl:inline samanvay-logo-sub">
              (समन्वय)
            </span>
          </div>
          <span className={`${sub} font-bold uppercase tracking-widest block mt-0.5 leading-tight font-mono samanvay-logo-badge`}>
            AICTE National Portal
          </span>
        </div>
      )}
    </div>
  );
};
