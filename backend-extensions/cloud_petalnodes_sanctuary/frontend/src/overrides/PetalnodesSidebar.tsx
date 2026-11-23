import {
  faArrowRightFromBracket,
  faBars,
  faBell,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faCircleHalfStroke,
  faEllipsisVertical,
  faEyeSlash,
  faGraduationCap,
  faMoon,
  faPalette,
  faRotateLeft,
  faSun,
  faUserCog,
  faWindowRestore,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text, Title, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import classNames from 'classnames';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { MemoryRouter, matchPath, NavLink, useLocation, useNavigate } from 'react-router';
import { makeComponentHookable } from 'shared';
import ActionIcon from '@/elements/buttons/ActionIcon.tsx';
import CloseButton from '@/elements/buttons/CloseButton.tsx';
import Avatar from '@/elements/data-display/Avatar.tsx';
import Card from '@/elements/data-display/Card.tsx';
import Icon, { type IconLike } from '@/elements/data-display/Icon.tsx';
import MantineDivider from '@/elements/layout/Divider.tsx';
import OrigSidebar from '@/elements/navigation/Sidebar.tsx';
import ContextMenu, { ContextMenuItem } from '@/elements/overlays/ContextMenu.tsx';
import Drawer from '@/elements/overlays/Drawer.tsx';
import Tooltip from '@/elements/overlays/Tooltip.tsx';
import { useLogoutConfirmation } from '@/elements/useLogoutConfirmation.tsx';
import { isAdmin } from '@/lib/auth/permissions.ts';
import { useCustomIcon } from '@/lib/icons.ts';
import { resolveString } from '@/lib/lazy.ts';
import { openUrl } from '@/lib/network/url.ts';
import { isNamedRoutePathAccessible } from '@/lib/routes.ts';
import {
  DEFAULT_THEME_VARIANT,
  getThemeVariant,
  getThemeVariantCategories,
  getThemeVariants,
  ThemeVariantDefinition,
} from '@/lib/themeVariants.ts';
import { resetAllDeviceOverrides, useDeviceOverrideCount } from '@/lib/userSettings.ts';
import { useRedactAddresses } from '@/plugins/privacy/useRedactAddresses.ts';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { usePendingPathname } from '@/providers/contexts/pendingNavigationContext.ts';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { useWindows } from '@/providers/WindowProvider.tsx';
import RouterRoutes from '@/RouterRoutes.tsx';
import { preloadRouterForPath } from '@/routers/routerImports.ts';
import { useGlobalStore } from '@/stores/global.ts';
import { useQuickActionsStore } from '@/stores/quickActions.ts';
import { useRelativePageStore } from '@/stores/relativePage.ts';
import { setAutoScheme, setThemeVariant, useThemeVariantStore } from '@/stores/themeVariant.ts';
import { PETALNODES_LINKS } from '../navigation/petalnodesBrand';

const CloseMobileMenuContext = createContext<(() => void) | null>(null);
const CollapsedSidebarContext = createContext<boolean>(false);

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'petalnodes.sidebar.collapsed';

function isPetalnodesActive(): boolean {
  return typeof document === 'undefined' || document.documentElement.hasAttribute('data-petalnodes-theme');
}

type SidebarProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
};

