import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '../../utils/cn';

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    data-slot="switch"
    className={cn(
      'blush-focus-ring peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-[var(--calagopus-border)] bg-[var(--calagopus-surface-secondary)] transition-colors data-[state=checked]:border-[var(--calagopus-primary-border)] data-[state=checked]:bg-[var(--calagopus-primary)] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      data-slot="switch-thumb"
      className="pointer-events-none block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-xs transition-transform data-[state=checked]:translate-x-[17px]"
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
