import React from 'react';
import DoodleCrewFooter, {
  type CrewMember,
  type DoodleKind,
  type FooterAction,
  type FooterColumn,
} from '../components/DoodleCrewFooter';
import { NodeyMascot } from '../components/NodeyMascot';
import {
  PETALNODES_BRAND,
  PETALNODES_LINK_MAP,
  PETALNODES_MINECRAFT_DISCLAIMER,
} from '../navigation/petalnodesBrand';
import type { PetalnodesThemeMode } from '../utils/themeMode';

export interface AppFooterProps {
  brandName?: string;
  onNavigate?: (path: string) => void;
  themeMode?: PetalnodesThemeMode;
}

const PETALNODES_CREW: CrewMember[] = [
  { kind: 'nodey', letter: 0, seat: 'front', offset: -0.32, name: 'Nodey', says: "Your world's safe with me." },
  { kind: 'bird', letter: 2, seat: 'top', offset: 0.02, name: 'Pip', says: 'Ping? Nice and low.' },
  { kind: 'mushroom', letter: 3, seat: 'front', offset: 0.12, scale: 0.95, name: 'Morel', says: 'Clean logs and steady uptime.' },
  { kind: 'sapling', letter: 5, seat: 'top', offset: 0, name: 'Sprout', says: 'Plant me! I grow into islands.' },
  { kind: 'ghost', letter: 6, seat: 'behind', offset: 0, name: 'Boo', says: 'Lag? Never heard of her.' },
  { kind: 'cat', letter: 9, seat: 'front', offset: 0.42, flip: true, name: 'Patch', says: 'Watching your container health.' },
];

const PETALNODES_DOODLES: DoodleKind[] = [
  'petal',
  'petal',
  'heart',
  'star',
  'petal',
  'sparkle',
  'cube',
  'petal',
];

export function AppFooter({
  brandName = PETALNODES_BRAND,
  onNavigate,
  themeMode = 'light',
}: AppFooterProps) {
  const columns: FooterColumn[] = React.useMemo(
    () => [
      {
        title: 'Petalnodes',
        links: [
          { label: 'Website', href: PETALNODES_LINK_MAP.website },
          { label: 'Billing', href: PETALNODES_LINK_MAP.billing },
          { label: 'Panel', href: PETALNODES_LINK_MAP.panel },
          { label: 'Status', href: PETALNODES_LINK_MAP.status },
        ],
      },
      {
        title: 'Workspace',
        links: [
          { label: 'Servers', href: '/', onClick: onNavigate ? () => onNavigate('/') : undefined },
          {
            label: 'API Keys',
            href: '/account/api-keys',
            onClick: onNavigate ? () => onNavigate('/account/api-keys') : undefined,
          },
          {
            label: 'SSH Keys',
            href: '/account/ssh-keys',
            onClick: onNavigate ? () => onNavigate('/account/ssh-keys') : undefined,
          },
          {
            label: 'Activity',
            href: '/account/activity',
            onClick: onNavigate ? () => onNavigate('/account/activity') : undefined,
          },
        ],
      },
      {
        title: 'Account',
        links: [
          {
            label: 'Profile',
            href: '/account',
            onClick: onNavigate ? () => onNavigate('/account') : undefined,
          },
          {
            label: 'Security',
            href: '/account/security',
            onClick: onNavigate ? () => onNavigate('/account/security') : undefined,
          },
        ],
      },
      {
        title: 'Community',
        links: [{ label: 'Discord', href: PETALNODES_LINK_MAP.discord }],
      },
    ],
    [onNavigate],
  );

  const actions: FooterAction[] = React.useMemo(
    () => [
      {
        label: 'Join the Discord',
        href: PETALNODES_LINK_MAP.discord,
        icon: 'petal',
        variant: 'outline',
      },
      {
        label: 'Billing Portal',
        href: PETALNODES_LINK_MAP.billing,
        icon: 'cube',
        variant: 'solid',
      },
    ],
    [],
  );

  const footerPalette =
    themeMode === 'dark'
      ? { background: '#1A1A23', ink: '#F7F2F5', accent: '#F4A6C1' }
      : { background: '#FFFFFF', ink: '#29232A', accent: '#F4A6C1' };

  return (
    <div className="mt-auto relative z-10 border-t border-[var(--calagopus-border)] bg-[var(--calagopus-surface)]">
      <DoodleCrewFooter
        wordmark="PETALNODES"
        brand={brandName.toLowerCase()}
        blurb="Petalnodes — hosting infrastructure for your worlds, with care."
        tagline="Plant a seed. Grow a world."
        columns={columns}
        actions={actions}
        copyright={`© 2026 ${brandName} · Powered by Calagopus · ${PETALNODES_MINECRAFT_DISCLAIMER}`}
        legal={[]}
        socials={[]}
        backToTop
        crew={PETALNODES_CREW}
        doodles={PETALNODES_DOODLES}
        doodleCount={12}
        palette={footerPalette}
        fontFamily="'Plus Jakarta Sans', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        serifFamily="Georgia, Cambria, 'Times New Roman', serif"
        height="620px"
        logo={<NodeyMascot size={28} />}
      />
    </div>
  );
}
