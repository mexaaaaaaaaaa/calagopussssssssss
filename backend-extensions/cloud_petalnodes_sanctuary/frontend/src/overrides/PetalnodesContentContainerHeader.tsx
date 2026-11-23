import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Group, Text, Title } from '@mantine/core';
import classNames from 'classnames';
import OrigContentContainerHeader, {
  type ContentContainerHeaderProps,
} from '@/elements/containers/ContentContainerHeader.tsx';
import { useNavbarPageHeader } from '@/elements/containers/useNavbarPageHeader.ts';
import TextInput from '@/elements/input/TextInput.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';

export type { ContentContainerHeaderProps };

function ThemedContentContainerHeader(props: ContentContainerHeaderProps) {
  const {
    title,
    subtitle,
    hideTitleComponent,
    titleOrder = 1,
    search,
    setSearch,
    contentRight,
    hoistToNavbar = false,
  } = props;

  const { t } = useTranslations();
  const hoisted = useNavbarPageHeader({ title, subtitle }, hoistToNavbar && !hideTitleComponent);

  if (hideTitleComponent) return null;

  const titleBlock = (
    <div className={classNames('space-y-1 min-w-0', { 'hidden lg:block': hoisted })}>
      <div className='flex items-center gap-2.5 flex-wrap'>
        <Title order={titleOrder} className='font-display tracking-tight text-(--calagopus-text)'>
          {title}
        </Title>
        <span className='hidden sm:inline-flex items-center rounded-md border border-(--calagopus-primary-border) bg-(--calagopus-primary-subtle) px-2 py-0.5 text-[11px] font-medium text-(--calagopus-primary-text)'>
          Petalnodes
        </span>
      </div>
      {subtitle ? (
        <Text size='sm' c='dimmed' className='text-(--calagopus-text-secondary)'>
          {subtitle}
        </Text>
      ) : null}
    </div>
  );

  if (setSearch) {
    return (
      <Group
        justify='space-between'
        align='flex-end'
        mb='lg'
        pb='md'
        className='border-b border-(--calagopus-border) gap-3'
      >
        {titleBlock}
        <Group gap='sm' className='w-full sm:w-auto'>
          <TextInput
            placeholder={t('common.input.search', {})}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftSection={<FontAwesomeIcon icon={faSearch} />}
            w={250}
          />
          {contentRight}
        </Group>
      </Group>
    );
  }

  if (contentRight) {
    return (
      <Group
        justify='space-between'
        align='flex-end'
        mb='lg'
        pb='md'
        className='border-b border-(--calagopus-border) gap-3'
      >
        {titleBlock}
        <Group gap='sm'>{contentRight}</Group>
      </Group>
    );
  }

  return (
    <div
      className={classNames(
        'mb-5 pb-3 border-b border-(--calagopus-border)',
        { 'hidden lg:block': hoisted },
      )}
    >
      <Title order={titleOrder} className='font-display tracking-tight text-(--calagopus-text)'>
        {title}
      </Title>
      {subtitle ? (
        <Text size='sm' c='dimmed' className='mt-0.5 text-(--calagopus-text-secondary)'>
          {subtitle}
        </Text>
      ) : null}
    </div>
  );
}

export default function PetalnodesContentContainerHeader(props: ContentContainerHeaderProps) {
  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
    return <OrigContentContainerHeader {...props} />;
  }

  return <ThemedContentContainerHeader {...props} />;
}
