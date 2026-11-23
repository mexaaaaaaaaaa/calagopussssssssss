export const PETALNODES_BRAND = 'Petalnodes';

export interface ExternalQuickLink {
  id: 'billing' | 'discord' | 'website' | 'status';
  label: string;
  shortLabel: string;
  href: string;
  description: string;
}

export const PETALNODES_LINKS: readonly ExternalQuickLink[] = [
  {
    id: 'billing',
    label: 'Billing',
    shortLabel: 'Billing',
    href: 'https://billing.petalnodes.cloud',
    description: 'Manage invoices & services',
  },
  {
    id: 'discord',
    label: 'Discord',
    shortLabel: 'Discord',
    href: 'https://discord.gg/GS3wuc4HGk',
    description: 'Community & support server',
  },
  {
    id: 'website',
    label: 'Website',
    shortLabel: 'Website',
    href: 'https://petalnodes.cloud',
    description: 'Official Petalnodes portal',
  },
  {
    id: 'status',
    label: 'Service Status',
    shortLabel: 'Status',
    href: 'https://status.petalnodes.cloud',
    description: 'Live node & network uptime',
  },
];

export const PETALNODES_LINK_MAP = {
  billing: 'https://billing.petalnodes.cloud',
  discord: 'https://discord.gg/GS3wuc4HGk',
  website: 'https://petalnodes.cloud',
  panel: 'https://panel.petalnodes.cloud',
  status: 'https://status.petalnodes.cloud',
} as const;

export const PETALNODES_MINECRAFT_DISCLAIMER =
  'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.';
