import React from 'react';

export interface NodeyMascotProps {
  size?: number;
  className?: string;
}

/**
 * Original Nodey mascot emblem in hand-inked Petalnodes style:
 * a soft three-quarter cube companion with stubby legs, round expressive eyes,
 * and a five-petal cherry blossom perched on top.
 */
export function NodeyMascot({ size = 28, className = '' }: NodeyMascotProps) {
  return (
    <svg
      viewBox="-56 -138 112 146"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Stubby legs */}
        <path d="M-20 -12 L-22 2 C-16 4 -10 2 -10 -12 Z" fill="#FFFFFF" />
        <path d="M12 -12 L10 2 C16 4 22 2 20 -12 Z" fill="#FFFFFF" />

        {/* Three-quarter cube right side (pastel blush) */}
        <path d="M20 -82 L40 -95 L40 -26 L20 -12 Z" fill="#FCE7EF" />
        {/* Parallelogram top */}
        <path d="M-36 -82 L-16 -96 L40 -95 L20 -82 Z" fill="#FFF8FA" />
        {/* Front face */}
        <path
          d="M-36 -82 C-16 -83 4 -83 20 -82 C21 -58 21 -34 20 -12 C2 -10 -18 -10 -36 -12 C-37 -34 -37 -58 -36 -82 Z"
          fill="#FFFFFF"
        />

        {/* Eyes + smile */}
        <circle cx="-18" cy="-52" r="5" fill="currentColor" stroke="none" />
        <circle cx="4" cy="-52" r="5" fill="currentColor" stroke="none" />
        <path d="M-11 -36 C-7 -31 -2 -31 2 -36" strokeWidth="4.2" />

        {/* Stem + 5-petal blossom */}
        <path d="M2 -90 C2 -98 3 -103 4 -107" strokeWidth="4.2" />
        <g transform="translate(4 -116)">
          <circle cx="0" cy="-9" r="6" fill="#F4A6C1" strokeWidth="3.8" />
          <circle cx="9" cy="-2" r="6" fill="#F4A6C1" strokeWidth="3.8" />
          <circle cx="5.5" cy="8" r="6" fill="#F4A6C1" strokeWidth="3.8" />
          <circle cx="-5.5" cy="8" r="6" fill="#F4A6C1" strokeWidth="3.8" />
          <circle cx="-9" cy="-2" r="6" fill="#F4A6C1" strokeWidth="3.8" />
          <circle cx="0" cy="0" r="4" fill="#FFC75A" strokeWidth="3.2" />
        </g>
      </g>
    </svg>
  );
}
