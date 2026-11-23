import * as React from 'react';
import { cn } from '../../utils/cn';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] flex flex-col rounded-xl border border-[var(--calagopus-border)] shadow-[var(--calagopus-shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6 border-b border-[var(--calagopus-border)]',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="card-title"
      className={cn(
        'font-display text-[15px] font-semibold leading-snug tracking-tight text-[var(--calagopus-text)]',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        'mt-1 text-[13px] leading-relaxed text-[var(--calagopus-text-secondary)]',
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('ml-auto max-w-full min-w-0 shrink-0 self-start', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center justify-between gap-2 border-t border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] px-5 py-3.5 sm:px-6 rounded-b-xl',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
