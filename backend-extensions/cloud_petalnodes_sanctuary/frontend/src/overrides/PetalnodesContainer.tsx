import { faBell, faUpRightFromSquare, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { makeComponentHookable } from 'shared';
import Copyright from '@/elements/Copyright.tsx';
import DismissibleAnnouncementAlert from '@/elements/DismissibleAnnouncementAlert.tsx';
import Alert from '@/elements/feedback/Alert.tsx';
import OrigContainer from '@/elements/layout/Container.tsx';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { useCurrentWindow } from '@/providers/CurrentWindowProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useGlobalStore } from '@/stores/global.ts';
import { PETALNODES_LINKS } from '../navigation/petalnodesBrand';

interface LayoutProps {
  children: ReactNode;
  isNormal: boolean;
}

function ThemedContainer({ children, isNormal }: LayoutProps) {
  const { t } = useTranslations();
  const { impersonating, user } = useAuth();
  const { id } = useCurrentWindow();
  const announcements = useGlobalStore((state) => state.announcements);
  const serverName = useGlobalStore((state) => state.serverName);

  return (
    <div
      className={
        isNormal
          ? 'relative z-10 flex flex-col justify-between min-w-full min-h-full'
          : 'relative z-10 flex flex-col justify-between h-full overflow-auto'
      }
    >
      <div className='min-w-0 flex-1'>
        {isNormal && !id && user && (
          <header className='hidden lg:flex items-center justify-between gap-4 px-6 py-2.5 petal-glass-header sticky top-0 z-20'>
            <div className='flex items-center gap-2 text-xs text-(--calagopus-text-secondary)'>
              <span className='inline-flex h-2 w-2 rounded-full bg-(--calagopus-primary)' aria-hidden='true' />
              <span className='font-medium text-(--calagopus-text)'>Petalnodes Sanctuary</span>
              {serverName && (
                <>
                  <span aria-hidden='true'>/</span>
                  <span className='font-mono text-(--calagopus-primary-text) truncate max-w-64'>{serverName}</span>
                </>
              )}
            </div>

            <div className='flex items-center gap-2'>
              <nav className='flex items-center gap-1' aria-label='Petalnodes external links'>
                {PETALNODES_LINKS.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='blush-transition inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-(--calagopus-text-secondary) hover:bg-(--calagopus-primary-subtle) hover:text-(--calagopus-primary-text)'
                  >
                    <span>{item.shortLabel}</span>
                    <FontAwesomeIcon icon={faUpRightFromSquare} className='text-[10px] opacity-65' />
                  </a>
                ))}
              </nav>

              <NavLink
                to='/account/notifications'
                aria-label='Notifications'
                className='blush-transition relative inline-flex items-center gap-1.5 rounded-lg border border-(--calagopus-border) bg-(--calagopus-surface) px-2.5 py-1 text-xs font-medium text-(--calagopus-text) hover:border-(--calagopus-primary-border) hover:text-(--calagopus-primary-text)'
              >
                <FontAwesomeIcon icon={faBell} className='text-[11px] text-(--calagopus-primary-text)' />
                <span>Alerts</span>
                {announcements.length > 0 && (
                  <span className='inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-(--calagopus-primary) px-1 text-[10px] font-bold text-[#29232a]'>
                    {announcements.length}
                  </span>
                )}
              </NavLink>
            </div>
          </header>
        )}

        {impersonating && (
          <Alert icon={faUserCheck} color='yellow' className='mt-3 mx-4 lg:mx-6'>
            {t('elements.container.alert.impersonating', {})}
          </Alert>
        )}

        {!id &&
          announcements.map((announcement) => (
            <DismissibleAnnouncementAlert key={announcement.uuid} announcement={announcement} />
          ))}

        <div className='blush-page-enter'>{children}</div>
      </div>

      <footer className='mt-6 px-4 lg:px-6 pb-4 flex flex-col gap-1'>
        {serverName && (
          <span className='text-[11px] font-mono text-(--mantine-color-dimmed) self-end'>
            {t('elements.container.connectedTo', { name: serverName })}
          </span>
        )}
        <Copyright />
      </footer>
    </div>
  );
}

function PetalnodesContainer({ children, isNormal }: LayoutProps) {
  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-petalnodes-theme')) {
    return <OrigContainer isNormal={isNormal}>{children}</OrigContainer>;
  }

  return <ThemedContainer isNormal={isNormal}>{children}</ThemedContainer>;
}

export default makeComponentHookable(PetalnodesContainer);