function ThemedSidebar({ children, header, footer }: SidebarProps) {
  const { pathname } = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const quickActionsOpen = useQuickActionsStore((state) => state.open);
  const pageHeader = useRelativePageStore((state) => state.pageHeader);
  const setHasMobileNavbar = useRelativePageStore((state) => state.setHasMobileNavbar);

  useEffect(() => {
    setHasMobileNavbar(true);
    return () => setHasMobileNavbar(false);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (quickActionsOpen) setIsMobileMenuOpen(false);
  }, [quickActionsOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  return (
    <>
      {/* Mobile Sanctuary Glass Top Bar */}
      <div className='lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 petal-glass-header mb-2'>
        <div className='flex items-center gap-3 min-w-0'>
          <ActionIcon
            aria-label='Open navigation menu'
            onClick={() => setIsMobileMenuOpen(true)}
            variant='light'
            size='lg'
            radius='md'
          >
            <FontAwesomeIcon icon={faBars} />
          </ActionIcon>
          <div className='min-w-0 flex-1'>
            {pageHeader ? (
              <>
                <Title order={4} lineClamp={1} className='font-display text-(--calagopus-text)'>
                  {pageHeader.title}
                </Title>
                {pageHeader.subtitle && (
                  <Text size='xs' c='dimmed' truncate>
                    {pageHeader.subtitle}
                  </Text>
                )}
              </>
            ) : (
              <span className='font-display text-sm font-bold text-(--calagopus-text)'>Petalnodes</span>
            )}
          </div>
        </div>
        <NavLink
          to='/account/notifications'
          aria-label='Notifications'
          className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-(--calagopus-border) bg-(--calagopus-surface) text-(--calagopus-primary-text)'
        >
          <FontAwesomeIcon icon={faBell} size='sm' />
        </NavLink>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        opened={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        withCloseButton={false}
        size='85%'
        className='petal-glass-drawer'
        styles={{ body: { height: '100%' } }}
      >
        <CloseButton
          size='lg'
          aria-label='Close navigation menu'
          className='absolute! right-4 top-4 z-10'
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <CloseMobileMenuContext.Provider value={() => setIsMobileMenuOpen(false)}>
          <CollapsedSidebarContext.Provider value={false}>
            <div id='sidebar-content' className='h-full flex flex-col gap-2 pt-1'>
              {header && <div className='shrink-0 pr-8'>{header}</div>}
              <div className='flex flex-col flex-1 overflow-y-auto min-h-0 gap-1 py-1'>{children}</div>
              <div className='shrink-0 flex flex-wrap gap-1.5 pt-2 border-t border-(--calagopus-border)'>
                {PETALNODES_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='rounded-lg border border-(--calagopus-border) bg-(--calagopus-surface-secondary) px-2.5 py-1 text-[11px] font-medium text-(--calagopus-text-secondary) hover:text-(--calagopus-primary-text)'
                  >
                    {link.shortLabel}
                  </a>
                ))}
              </div>
              {footer && <div className='shrink-0 pt-1'>{footer}</div>}
            </div>
          </CollapsedSidebarContext.Provider>
        </CloseMobileMenuContext.Provider>
      </Drawer>

      {/* Desktop Liquid-Glass Sanctuary Sidebar */}
      <Card
        id='sidebar-desktop'
        p='sm'
        className={classNames(
          'my-2 ml-2 top-2 sticky! hidden! lg:flex! flex-col h-[calc(100vh-16px)] overflow-hidden rounded-2xl! petal-liquid-glass border-(--calagopus-primary-border)! transition-[width] duration-200 ease-out shrink-0',
          collapsed ? 'w-[78px]!' : 'w-64!',
        )}
      >
        <CollapsedSidebarContext.Provider value={collapsed}>
          <div id='sidebar-content' className='h-full flex flex-col gap-1.5'>
            <div className='shrink-0 flex items-center justify-between gap-1'>
              <div className={classNames('min-w-0 flex-1', collapsed && 'flex justify-center')}>
                {header}
              </div>
              <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                <ActionIcon
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  variant='subtle'
                  size='sm'
                  onClick={toggleCollapsed}
                  className='shrink-0 text-(--calagopus-text-secondary) hover:text-(--calagopus-primary-text)'
                >
                  <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} size='xs' />
                </ActionIcon>
              </Tooltip>
            </div>

            <div className='flex flex-col flex-1 overflow-y-auto overflow-x-hidden min-h-0 gap-1 py-1 pr-0.5'>
              {children}
            </div>

            {footer && <div className='shrink-0 pt-2 border-t border-(--calagopus-border)'>{footer}</div>}
          </div>
        </CollapsedSidebarContext.Provider>
      </Card>
    </>
  );
}

