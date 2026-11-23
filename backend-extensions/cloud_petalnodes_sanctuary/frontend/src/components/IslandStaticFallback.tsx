import React from 'react';

export interface IslandStaticFallbackProps {
  reason?: string;
}

/**
 * Hand-inked static cherry-blossom island fallback used when
 * prefers-reduced-motion is enabled, WebGL is unavailable, or WebGL context is lost.
 */
export function IslandStaticFallback({ reason }: IslandStaticFallbackProps) {
  return (
    <div
      data-testid="petal-island-static"
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[#EEE5E9] bg-[#FFF8FA] p-4"
    >
      <svg
        viewBox="0 0 360 210"
        className="h-full max-h-[195px] w-full max-w-[360px]"
        role="img"
        aria-label="Petalnodes cherry-blossom voxel sanctuary illustration"
      >
        <defs>
          <linearGradient id="petal-sky-fallback" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DCEBFF" />
            <stop offset="65%" stopColor="#FFEBF2" />
            <stop offset="100%" stopColor="#FFF8FA" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="348" height="198" rx="14" fill="url(#petal-sky-fallback)" stroke="#E8D8E0" strokeWidth="1.5" />

        {/* Soft distant clouds */}
        <path d="M44 52 Q54 40 68 44 Q78 36 90 46 Q98 48 96 58 L42 58 Z" fill="#FFFFFF" opacity="0.85" />
        <path d="M254 44 Q264 34 276 38 Q286 30 298 40 Q306 44 302 52 L252 52 Z" fill="#FFFFFF" opacity="0.8" />

        {/* Island tapered rocky underside */}
        <path
          d="M95 126 L265 126 L246 154 L212 174 L178 186 L142 170 L114 148 Z"
          fill="#7F7487"
          stroke="#29232A"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M126 144 L178 184 L212 172 L244 152 L228 134 L140 134 Z" fill="#5E5466" opacity="0.7" />

        {/* Glowing pink-gold ore flecks */}
        <rect x="148" y="148" width="10" height="8" rx="2" fill="#FF8FAB" stroke="#29232A" strokeWidth="1.3" />
        <rect x="188" y="158" width="9" height="8" rx="2" fill="#FFC75A" stroke="#29232A" strokeWidth="1.3" />
        <rect x="215" y="140" width="8" height="7" rx="2" fill="#FF8FAB" stroke="#29232A" strokeWidth="1.3" />

        {/* Grass top crust */}
        <path
          d="M88 118 Q180 108 272 118 L266 130 Q180 122 94 130 Z"
          fill="#6FAF5B"
          stroke="#29232A"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Pond & cascading waterfall */}
        <ellipse cx="222" cy="122" rx="26" ry="7" fill="#7CC3EB" stroke="#29232A" strokeWidth="1.6" />
        <path d="M236 125 L246 125 L246 174 L236 174 Z" fill="#9BD7F8" stroke="#29232A" strokeWidth="1.6" />

        {/* Cherry plank cottage */}
        <rect x="194" y="84" width="44" height="34" rx="2" fill="#E7B9A6" stroke="#29232A" strokeWidth="2.1" />
        <path d="M188 86 L216 66 L244 86 Z" fill="#F4A6C1" stroke="#29232A" strokeWidth="2.1" strokeLinejoin="round" />
        <rect x="210" y="96" width="12" height="22" rx="1.5" fill="#6B4A3A" stroke="#29232A" strokeWidth="1.8" />
        {/* Warm porch lantern */}
        <rect x="183" y="92" width="9" height="12" rx="2" fill="#FFC75A" stroke="#29232A" strokeWidth="1.6" />

        {/* Hero Cherry Blossom Tree */}
        <path d="M126 118 L126 78 L118 66 M126 84 L138 72" stroke="#6B4A3A" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M126 118 L126 78" stroke="#29232A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="126" cy="56" rx="40" ry="24" fill="#FF9AB5" stroke="#29232A" strokeWidth="2.2" />
        <ellipse cx="106" cy="64" rx="22" ry="15" fill="#FFC9D6" stroke="#29232A" strokeWidth="2" />
        <ellipse cx="148" cy="64" rx="20" ry="14" fill="#F4A6C1" stroke="#29232A" strokeWidth="2" />

        {/* Nodey cube companion on grass */}
        <rect x="155" y="102" width="16" height="16" rx="2" fill="#FFFFFF" stroke="#29232A" strokeWidth="1.8" />
        <circle cx="160" cy="109" r="1.4" fill="#29232A" />
        <circle cx="166" cy="109" r="1.4" fill="#29232A" />
        <circle cx="163" cy="99" r="3.5" fill="#F4A6C1" stroke="#29232A" strokeWidth="1.4" />

        {/* Drifting petals */}
        <ellipse cx="78" cy="74" rx="4" ry="2.4" transform="rotate(-24 78 74)" fill="#FF8FAB" />
        <ellipse cx="165" cy="40" rx="3.8" ry="2.2" transform="rotate(18 165 40)" fill="#FFC9D6" />
        <ellipse cx="286" cy="88" rx="4" ry="2.4" transform="rotate(-15 286 88)" fill="#FF8FAB" />
      </svg>
      {reason ? (
        <span className="mt-1.5 text-[11px] font-medium text-[#777078]">{reason}</span>
      ) : null}
    </div>
  );
}
