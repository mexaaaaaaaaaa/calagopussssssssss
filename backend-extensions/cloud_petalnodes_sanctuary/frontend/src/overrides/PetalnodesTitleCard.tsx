import type { ReactNode } from 'react';
import { Box, Group, Title } from '@mantine/core';
import classNames from 'classnames';
import { makeComponentHookable } from 'shared';
import Card from '@/elements/data-display/Card.tsx';
import Icon, { type IconLike } from '@/elements/data-display/Icon.tsx';
import OrigTitleCard, { type TitleCardProps } from '@/elements/data-display/TitleCard.tsx';

function PetalnodesTitleCard(props: TitleCardProps) {
  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
    return <OrigTitleCard {...props} />;
  }

  const {
    title,
    icon,
    children,
    className,
    titleClassName,
    iconClassName,
    wrapperClassName,
    leftSection,
    rightSection,
  } = props;

  return (
    <Card withBorder radius='lg' p={0} className={classNames('overflow-hidden', className)}>
      <Group
        id='title-card-header'
        className={classNames(titleClassName)}
        gap='sm'
        px='md'
        py='sm'
      >
        {leftSection}
        {icon && (
          <Box
            id='title-card-icon'
            className={classNames(iconClassName)}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <Icon icon={icon} />
          </Box>
        )}
        <Title order={5} fw={600} className='font-display'>
          {title}
        </Title>
        {rightSection && <div className='ml-auto'>{rightSection}</div>}
      </Group>
      <div className={classNames('p-4 md:p-5 h-full', wrapperClassName)}>{children}</div>
    </Card>
  );
}

export type { TitleCardProps };
export type { ReactNode, IconLike };
export default makeComponentHookable(PetalnodesTitleCard);