function Sidebar(props: SidebarProps) {
  if (!isPetalnodesActive()) {
    return <OrigSidebar {...props} />;
  }
  return <ThemedSidebar {...props} />;
}

type LinkProps = {
  to: string;
  end?: boolean;
  icon?: IconLike;
  customIcon?: string | null;
  name?: string;
  title?: string;
  className?: string;
  activeMatches?: string[];
};

function ThemedLink({ to, end, icon, customIcon, name, title = name, className, activeMatches }: LinkProps) {
  const { t } = useTranslations();
  const { addWindow } = useWindows();
  const closeMobileMenu = useContext(CloseMobileMenuContext);
  const collapsed = useContext(CollapsedSidebarContext);
  const { pathname } = useLocation();
  const pendingPathname = usePendingPathname();
  const resolvedIcon = useCustomIcon(customIcon, icon);
  const extraActive =
    activeMatches?.some((pattern) => matchPath({ path: pattern, end: false }, pendingPathname ?? pathname)) ?? false;

  const targetTo = to.endsWith('/*') ? to.slice(0, to.length - 2) : to;

  const items: ContextMenuItem[] = useMemo(
    () => [
      {
        type: 'action' as const,
        icon: faWindowRestore,
        label: t('elements.sidebar.button.openInVirtualWindow', {}),
        onClick: () => {
          closeMobileMenu?.();
          addWindow(
            title || 'Window',
            <MemoryRouter initialEntries={[targetTo]}>
              <RouterRoutes isNormal={false} />
            </MemoryRouter>,
          );
        },
        color: 'gray',
      },
      {
        type: 'action' as const,
        icon: faWindowRestore,
        label: t('elements.sidebar.button.openInPopup', {}),
        onClick: () =>
          window.open(
            targetTo,
            '_blank',
            'popup=yes,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes',
          ),
        color: 'gray',
      },
      {
        type: 'action' as const,
        icon: faWindowRestore,
        label: t('elements.sidebar.button.openInNewTab', {}),
        onClick: () => openUrl(targetTo),
        color: 'gray',
      },
    ],
    [t, addWindow, closeMobileMenu, title, targetTo],
  );

  return (
    <ContextMenu items={items}>
      {({ openMenu }) => (
        <NavLink
          to={targetTo}
          end={end}
          onClick={() => closeMobileMenu?.()}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu(e.clientX, e.clientY);
          }}
          onPointerEnter={() => preloadRouterForPath(targetTo)}
          onFocus={() => preloadRouterForPath(targetTo)}
          className='w-full block'
        >
          {({ isActive: navActive }) => {
            const isActive =
              (pendingPathname !== null ? !!matchPath({ path: targetTo, end: !!end }, pendingPathname) : navActive) ||
              extraActive;

            const buttonInner = (
              <div
                className={classNames(
                  'blush-transition flex items-center w-full rounded-xl px-3 py-2 text-[13px] font-medium select-none',
                  collapsed ? 'justify-center px-2' : 'gap-2.5 justify-start',
                  isActive
                    ? 'petal-liquid-pill text-(--calagopus-primary-text) font-semibold cursor-default'
                    : 'text-(--calagopus-text-secondary) hover:bg-(--calagopus-primary-subtle) hover:text-(--calagopus-text)',
                  className,
                )}
              >
                {resolvedIcon && (
                  <span
                    className={classNames(
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center',
                      isActive ? 'text-(--calagopus-primary-text)' : 'opacity-80',
                    )}
                  >
                    <Icon icon={resolvedIcon} />
                  </span>
                )}
                {!collapsed && <span className='truncate'>{name}</span>}
              </div>
            );

            return collapsed && name ? (
              <Tooltip label={name} position='right'>
                {buttonInner}
              </Tooltip>
            ) : (
              buttonInner
            );
          }}
        </NavLink>
      )}
    </ContextMenu>
  );
}

