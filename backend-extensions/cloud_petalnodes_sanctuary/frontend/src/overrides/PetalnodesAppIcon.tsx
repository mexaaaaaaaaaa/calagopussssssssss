import { useComputedColorScheme } from '@mantine/core';
import classNames from 'classnames';
import { makeComponentHookable } from 'shared';
import OrigAppIcon from '@/elements/AppIcon.tsx';
import { useGlobalStore } from '@/stores/global.ts';
import { PetalnodesLogo } from '../components/PetalnodesLogo';
import { PETALNODES_BRAND } from '../navigation/petalnodesBrand';

function ThemedAppIcon({ className }: { className?: string }) {
  const settings = useGlobalStore((state) => state.settings);
  const isLight = useComputedColorScheme('light') === 'light';
  const customBanner = isLight ? (settings.app.bannerLight ?? settings.app.banner) : settings.app.banner;

  if (customBanner) {
    return (
      <div className={classNames('w-full mt-1 select-none', className)}>
        <img
          src={customBanner}
          className='w-full h-auto rounded-xl object-contain'
          alt={settings.app.name || PETALNODES_BRAND}
        />
      </div>
    );
  }

  const brandName =
    settings.app.name && settings.app.name.toLowerCase() !== 'calagopus'
      ? settings.app.name
      : PETALNODES_BRAND;

  return (
    <div
      className={classNames(
        'h-14 w-full flex flex-row items-center gap-2.5 select-none min-w-0 px-1',
        className,
      )}
    >
      <PetalnodesLogo size='md' />
      <div className='min-w-0 flex-1 leading-tight'>
        <div className='font-display text-sm font-bold tracking-tight text-(--calagopus-text) truncate'>
          {brandName}
        </div>
        <div className='text-[11px] font-medium text-(--calagopus-primary-text) truncate'>
          Sanctuary Panel
        </div>
      </div>
    </div>
  );
}

function PetalnodesAppIcon({ className }: { className?: string }) {
  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
    return <OrigAppIcon className={className} />;
  }

  return <ThemedAppIcon className={className} />;
}

export default makeComponentHookable(PetalnodesAppIcon);
