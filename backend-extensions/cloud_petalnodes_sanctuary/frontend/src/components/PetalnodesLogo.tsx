import React from 'react';

export interface PetalnodesLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 rounded-lg',
  md: 'h-8 w-8 rounded-lg',
  lg: 'h-9 w-9 rounded-xl',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-5 w-5',
};

export function PetalnodesLogo({ size = 'md', className = '' }: PetalnodesLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)] ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={iconSizes[size]}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 3.25C14.7 6.1 16.25 8.85 16.25 11.4C16.25 13.95 14.35 16 12 16C9.65 16 7.75 13.95 7.75 11.4C7.75 8.85 9.3 6.1 12 3.25Z"
          fill="#F4A6C1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M4.5 11.2C7.4 10.6 9.95 11.55 11.55 13.4C13.15 15.25 13.05 17.95 11.15 19.65C8.5 18.85 5.45 15.6 4.5 11.2Z"
          fill="#F4A6C1"
          fillOpacity="0.45"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M19.5 11.2C16.6 10.6 14.05 11.55 12.45 13.4C10.85 15.25 10.95 17.95 12.85 19.65C15.5 18.85 18.55 15.6 19.5 11.2Z"
          fill="#F4A6C1"
          fillOpacity="0.45"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12.2" r="1.65" fill="currentColor" />
      </svg>
    </span>
  );
}