function Link(props: LinkProps) {
  if (!isPetalnodesActive()) {
    return <OrigSidebar.Link {...props} />;
  }
  return <ThemedLink {...props} />;
}

function Divider({ label }: { label?: string }) {
  const collapsed = useContext(CollapsedSidebarContext);
  if (!isPetalnodesActive()) {
    return <OrigSidebar.Divider label={label} />;
  }
  if (collapsed) {
    return <MantineDivider className='my-1.5 opacity-60' />;
  }
  return <MantineDivider className='my-2 text-[11px] uppercase tracking-wider opacity-85' label={label} />;
}

function ThemedFooter() {
  const { t } = useTranslations();
  const { impersonating, user } = useAuth();
  const navigate = useNavigate();
  const collapsed = useContext(CollapsedSidebarContext);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark');
  const deviceOverrideCount = useDeviceOverrideCount();
  const [redactAddresses, setRedactAddresses] = useRedactAddresses();
  const themeVariant = useThemeVariantStore((state) => state.variant);
  const autoScheme = useThemeVariantStore((state) => state.autoScheme);
  const routeOrder = useGlobalStore((state) => state.settings.user?.routeOrder);
  const { confirmLogout, logoutModal } = useLogoutConfirmation();

  const accountRouteDisabled = !isNamedRoutePathAccessible(routeOrder, '/');
  const suspended = Boolean(user?.suspended);
  const accountHidden = suspended || accountRouteDisabled;
  const adminHidden = suspended || !user || !isAdmin(user);

  const themeVariants = getThemeVariants();
  const themeVariantCategories = getThemeVariantCategories();
  const allowedSchemes = getThemeVariant(DEFAULT_THEME_VARIANT)!.schemes;
  const activeSchemes = (getThemeVariant(themeVariant) ?? getThemeVariant(DEFAULT_THEME_VARIANT)!).schemes;
  const prefersAuto = colorScheme === 'auto' || autoScheme;

  const animateThemeChange = (event: React.MouseEvent, apply: () => void) => {
    if (!document.startViewTransition) {
      apply();
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => {
      flushSync(apply);
    });
    transition.ready.then(() => {
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`];
      document.documentElement.animate(
        { clipPath },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  };

  const changeTheme = async (event: React.MouseEvent, nextTheme: 'auto' | 'dark' | 'light') => {
    if (nextTheme === 'auto' ? prefersAuto : nextTheme === colorScheme && !autoScheme) {
      return;
    }
    if (nextTheme === 'auto' && activeSchemes.length < 2) {
      setAutoScheme(true);
      return;
    }
    setAutoScheme(false);
    const nextComputed =
      nextTheme === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : nextTheme;
    if (nextComputed === computedColorScheme) {
      setColorScheme(nextTheme);
      return;
    }
    animateThemeChange(event, () => setColorScheme(nextTheme));
  };

  const changeThemeVariant = (event: React.MouseEvent, variant: ThemeVariantDefinition) => {
    if (variant.id === themeVariant) return;
    const bothSchemes = variant.schemes.length > 1;
    const nextScheme = prefersAuto
      ? bothSchemes
        ? 'auto'
        : variant.schemes[0]
      : variant.schemes.includes(computedColorScheme)
        ? computedColorScheme
        : variant.schemes[0];
    animateThemeChange(event, () => {
      setThemeVariant(variant.id);
      setAutoScheme(prefersAuto && !bothSchemes);
      if (nextScheme !== colorScheme) {
        setColorScheme(nextScheme);
      }
    });
  };

  const themeVariantItems = (parent?: string): ContextMenuItem[] => {
    const isChild = (category?: string) =>
      (category && themeVariantCategories.some((c) => c.id === category) ? category : undefined) === parent;
    return [
      ...themeVariants
        .filter((variant) => isChild(variant.category))
        .map((variant) => ({
          type: 'action' as const,
          icon: variant.icon ?? faPalette,
          label: resolveString(variant.label),
          rightSection: variant.id === themeVariant && <FontAwesomeIcon icon={faCheck} size='sm' />,
          hidden: themeVariants.length < 2,
          onClick: (e: React.MouseEvent) => changeThemeVariant(e, variant),
        })),
      ...themeVariantCategories
        .filter((category) => isChild(category.category))
        .map((category) => {
          const items = themeVariantItems(category.id);
          return {
            type: 'action' as const,
            icon: category.icon ?? faPalette,
            label: resolveString(category.label),
            hidden: themeVariants.length < 2 || !items.some((item) => item.type === 'action' && !item.hidden),
            items,
          };
        }),
    ];
  };

  const items: ContextMenuItem[] = useMemo(
    () => [
      {
        type: 'action' as const,
        icon: faUserCog,
        label: t('pages.account.account.title', {}),
        hidden: accountHidden,
        onClick: () => navigate('/account'),
      },
      {
        type: 'action' as const,
        icon: faBell,
        label: 'Notifications',
        hidden: accountHidden,
        onClick: () => navigate('/account/notifications'),
      },
      {
        type: 'divider' as const,
        hidden: accountHidden || adminHidden,
      },
      {
        type: 'action' as const,
        icon: faGraduationCap,
        label: t('pages.account.admin.title', {}),
        hidden: adminHidden,
        onClick: () => navigate('/admin'),
      },
      {
        type: 'divider' as const,
        hidden: accountHidden && adminHidden,
      },
      {
        type: 'action' as const,
        icon: faCircleHalfStroke,
        label: t('elements.sidebar.button.theme', {}),
        hidden: themeVariants.length < 2 && activeSchemes.length < 2,
        items: [
          ...themeVariantItems(),
          {
            type: 'divider' as const,
            hidden: themeVariants.length < 2,
          },
          {
            type: 'action' as const,
            icon: faCircleHalfStroke,
            label: t('elements.sidebar.button.themeAuto', {}),
            hidden: allowedSchemes.length < 2,
            rightSection: prefersAuto && <FontAwesomeIcon icon={faCheck} size='sm' />,
            onClick: (e: React.MouseEvent) => changeTheme(e, 'auto'),
          },
          {
            type: 'action' as const,
            icon: faMoon,
            label: t('elements.sidebar.button.themeDark', {}),
            hidden: !activeSchemes.includes('dark'),
            rightSection: colorScheme === 'dark' && !autoScheme && <FontAwesomeIcon icon={faCheck} size='sm' />,
            onClick: (e: React.MouseEvent) => changeTheme(e, 'dark'),
          },
          {
            type: 'action' as const,
            icon: faSun,
            label: t('elements.sidebar.button.themeLight', {}),
            hidden: !activeSchemes.includes('light'),
            rightSection: colorScheme === 'light' && !autoScheme && <FontAwesomeIcon icon={faCheck} size='sm' />,
            onClick: (e: React.MouseEvent) => changeTheme(e, 'light'),
          },
        ],
      },
      {
        type: 'action' as const,
        icon: faEyeSlash,
        label: t('elements.sidebar.button.redactAddresses', {}),
        rightSection: redactAddresses && <FontAwesomeIcon icon={faCheck} size='sm' />,
        onClick: () => setRedactAddresses(!redactAddresses),
      },
      {
        type: 'action' as const,
        icon: faRotateLeft,
        label: t('elements.sidebar.button.resetDeviceOverrides', { count: deviceOverrideCount }),
        hidden: deviceOverrideCount === 0,
        onClick: () => resetAllDeviceOverrides(),
      },
      {
        type: 'divider' as const,
      },
      {
        type: 'action' as const,
        icon: faArrowRightFromBracket,
        label: impersonating
          ? t('elements.sidebar.button.stopImpersonating', {})
          : t('elements.sidebar.button.logout', {}),
        color: 'red',
        onClick: confirmLogout,
      },
    ],
    [
      t,
      navigate,
      changeTheme,
      confirmLogout,
      accountHidden,
      adminHidden,
      colorScheme,
      computedColorScheme,
      themeVariant,
      autoScheme,
      deviceOverrideCount,
      redactAddresses,
      setRedactAddresses,
      impersonating,
    ],
  );

  if (!user) return null;

  const displayName = user.nameFirst && user.nameLast ? `${user.nameFirst} ${user.nameLast}` : user.username;

  return (
    <>
      <ContextMenu items={items}>
        {({ openMenu }) => (
          <Card
            className='flex flex-row! justify-between items-center min-h-fit rounded-xl! border-(--calagopus-border)! bg-(--calagopus-surface-secondary)!'
            p='xs'
            hoverable={!accountHidden}
            id='sidebar-account-card'
            onContextMenu={(e) => {
              e.preventDefault();
              openMenu(e.clientX, e.clientY);
            }}
          >
            {collapsed ? (
              <div className='w-full flex flex-col items-center gap-1.5'>
                <ActionIcon
                  variant='subtle'
                  aria-label='Toggle theme'
                  onClick={(e) => changeTheme(e, computedColorScheme === 'dark' ? 'light' : 'dark')}
                >
                  <FontAwesomeIcon icon={computedColorScheme === 'dark' ? faSun : faMoon} size='sm' />
                </ActionIcon>
                <ActionIcon
                  variant='subtle'
                  aria-label='Account menu'
                  onClick={(e) => {
                    e.preventDefault();
                    openMenu(e.clientX, e.clientY);
                  }}
                >
                  <Avatar size={30} src={user.avatar} name={user.username} />
                </ActionIcon>
              </div>
            ) : (
              <>
                <NavLink
                  to={accountHidden ? '#' : '/account'}
                  className='flex items-center flex-1 min-w-0 gap-2.5'
                  onClick={(e) => {
                    e.preventDefault();
                    if (!accountHidden) navigate('/account');
                  }}
                >
                  <Avatar size={36} className='select-none shrink-0 ring-2 ring-(--calagopus-primary-border)' src={user.avatar} name={user.username} />
                  <div className='min-w-0 flex-1'>
                    <div className='font-sans font-semibold text-xs text-(--calagopus-text) truncate'>
                      {displayName}
                    </div>
                    <div className='text-[10.5px] font-medium text-(--calagopus-primary-text) truncate'>
                      {isAdmin(user) ? 'Administrator' : 'Member'}
                    </div>
                  </div>
                </NavLink>
                <div className='flex items-center gap-0.5 shrink-0'>
                  <Tooltip label={computedColorScheme === 'dark' ? 'Switch to Blush Light' : 'Switch to Midnight Dark'}>
                    <ActionIcon
                      variant='subtle'
                      size='sm'
                      aria-label='Toggle theme'
                      onClick={(e) => changeTheme(e, computedColorScheme === 'dark' ? 'light' : 'dark')}
                    >
                      <FontAwesomeIcon icon={computedColorScheme === 'dark' ? faSun : faMoon} size='xs' />
                    </ActionIcon>
                  </Tooltip>
                  <ActionIcon
                    variant='subtle'
                    size='sm'
                    aria-label='Account actions'
                    onClick={(e) => {
                      e.preventDefault();
                      openMenu(e.clientX, e.clientY);
                    }}
                  >
                    <FontAwesomeIcon icon={faEllipsisVertical} size='xs' />
                  </ActionIcon>
                </div>
              </>
            )}
          </Card>
        )}
      </ContextMenu>
      {logoutModal}
    </>
  );
}

function Footer() {
  if (!isPetalnodesActive()) {
    return <OrigSidebar.Footer />;
  }
  return <ThemedFooter />;
}

export default makeComponentHookable(Sidebar, {
  Link: makeComponentHookable(Link),
  Divider: makeComponentHookable(Divider),
  Footer: makeComponentHookable(Footer),
});
