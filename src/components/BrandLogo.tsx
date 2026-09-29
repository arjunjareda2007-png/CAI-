import React, { useId } from 'react';

interface BrandLogoProps {
  /**
   * - 'header': Balanced horizontal lockup (Circular Emblem + CAI Wordmark) for top navbars & drawers
   * - 'wordmark': Full CAI Wordmark lockup (matching wordmark.png)
   * - 'emblem': Circular Career Alert India crest (matching logo.png)
   * - 'compact': Compact emblem + title for mobile or tight spaces
   */
  variant?: 'header' | 'wordmark' | 'emblem' | 'compact';
  theme?: 'dark' | 'light';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Circular Emblem SVG faithfully reproducing the uploaded Career Alert India crest (logo.png).
 * Uses unique instance IDs via useId() so multiple emblems on the same page never have SVG <defs> ID collisions.
 */
export const CircularEmblemSVG: React.FC<{ className?: string }> = ({
  className = 'w-10 h-10',
}) => {
  const rawId = useId().replace(/:/g, '');
  const ringId = `caiRing_${rawId}`;
  const innerBgId = `caiInnerBg_${rawId}`;
  const sunId = `caiSun_${rawId}`;
  const capTopId = `caiCapTop_${rawId}`;
  const alertGradId = `caiAlertGrad_${rawId}`;
  const indiaGradId = `caiIndiaGrad_${rawId}`;
  const shadowId = `caiSoftShadow_${rawId}`;

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block shrink-0 select-none ${className}`}
      role="img"
      aria-label="Career Alert India Emblem"
    >
      <defs>
        <linearGradient id={ringId} x1="120" y1="4" x2="120" y2="236" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="36%" stopColor="#FF881B" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#199A3E" />
          <stop offset="100%" stopColor="#0E7429" />
        </linearGradient>
        <radialGradient id={innerBgId} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="75%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#EEF2F6" />
        </radialGradient>
        <linearGradient id={sunId} x1="120" y1="24" x2="120" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#FDE68A" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={capTopId} x1="60" y1="48" x2="180" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F2C67" />
          <stop offset="50%" stopColor="#071A3D" />
          <stop offset="100%" stopColor="#041028" />
        </linearGradient>
        <linearGradient id={alertGradId} x1="28" y1="154" x2="118" y2="184" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#E05300" />
        </linearGradient>
        <linearGradient id={indiaGradId} x1="122" y1="154" x2="212" y2="184" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#169C3F" />
          <stop offset="100%" stopColor="#0B6B27" />
        </linearGradient>
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#071A3D" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Outer White Plate & Tricolour Border Ring */}
      <circle cx="120" cy="120" r="114" fill={`url(#${innerBgId})`} stroke={`url(#${ringId})`} strokeWidth="8" />
      <circle cx="120" cy="120" r="108" stroke="#E2E8F0" strokeWidth="0.75" />

      {/* Golden Sun & Subtle India Map Silhouette */}
      <circle cx="120" cy="78" r="48" fill={`url(#${sunId})`} />
      <path
        d="M110 26 L122 30 L126 42 L142 48 L152 44 L160 52 L144 66 L136 86 L120 104 L104 86 L92 66 L98 52 L106 40 Z"
        fill="#94A3B8"
        fillOpacity="0.25"
      />

      {/* Left Motif: Parliament Pillars & Ashoka Emblem Silhouette */}
      <g opacity="0.85">
        <rect x="28" y="78" width="38" height="22" rx="2" fill="#CBD5E1" />
        <line x1="34" y1="80" x2="34" y2="98" stroke="#64748B" strokeWidth="1.5" />
        <line x1="41" y1="80" x2="41" y2="98" stroke="#64748B" strokeWidth="1.5" />
        <line x1="48" y1="80" x2="48" y2="98" stroke="#64748B" strokeWidth="1.5" />
        <line x1="55" y1="80" x2="55" y2="98" stroke="#64748B" strokeWidth="1.5" />
        {/* Mini Flag */}
        <line x1="36" y1="56" x2="36" y2="78" stroke="#475569" strokeWidth="1.5" />
        <rect x="37" y="57" width="12" height="3" fill="#FF6B00" />
        <rect x="37" y="60" width="12" height="3" fill="#FFFFFF" />
        <rect x="37" y="63" width="12" height="3" fill="#138A36" />
        {/* Pillar Crest */}
        <path d="M52 50 L62 50 L60 76 L54 76 Z" fill="#64748B" />
        <circle cx="57" cy="47" r="4.5" fill="#475569" />
      </g>

      {/* Right Motif: Exam Checklist Sheet */}
      <g transform="rotate(8 182 72)">
        <rect x="164" y="48" width="34" height="44" rx="3" fill="#FFFFFF" stroke="#475569" strokeWidth="2" />
        <rect x="170" y="55" width="6" height="6" rx="1" stroke="#071A3D" strokeWidth="1.5" />
        <path d="M171 58 L173 60 L177 55" stroke="#FF6B00" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="180" y1="58" x2="192" y2="58" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        <rect x="170" y="65" width="6" height="6" rx="1" stroke="#071A3D" strokeWidth="1.5" />
        <line x1="180" y1="68" x2="192" y2="68" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        <rect x="170" y="75" width="6" height="6" rx="1" stroke="#071A3D" strokeWidth="1.5" />
        <line x1="180" y1="78" x2="192" y2="78" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Open Tricolour Book Waves */}
      <path
        d="M54 98 C78 84, 104 92, 120 106 C136 92, 162 84, 186 98 L182 105 C160 93, 136 99, 120 112 C104 99, 80 93, 58 105 Z"
        fill="#FF6B00"
      />
      <path
        d="M50 105 C76 91, 104 98, 120 112 C136 98, 164 91, 190 105 L186 111 C162 98, 136 105, 120 117 C104 105, 78 98, 54 111 Z"
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="0.6"
      />
      <path
        d="M46 111 C74 97, 104 104, 120 117 C136 104, 166 97, 194 111 L190 118 C164 105, 136 111, 120 122 C104 111, 76 105, 50 118 Z"
        fill="#138A36"
      />

      {/* Graduation Mortarboard Cap & Golden Tassel */}
      <g filter={`url(#${shadowId})`}>
        <path d="M90 66 L90 88 C90 96, 150 96, 150 88 L150 66 L120 77 Z" fill="#071A3D" />
        <polygon points="120,42 174,61 120,78 66,61" fill={`url(#${capTopId})`} stroke="#1E3A8A" strokeWidth="0.8" />
        {/* Golden Tassel */}
        <path d="M120 60 L152 67 L154 96" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />
        <polygon points="154,92 149,106 159,106" fill="#F59E0B" />
      </g>

      {/* Notification Bell Circle Badge on Right */}
      <g filter={`url(#${shadowId})`}>
        <circle cx="198" cy="96" r="18" fill="#071A3D" stroke="#FFFFFF" strokeWidth="2.5" />
        <path
          d="M198 85 C193 85, 190 89, 190 94 L188 100 L208 100 L206 94 C206 89, 203 85, 198 85 Z"
          fill="#FFFFFF"
        />
        <circle cx="198" cy="103" r="2.5" fill="#FFFFFF" />
        <path d="M206 84 C209 86, 210 89, 210 92" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* Bold "CAREER" Headline with Upward Saffron Arrow inside 'A' */}
      <g filter={`url(#${shadowId})`}>
        <text
          x="120"
          y="149"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="36"
          fill="#071A3D"
          letterSpacing="0.5"
        >
          CAREER
        </text>
        {/* Upward Orange Arrow Accent on the 'A' */}
        <path d="M72 150 L79 132 L85 138 L81 139 L77 150 Z" fill="#FF6B00" />
      </g>

