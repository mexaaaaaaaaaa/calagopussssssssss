import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'blush-transition blush-focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-medium cursor-pointer disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--calagopus-primary)] text-[#29232A] hover:bg-[var(--calagopus-primary-hover)] shadow-xs',
        destructive:
          'border border-[var(--calagopus-danger-border)] bg-[var(--calagopus-danger-bg)] text-[var(--calagopus-danger-text)] hover:opacity-90',
        outline:
          'border border-[var(--calagopus-border)] bg-[var(--calagopus-surface)] text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)] hover:bg-[var(--calagopus-primary-subtle)]',
        secondary:
          'border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] text-[var(--calagopus-text)] hover:border-[var(--calagopus-primary-border)]',
        ghost:
          'text-[var(--calagopus-text-secondary)] hover:bg-[var(--calagopus-primary-subtle)] hover:text-[var(--calagopus-text)]',
        link: 'text-[var(--calagopus-primary-text)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 rounded-md px-3 text-[12px]',
        lg: 'h-10 rounded-lg px-5 text-sm',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ShadcnButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ShadcnButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = 'ShadcnButton';

export { Button, buttonVariants };
