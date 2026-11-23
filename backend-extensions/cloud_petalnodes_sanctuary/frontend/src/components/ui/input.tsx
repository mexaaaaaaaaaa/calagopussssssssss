import * as React from 'react';
import { cn } from '../../utils/cn';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'blush-focus-ring flex h-9 w-full rounded-lg border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] px-3 py-1.5 text-[13px] text-[var(--calagopus-text)] placeholder:text-[var(--calagopus-text-secondary)]/75 transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'ShadcnInput';

export { Input };