      {/* Angled "ALERT" (Saffron) & "INDIA" (Green) Banners */}
      <g filter={`url(#${shadowId})`}>
        <path
          d="M32 156 L120 156 L114 184 L36 184 C31 184, 28 180, 28 175 L30 160 C30 157, 31 156, 32 156 Z"
          fill={`url(#${alertGradId})`}
        />
        <text
          x="75"
          y="176"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="21"
          fill="#FFFFFF"
          letterSpacing="0.8"
        >
          ALERT
        </text>

        <path
          d="M124 156 L208 156 C211 156, 212 158, 212 161 L210 176 C210 181, 207 184, 202 184 L118 184 Z"
          fill={`url(#${indiaGradId})`}
        />
        <text
          x="165"
          y="176"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="21"
          fill="#FFFFFF"
          letterSpacing="0.8"
        >
          INDIA
        </text>
      </g>

      {/* Saffron Line + Ashoka Chakra + Green Line */}
      <line x1="48" y1="194" x2="108" y2="194" stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" />
      <circle cx="120" cy="194" r="6.5" fill="#FFFFFF" stroke="#071A3D" strokeWidth="1.8" />
      <circle cx="120" cy="194" r="2" fill="#071A3D" />
      <line x1="120" y1="187.5" x2="120" y2="200.5" stroke="#071A3D" strokeWidth="0.9" />
      <line x1="113.5" y1="194" x2="126.5" y2="194" stroke="#071A3D" strokeWidth="0.9" />
      <line x1="115.5" y1="189.5" x2="124.5" y2="198.5" stroke="#071A3D" strokeWidth="0.9" />
      <line x1="124.5" y1="189.5" x2="115.5" y2="198.5" stroke="#071A3D" strokeWidth="0.9" />
      <line x1="132" y1="194" x2="192" y2="194" stroke="#138A36" strokeWidth="3" strokeLinecap="round" />

