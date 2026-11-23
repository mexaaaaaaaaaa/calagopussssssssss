import React from 'react';

interface PetalParticle {
  id: number;
  leftPercent: number;
  delaySec: number;
  durationSec: number;
  sizePx: number;
  swayPx: number;
  opacity: number;
  fill: string;
}

const PETAL_PALETTE = ['#F4A6C1', '#F7BDD2', '#FCE7EF', '#FF8FAB'];

const PETAL_PARTICLES: readonly PetalParticle[] = Array.from({ length: 12 }, (_, idx) => {
  const seed = Math.sin(idx * 19.37 + 7.13) * 10000;
  const r1 = seed - Math.floor(seed);
  const seed2 = Math.sin(idx * 41.11 + 3.71) * 10000;
  const r2 = seed2 - Math.floor(seed2);
  return {
    id: idx,
    leftPercent: Math.round((4 + (idx / 12) * 90 + (r1 - 0.5) * 6) * 10) / 10,
    delaySec: Math.round((idx * -2.4 - r2 * 4) * 10) / 10,
    durationSec: Math.round((16 + r1 * 10) * 10) / 10,
    sizePx: Math.round(9 + r2 * 6),
    swayPx: Math.round((r1 - 0.5) * 44),
    opacity: Math.round((0.22 + r2 * 0.2) * 100) / 100,
    fill: PETAL_PALETTE[idx % PETAL_PALETTE.length],
  };
});

/**
 * Fixed ambient Petalnodes background layer:
 * 1) Static paper grain texture (data URI rendered once, never shimmers on scroll)
 * 2) Subtle 24px dot-grid notebook pattern
 * 3) Slow-drifting cherry-blossom petals with pointer-events: none and prefers-reduced-motion compliance
 */
export function AmbientPetalBackground() {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="petalnodes-ambient-bg"
      className={`petal-ambient-root pointer-events-none fixed inset-0 z-0 overflow-hidden select-none${hidden ? ' is-paused' : ''}`}
    >
      {/* Static fine dot-grid over warm baby-pink canvas */}
      <div className="petal-dot-grid absolute inset-0" />
      {/* Static once-rendered paper grain SVG texture (no scroll shimmer) */}
      <div className="petal-paper-grain absolute inset-0" />

      {/* Lightweight GPU-composited drifting cherry petals */}
      <div className="petal-drift-layer absolute inset-0">
        {PETAL_PARTICLES.map((p) => (
          <svg
            key={p.id}
            viewBox="-12 -14 24 28"
            width={p.sizePx}
            height={p.sizePx}
            className="petal-floater"
            style={
              {
                left: `${p.leftPercent}%`,
                opacity: p.opacity,
                '--petal-delay': `${p.delaySec}s`,
                '--petal-duration': `${p.durationSec}s`,
                '--petal-sway': `${p.swayPx}px`,
              } as React.CSSProperties
            }
          >
            <path
              d="M0 -12 C7 -9 10 -1 7 7 C4 12 1.5 12.5 0 9.5 C-1.5 12.5 -4 12 -7 7 C-10 -1 -7 -9 0 -12 Z"
              fill={p.fill}
              stroke="#D888A4"
              strokeOpacity="0.32"
              strokeWidth="1"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
