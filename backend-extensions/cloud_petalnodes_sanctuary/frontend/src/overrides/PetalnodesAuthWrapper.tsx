import { faGlobe, faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMemo, useRef } from 'react';
import { makeComponentHookable } from 'shared';
import AppIcon from '@/elements/AppIcon.tsx';
import ContentContainer from '@/elements/containers/ContentContainer.tsx';
import Copyright from '@/elements/Copyright.tsx';
import ExtensionSlot from '@/elements/ExtensionSlot.tsx';
import Select from '@/elements/input/Select.tsx';
import OrigAuthWrapper, { type Props } from '@/pages/auth/AuthWrapper.tsx';
import { useContainerAutoHeight } from '@/plugins/viewport/useContainerAutoHeight.ts';
import { useCurrentWindow } from '@/providers/CurrentWindowProvider.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useGlobalStore } from '@/stores/global.ts';
import { AmbientPetalBackground } from '../components/AmbientPetalBackground';
import { PetalnodesLogo } from '../components/PetalnodesLogo';
import { PETALNODES_BRAND, PETALNODES_LINKS } from '../navigation/petalnodesBrand';

function isPetalnodesActive(): boolean {
  return typeof document === 'undefined' || document.documentElement.hasAttribute('data-petalnodes-theme');
}

function ThemedAuthWrapper(props: Props) {
  const modifiedProps = useMemo(() => {
    let currentProps = props;
    if (props.registry) {
      for (const interceptor of props.registry.propsInterceptors) {
        currentProps = interceptor(currentProps);
      }
    }
    return currentProps;
  }, [props]);

  const { title, registry, children } = modifiedProps;
  const { t, language, setLanguage } = useTranslations();
  const settings = useGlobalStore((state) => state.settings);
  const languages = useGlobalStore((state) => state.languages);
  const authRegistry = window.extensionContext.extensionRegistry.pages.auth;
  const containerRef = useRef<HTMLDivElement>(null);
  const { getParent } = useCurrentWindow();

  useContainerAutoHeight({
    containerRef,
    loading: false,
    getParent,
    layout: () => undefined,
    cssVariable: '--auth-page-height',
    useVisualViewportInset: true,
    deps: [getParent],
  });

  const brandName =
    settings.app.name && settings.app.name.toLowerCase() !== 'calagopus'
      ? settings.app.name
      : PETALNODES_BRAND;

  return (
    <ContentContainer title={brandName}>
      <div
        ref={containerRef}
        className='relative flex flex-col overflow-auto h-(--auth-page-height) bg-(--calagopus-bg) text-(--calagopus-text)'
      >
        <AmbientPetalBackground />

        <header className='relative z-10 flex items-center justify-between gap-4 px-5 sm:px-8 py-4'>
          <div className='flex items-center gap-2.5'>
            <PetalnodesLogo size='sm' />
            <span className='font-display text-sm font-bold tracking-tight text-(--calagopus-text)'>
              {brandName}
            </span>
          </div>
          <nav className='hidden sm:flex items-center gap-1.5' aria-label='Portal links'>
            {PETALNODES_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target='_blank'
                rel='noopener noreferrer'
                className='blush-transition inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-(--calagopus-text-secondary) hover:border-(--calagopus-border) hover:bg-(--calagopus-surface) hover:text-(--calagopus-primary-text)'
              >
                <span>{link.shortLabel}</span>
                <FontAwesomeIcon icon={faUpRightFromSquare} className='text-[10px] opacity-65' />
              </a>
            ))}
          </nav>
        </header>

        <div className='relative z-10 m-auto flex flex-col items-center px-4 py-6 max-w-[440px] w-full'>
          <ExtensionSlot components={authRegistry.prependedComponents} name='auth-prepended' />
          <ExtensionSlot components={registry?.prependedComponents ?? []} name='prepended' props={modifiedProps} />

          <div className='w-full rounded-2xl border border-(--calagopus-primary-border) bg-(--calagopus-surface) p-6 sm:p-7 shadow-[var(--calagopus-shadow-popover)] blush-page-enter'>
            <div className='mb-5 flex flex-col items-center text-center'>
              <AppIcon className='mb-3 w-full sm:w-fit justify-center' />
              {title && (
                <h1 className='font-display text-2xl font-bold tracking-tight text-(--calagopus-text)'>
                  {title}
                </h1>
              )}
              <p className='mt-1 text-xs text-(--calagopus-text-secondary)'>
                Petalnodes Sanctuary Control Plane
              </p>
            </div>

            <ExtensionSlot
              components={registry?.prependedContentComponents ?? []}
              name='prepended-content'
              props={modifiedProps}
            />

            {children}

            <ExtensionSlot
              components={registry?.appendedContentComponents ?? []}
              name='appended-content'
              props={modifiedProps}
            />
          </div>

          {settings.user.allowChangingLanguage && languages.length > 1 && (
            <Select
              className='mt-4'
              size='xs'
              aria-label={t('common.form.language', {})}
              leftSection={<FontAwesomeIcon icon={faGlobe} size='sm' />}
              data={languages.map((lang) => ({
                label: new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? lang,
                value: lang,
              }))}
              value={language}
              onChange={(value) => value && setLanguage(value)}
            />
          )}

          <div className='mt-5 w-full'>
            <Copyright className='text-xs' />
          </div>
          <ExtensionSlot components={authRegistry.appendedComponents} name='auth-appended' />
        </div>
      </div>
    </ContentContainer>
  );
}

function PetalnodesAuthWrapper(props: Props) {
  if (!isPetalnodesActive()) {
    return <OrigAuthWrapper {...props} />;
  }
  return <ThemedAuthWrapper {...props} />;
}

export type { Props };
export default makeComponentHookable(PetalnodesAuthWrapper);
