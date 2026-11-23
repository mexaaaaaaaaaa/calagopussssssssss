import { Card as MantineCard, CardProps as MantineCardProps, MantineColor, Progress } from '@mantine/core';
import classNames from 'classnames';
import { ComponentProps, forwardRef } from 'react';
import { makeComponentHookable } from 'shared';
import OrigCard from '@/elements/data-display/Card.tsx';
import { usagePercent } from '@/lib/format/usage.ts';

export interface CardProps extends MantineCardProps {
  hoverable?: boolean;
  leftStripeClassName?: string;
  progress?: number | null;
  total?: number | null;
  progressColor?: MantineColor;
}

const PetalnodesCard = forwardRef<HTMLDivElement, CardProps & ComponentProps<'div'>>(
  (
    { className, pl, hoverable = false, leftStripeClassName, progress, total, progressColor, children, ...rest },
    ref,
  ) => {
    if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
      return (
        <OrigCard
          ref={ref}
          className={className}
          pl={pl}
          hoverable={hoverable}
          leftStripeClassName={leftStripeClassName}
          progress={progress}
          total={total}
          progressColor={progressColor}
          {...rest}
        >
          {children}
        </OrigCard>
      );
    }

    const percent = usagePercent(progress, total);

    return (
      <MantineCard
        ref={ref}
        data-hoverable={hoverable ? 'true' : undefined}
        className={classNames(
          'relative petal-surface-card',
          className,
          hoverable && 'cursor-pointer',
        )}
        pl={typeof pl === 'number' && leftStripeClassName ? pl + 4 : leftStripeClassName ? 20 : pl}
        radius='lg'
        withBorder
        {...rest}
      >
        {leftStripeClassName && (
          <div className={classNames('absolute left-0 top-0 h-full w-1 mr-1 rounded-l-lg', leftStripeClassName)} />
        )}
        {children}
        {percent !== null && (
          <MantineCard.Section mt='md'>
            <Progress value={percent} color={progressColor ?? 'blush'} size='sm' radius={0} />
          </MantineCard.Section>
        )}
      </MantineCard>
    );
  },
);

export default makeComponentHookable(PetalnodesCard);
