import React from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { getInitials } from '../utils/themeHelpers';
import { sanitizeImageSrc } from '../api/calagopusCore';
import {
  Card as ShadcnCard,
  CardAction as ShadcnCardAction,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from './ui/card';

export interface ContentContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'md' | 'lg' | 'xl';
}

const maxWidthMap = {
  md: 'max-w-[960px]',
  lg: 'max-w-[1200px]',
  xl: 'max-w-[1380px]',
};

export function ContentContainer({
  children,
  className = '',
  maxWidth = 'xl',
}: ContentContainerProps) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

export interface CardProps {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  surface?: 'default' | 'secondary' | 'tinted';
  className?: string;
}

const cardPadding = {
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

const cardSurface = {
  default: 'bg-[var(--calagopus-surface)] border-[var(--calagopus-border)]',
  secondary: 'bg-[var(--calagopus-surface-secondary)] border-[var(--calagopus-border)]',
  tinted: 'bg-[var(--calagopus-primary-subtle)] border-[var(--calagopus-primary-border)]',
};

export function Card({
  title,
  description,
  headerAction,
  footer,
  children,
  padding = 'md',
  surface = 'default',
  className = '',
}: CardProps) {
  return (
    <ShadcnCard className={`${cardSurface[surface]} ${className}`}>
      {title || description || headerAction ? (
        <ShadcnCardHeader className={cardPadding[padding]}>
          <div className="min-w-0 flex-1">
            {title ? <ShadcnCardTitle>{title}</ShadcnCardTitle> : null}
            {description ? <ShadcnCardDescription>{description}</ShadcnCardDescription> : null}
          </div>
          {headerAction ? <ShadcnCardAction>{headerAction}</ShadcnCardAction> : null}
        </ShadcnCardHeader>
      ) : null}
      <ShadcnCardContent className={cardPadding[padding]}>{children}</ShadcnCardContent>
      {footer ? <ShadcnCardFooter>{footer}</ShadcnCardFooter> : null}
    </ShadcnCard>
  );
}

export type BadgeTone = 'neutral' | 'pink' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps {
  tone?: BadgeTone;
  label: string;
  showIcon?: boolean;
  className?: string;
}

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral:
    'bg-[var(--calagopus-surface-secondary)] text-[var(--calagopus-text)] border-[var(--calagopus-border)]',
  pink: 'bg-[var(--calagopus-primary-soft)] text-[var(--calagopus-primary-text)] border-[var(--calagopus-primary-border)]',
  success:
    'bg-[var(--calagopus-success-bg)] text-[var(--calagopus-success-text)] border-[var(--calagopus-success-border)]',
  warning:
    'bg-[var(--calagopus-warning-bg)] text-[var(--calagopus-warning-text)] border-[var(--calagopus-warning-border)]',
  danger:
    'bg-[var(--calagopus-danger-bg)] text-[var(--calagopus-danger-text)] border-[var(--calagopus-danger-border)]',
};

export function StatusBadge({
  tone = 'neutral',
  label,
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const renderIcon = () => {
    if (!showIcon) return null;
    if (tone === 'success') return <Check className="h-3 w-3 shrink-0" aria-hidden="true" />;
    if (tone === 'warning')
      return <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />;
    if (tone === 'danger') return <X className="h-3 w-3 shrink-0" aria-hidden="true" />;
    return <Info className="h-3 w-3 shrink-0" aria-hidden="true" />;
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12px] font-medium leading-tight whitespace-nowrap shrink-0 ${badgeToneClasses[tone]} ${className}`}
    >
      {renderIcon()}
      <span>{label}</span>
    </span>
  );
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const avatarSizes = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
};

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const safeSrc = sanitizeImageSrc(src);
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [safeSrc]);

  if (safeSrc && !imgError) {
    return (
      <img
        src={safeSrc}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${avatarSizes[size]} rounded-lg border border-[var(--calagopus-border)] object-cover shrink-0`}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`${avatarSizes[size]} inline-flex items-center justify-center rounded-lg border border-[var(--calagopus-primary-border)] bg-[var(--calagopus-primary-soft)] font-display font-semibold text-[var(--calagopus-primary-text)] shrink-0 select-none`}
    >
      {getInitials(name)}
    </span>
  );
}

export interface ProfileBadgeProps {
  name: string;
  subtitle?: string;
  avatarSrc?: string | null;
}

export function ProfileBadge({ name, subtitle, avatarSrc }: ProfileBadgeProps) {
  return (
    <div className="inline-flex items-center gap-3 min-w-0">
      <Avatar name={name} src={avatarSrc} size="md" />
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium text-[var(--calagopus-text)] leading-tight">
          {name}
        </p>
        {subtitle ? (
          <p className="truncate text-[12px] text-[var(--calagopus-text-secondary)] leading-tight mt-0.5">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  metadata?: string[];
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  metadata,
}: PageHeaderProps) {
  return (
    <header className="border-b border-[var(--calagopus-border)] pb-5">
      {breadcrumbs ? <div className="mb-3">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-[260px] flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[var(--calagopus-text)] leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-[var(--calagopus-text-secondary)] leading-relaxed">
              {description}
            </p>
          ) : null}
          {metadata && metadata.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--calagopus-text-secondary)]">
              {metadata.map((item, idx) => (
                <React.Fragment key={`${item}-${idx}`}>
                  {idx > 0 ? <span aria-hidden="true">·</span> : null}
                  <span className="whitespace-nowrap">{item}</span>
                </React.Fragment>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2.5 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
