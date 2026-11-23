import { Button as MantineButton, ButtonProps as MantineButtonProps } from '@mantine/core';
import classNames from 'classnames';
import { forwardRef, MouseEvent as ReactMouseEvent } from 'react';
import { makeComponentHookable } from 'shared';
import OrigButton from '@/elements/buttons/Button.tsx';

export interface ButtonProps extends Omit<MantineButtonProps, 'onClick'> {
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => void | Promise<void>;
}

const PetalnodesButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, type = 'button', onClick, loading, disabled, variant = 'filled', ...rest }, ref) => {
    if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
      return (
        <OrigButton
          ref={ref}
          type={type}
          className={className}
          onClick={onClick}
          loading={loading}
          disabled={disabled}
          variant={variant}
          {...rest}
        >
          {children}
        </OrigButton>
      );
    }

    return (
      <MantineButton
        ref={ref}
        type={type}
        className={classNames('blush-transition', className)}
        onClick={onClick}
        loading={disabled ? false : loading}
        disabled={disabled}
        variant={variant}
        radius={rest.radius ?? 'md'}
        {...rest}
        style={{
          cursor: loading ? 'wait' : undefined,
          fontWeight: variant === 'filled' ? 600 : 500,
          border: disabled ? '1px solid var(--mantine-color-default-border)' : undefined,
          color: disabled ? 'var(--mantine-color-dimmed)' : undefined,
          ...rest.style,
        }}
      >
        {children}
      </MantineButton>
    );
  },
);

export default makeComponentHookable(PetalnodesButton);
