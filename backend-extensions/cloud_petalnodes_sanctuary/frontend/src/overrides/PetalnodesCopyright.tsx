import { useState } from 'react';
import classNames from 'classnames';
import OrigCopyright from '@/elements/Copyright.tsx';
import ExtensionSlot from '@/elements/ExtensionSlot.tsx';
import Anchor from '@/elements/typography/Anchor.tsx';
import { DoodleCrewFooter } from '../components/DoodleCrewFooter';
import { PETALNODES_LINK_MAP, PETALNODES_MINECRAFT_DISCLAIMER } from '../navigation/petalnodesBrand';

function ThemedCopyright({ className }: { className?: string }) {
  const [showDoodleStage, setShowDoodleStage] = useState(false);

  return (
    <div
      className={classNames(
        'flex flex-col gap-2 text-xs transition-all text-(--mantine-color-dimmed) w-full',
        className,
      )}
    >
      <ExtensionSlot
        components={window.extensionContext.extensionRegistry.elements.copyright.prependedComponents}
        name='global-copyright-prepended'
      />

      {showDoodleStage && (
        <div className='w-full overflow-hidden rounded-2xl border border-(--calagopus-border) bg-(--calagopus-surface) shadow-sm'>
          <DoodleCrewFooter
            brand='PETALNODES'
            preset='sunset'
            tagline='Warm blush infrastructure built for calm multiplayer hosting.'
            columns={[
              {
                heading: 'Platform',
                links: [
                  { label: 'Website', href: PETALNODES_LINK_MAP.website },
                  { label: 'Billing Portal', href: PETALNODES_LINK_MAP.billing },
                  { label: 'Service Status', href: PETALNODES_LINK_MAP.status },
                ],
              },
              {
                heading: 'Community',
                links: [
                  { label: 'Discord Server', href: PETALNODES_LINK_MAP.discord },
                  { label: 'Calagopus Project', href: 'https://calagopus.com' },
                ],
              },
            ]}
          />
        </div>
      )}

      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-(--calagopus-border) pt-2.5'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          <span className='font-medium text-(--calagopus-text)'>Petalnodes Sanctuary</span>
          <span>·</span>
          <span className='flex flex-row items-center gap-1.5'>
            Powered by
            <Anchor size='xs' href='https://calagopus.com' target='_blank'>
              Calagopus
            </Anchor>
            &copy; 2025 - {new Date().getFullYear()}
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          <span className='text-[11px] opacity-85'>{PETALNODES_MINECRAFT_DISCLAIMER}</span>
          <button
            type='button'
            onClick={() => setShowDoodleStage((prev) => !prev)}
            className='blush-focus-ring rounded-md border border-(--calagopus-primary-border) bg-(--calagopus-primary-subtle) px-2 py-0.5 text-[11px] font-medium text-(--calagopus-primary-text) hover:bg-(--calagopus-primary-soft) cursor-pointer'
          >
            {showDoodleStage ? 'Hide Sanctuary Crew' : 'Meet Nodey Crew'}
          </button>
        </div>
      </div>

      <ExtensionSlot
        components={window.extensionContext.extensionRegistry.elements.copyright.appendedComponents}
        name='global-copyright-appended'
      />
    </div>
  );
}

export default function PetalnodesCopyright({ className }: { className?: string }) {
  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
    return <OrigCopyright className={className} />;
  }

  return <ThemedCopyright className={className} />;
}