      {/* Bottom Subtitle: EXAMS | JOBS | OPPORTUNITIES */}
      <text
        x="120"
        y="210"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="8.5"
        fill="#071A3D"
        letterSpacing="2.2"
      >
        EXAMS | JOBS | OPPORTUNITIES
      </text>
    </svg>
  );
};

/**
 * Full CAI Wordmark SVG faithfully reproducing the uploaded CAI Wordmark (wordmark.png).
 */
export const CAIWordmarkSVG: React.FC<{ className?: string; theme?: 'dark' | 'light' }> = ({
  className = 'h-20 w-auto',
  theme = 'light',
}) => {
  const rawId = useId().replace(/:/g, '');
  const navyGradId = `wmNavy_${rawId}`;
  const arrowGradId = `wmArrow_${rawId}`;
  const isDark = theme === 'dark';
  const careerColor = isDark ? '#FFFFFF' : '#071A3D';
  const subtitleColor = isDark ? '#E2E8F0' : '#071A3D';

  return (
    <svg
      viewBox="0 0 680 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block select-none ${className}`}
      role="img"
      aria-label="CAI Career Alert India – Exams | Jobs | Opportunities"
    >
      <defs>
        <linearGradient id={navyGradId} x1="160" y1="20" x2="520" y2="155" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isDark ? '#38BDF8' : '#0F3476'} />
          <stop offset="45%" stopColor={isDark ? '#1E40AF' : '#08204E'} />
          <stop offset="100%" stopColor={isDark ? '#0F172A' : '#051330'} />
        </linearGradient>
        <linearGradient id={arrowGradId} x1="440" y1="125" x2="545" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="55%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* === MONOGRAM "C" WITH TRICOLOUR RIBBON === */}
      <path
        d="M286 58 C268 38, 240 30, 212 36 C176 44, 154 76, 160 112 C166 146, 198 164, 236 156 C258 152, 276 140, 288 124 L264 106 C254 118, 240 126, 224 126 C202 126, 188 110, 188 94 C188 76, 202 62, 224 62 C240 62, 252 68, 262 78 Z"
        fill={isDark ? '#FFFFFF' : `url(#${navyGradId})`}
      />
      {/* Sweeping Tricolour Ribbon across 'C' */}
      <path
        d="M150 108 C172 126, 224 72, 298 84 C264 66, 210 106, 156 92 Z"
        fill="#FF6B00"
      />
      <path
        d="M152 117 C176 135, 228 80, 302 90 C266 76, 212 115, 150 108 Z"
        fill="#FFFFFF"
      />
      <path
        d="M158 128 C184 144, 234 88, 304 94 C268 84, 214 124, 152 117 Z"
        fill="#138A36"
      />

      {/* === MONOGRAM "A" WITH ASHOKA CHAKRA & OPEN TRICOLOUR BOOK === */}
      <path
        d="M358 32 L386 32 L442 154 L410 154 L372 68 L334 154 L302 154 Z"
        fill={isDark ? '#FFFFFF' : `url(#${navyGradId})`}
      />
      {/* Ashoka Chakra inside 'A' */}
      <circle cx="372" cy="112" r="20" stroke={isDark ? '#38BDF8' : '#071A3D'} strokeWidth="3" fill="#FFFFFF" />
      <circle cx="372" cy="112" r="4" fill="#071A3D" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 15 * Math.PI) / 180;
        const x1 = 372 + 19 * Math.cos(angle);
        const y1 = 112 + 19 * Math.sin(angle);
        const x2 = 372 - 19 * Math.cos(angle);
        const y2 = 112 - 19 * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#071A3D"
            strokeWidth="1.2"
          />
        );
      })}
      {/* Open Tricolour Book at base of 'A' */}
      <path
        d="M318 134 C340 124, 358 134, 372 148 C386 134, 404 124, 426 134 L422 141 C402 132, 386 140, 372 153 C358 140, 342 132, 322 141 Z"
        fill="#FF6B00"
      />
      <path
        d="M314 144 C338 134, 358 142, 372 155 C386 142, 406 134, 430 144 L426 152 C404 142, 386 149, 372 160 C358 149, 340 142, 318 152 Z"
        fill="#138A36"
      />

      {/* === MONOGRAM "I" WITH GRADUATION CAP & RISING ARROW === */}
      <rect
        x="456"
        y="46"
        width="34"
        height="108"
        rx="3"
        fill={isDark ? '#FFFFFF' : `url(#${navyGradId})`}
      />
      {/* Graduation Cap atop 'I' */}
      <polygon points="473,8 522,25 473,40 424,25" fill={isDark ? '#FF7A00' : '#071A3D'} />
      <path d="M452 32 L452 46 C452 51, 494 51, 494 46 L494 32 L473 40 Z" fill={isDark ? '#E2E8F0' : '#0B2559'} />
      {/* Tassel */}
      <path d="M473 24 L504 30 L506 54" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />
      <polygon points="506,50 501,62 511,62" fill="#F59E0B" />
      {/* Dynamic Upward-Sweeping Saffron-Gold Arrow across 'I' */}
      <path
        d="M446 136 C442 104, 496 78, 526 42 L515 36 L544 22 L542 54 L532 48 C504 88, 456 112, 454 146 Z"
        fill={`url(#${arrowGradId})`}
      />

      {/* === PRIMARY WORDMARK LINE: CAREER ALERT INDIA === */}
      <text
        x="340"
        y="196"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="41"
        letterSpacing="1"
      >
        <tspan fill={careerColor}>CAREER </tspan>
        <tspan fill="#FF6B00">ALERT </tspan>
        <tspan fill={isDark ? '#22C55E' : '#138A36'}>INDIA</tspan>
      </text>

      {/* === BOTTOM SUBTITLE WITH TRICOLOUR FLANKING RULES === */}
      <line x1="96" y1="216" x2="196" y2="216" stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" />
      <text
        x="340"
        y="221"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="13.5"
        fill={subtitleColor}
        letterSpacing="4.5"
      >
        EXAMS <tspan fill="#FF6B00">|</tspan> JOBS <tspan fill="#FF6B00">|</tspan> OPPORTUNITIES
      </text>
      <line x1="484" y1="216" x2="584" y2="216" stroke="#138A36" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'header',
  theme = 'dark',
  className = '',
  size = 'md',
}) => {
  const isDark = theme === 'dark';

  if (variant === 'emblem') {
    const sizeClasses = {
      sm: 'w-10 h-10',
      md: 'w-16 h-16',
      lg: 'w-24 h-24',
      xl: 'w-32 h-32',
    }[size];
    return <CircularEmblemSVG className={`${sizeClasses} ${className}`} />;
  }

  if (variant === 'wordmark') {
    const sizeClasses = {
      sm: 'h-12 w-auto',
      md: 'h-16 w-auto',
      lg: 'h-24 w-auto',
      xl: 'h-32 w-auto',
    }[size];
    return <CAIWordmarkSVG theme={theme} className={`${sizeClasses} ${className}`} />;
  }

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-2.5 select-none align-middle ${className}`}>
        <CircularEmblemSVG className="w-9 h-9 shrink-0" />
        <span className="flex flex-col justify-center leading-none">
          <span className="text-[15px] font-extrabold tracking-tight whitespace-nowrap leading-none">
            <span className={isDark ? 'text-white' : 'text-[#071A3D]'}>CAREER </span>
            <span className="text-[#FF7A00]">ALERT </span>
            <span className={isDark ? 'text-[#22C55E]' : 'text-[#138A36]'}>INDIA</span>
          </span>
          <span
            className={`text-[7.5px] font-bold tracking-[0.11em] uppercase mt-1 whitespace-nowrap leading-none flex items-center gap-1 ${
              isDark ? 'text-white/75' : 'text-[#64748B]'
            }`}
          >
            <span className="w-2 h-[1.5px] bg-[#FF7A00] inline-block rounded-full shrink-0" />
            <span>EXAMS</span>
            <span className="text-[#FF7A00]">•</span>
            <span>JOBS</span>
            <span className="text-[#FF7A00]">•</span>
            <span>OPPORTUNITIES</span>
            <span className="w-2 h-[1.5px] bg-[#138A36] inline-block rounded-full shrink-0" />
          </span>
        </span>
      </span>
    );
  }

  // Default: 'header' — Optically balanced horizontal lockup (Circular Emblem + Aligned Two-Line Wordmark)
  const emblemSize = size === 'sm' ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-9 h-9 sm:w-10 sm:h-10';
  const titleSize = size === 'sm' ? 'text-sm sm:text-[15px]' : 'text-[15px] sm:text-[17px]';
  const subSize = size === 'sm' ? 'text-[7px] sm:text-[7.5px]' : 'text-[7.5px] sm:text-[8px]';

  return (
    <span
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none group align-middle ${className}`}
    >
      <CircularEmblemSVG
        className={`${emblemSize} shrink-0 transition-transform duration-200 group-hover:scale-105`}
      />
      <span className="flex flex-col justify-center leading-none">
        <span className={`${titleSize} font-extrabold tracking-tight whitespace-nowrap leading-none`}>
          <span className={isDark ? 'text-white' : 'text-[#071A3D]'}>CAREER </span>
          <span className="text-[#FF7A00]">ALERT </span>
          <span className={isDark ? 'text-[#22C55E]' : 'text-[#138A36]'}>INDIA</span>
        </span>
        <span
          className={`${subSize} font-bold tracking-[0.1em] uppercase mt-1 whitespace-nowrap leading-none flex items-center justify-between w-full ${
            isDark ? 'text-white/80' : 'text-[#475569]'
          }`}
        >
          <span className="w-2 h-[1.5px] bg-[#FF7A00] inline-block rounded-full shrink-0" />
          <span>EXAMS</span>
          <span className="text-[#FF7A00]">•</span>
          <span>JOBS</span>
          <span className="text-[#FF7A00]">•</span>
          <span>OPPORTUNITIES</span>
          <span className="w-2 h-[1.5px] bg-[#138A36] inline-block rounded-full shrink-0" />
        </span>
      </span>
    </span>
  );
};
