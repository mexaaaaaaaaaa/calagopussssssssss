import { sanitizeImageSrc } from '../api/calagopusCore';

export type ServerArtKey =
  | 'paper_vanilla'
  | 'purpur_end'
  | 'modded_forge'
  | 'proxy_network'
  | 'bedrock_outpost';

export type ServerSoftwareId =
  | 'paper'
  | 'vanilla'
  | 'purpur'
  | 'spigot'
  | 'fabric'
  | 'forge'
  | 'neoforge'
  | 'modpack'
  | 'bedrock'
  | 'velocity'
  | 'waterfall'
  | 'bungeecord'
  | 'cache'
  | 'generic';

export interface ServerSoftwareVisual {
  id: ServerSoftwareId;
  label: string;
  category: 'Minecraft Java' | 'Modded' | 'Bedrock' | 'Proxy Network' | 'Infrastructure';
  artKey: ServerArtKey;
  gradient: string;
  accentHex: string;
  shortCode: string;
}

const SOFTWARE_CATALOG: Record<ServerSoftwareId, ServerSoftwareVisual> = {
  paper: {
    id: 'paper',
    label: 'PaperMC',
    category: 'Minecraft Java',
    artKey: 'paper_vanilla',
    gradient: 'linear-gradient(135deg, #1E3A2F 0%, #3E6B4C 55%, #F4A6C1 100%)',
    accentHex: '#65A879',
    shortCode: 'PP',
  },
  vanilla: {
    id: 'vanilla',
    label: 'Vanilla',
    category: 'Minecraft Java',
    artKey: 'paper_vanilla',
    gradient: 'linear-gradient(135deg, #274736 0%, #4E8558 60%, #F7BDD2 100%)',
    accentHex: '#5FA66E',
    shortCode: 'VN',
  },
  purpur: {
    id: 'purpur',
    label: 'Purpur',
    category: 'Minecraft Java',
    artKey: 'purpur_end',
    gradient: 'linear-gradient(135deg, #1A1432 0%, #4C2C78 58%, #D985C6 100%)',
    accentHex: '#B67AE6',
    shortCode: 'PR',
  },
  spigot: {
    id: 'spigot',
    label: 'Spigot / Bukkit',
    category: 'Minecraft Java',
    artKey: 'paper_vanilla',
    gradient: 'linear-gradient(135deg, #3A2918 0%, #8C6232 60%, #E7AD55 100%)',
    accentHex: '#E7AD55',
    shortCode: 'SP',
  },
  fabric: {
    id: 'fabric',
    label: 'Fabric',
    category: 'Modded',
    artKey: 'modded_forge',
    gradient: 'linear-gradient(135deg, #23222A 0%, #565264 55%, #DFC8A8 100%)',
    accentHex: '#D8BD96',
    shortCode: 'FB',
  },
  forge: {
    id: 'forge',
    label: 'Forge',
    category: 'Modded',
    artKey: 'modded_forge',
    gradient: 'linear-gradient(135deg, #1F2634 0%, #415572 58%, #E79B55 100%)',
    accentHex: '#EA9952',
    shortCode: 'FG',
  },
  neoforge: {
    id: 'neoforge',
    label: 'NeoForge',
    category: 'Modded',
    artKey: 'modded_forge',
    gradient: 'linear-gradient(135deg, #2B1D1B 0%, #804833 55%, #F29C6B 100%)',
    accentHex: '#F28C5C',
    shortCode: 'NF',
  },
  modpack: {
    id: 'modpack',
    label: 'Modpack',
    category: 'Modded',
    artKey: 'modded_forge',
    gradient: 'linear-gradient(135deg, #271E30 0%, #634375 55%, #F4A6C1 100%)',
    accentHex: '#D08AD4',
    shortCode: 'MP',
  },
  bedrock: {
    id: 'bedrock',
    label: 'Bedrock',
    category: 'Bedrock',
    artKey: 'bedrock_outpost',
    gradient: 'linear-gradient(135deg, #172130 0%, #2D4663 58%, #80B3D9 100%)',
    accentHex: '#6EAEE0',
    shortCode: 'BR',
  },
  velocity: {
    id: 'velocity',
    label: 'Velocity Proxy',
    category: 'Proxy Network',
    artKey: 'proxy_network',
    gradient: 'linear-gradient(135deg, #161826 0%, #2E3459 55%, #F4A6C1 100%)',
    accentHex: '#8C9CF5',
    shortCode: 'VL',
  },
  waterfall: {
    id: 'waterfall',
    label: 'Waterfall Proxy',
    category: 'Proxy Network',
    artKey: 'proxy_network',
    gradient: 'linear-gradient(135deg, #122334 0%, #25547B 55%, #84D4F4 100%)',
    accentHex: '#5EC2EC',
    shortCode: 'WF',
  },
  bungeecord: {
    id: 'bungeecord',
    label: 'BungeeCord',
    category: 'Proxy Network',
    artKey: 'proxy_network',
    gradient: 'linear-gradient(135deg, #251B32 0%, #5B3D78 58%, #F4A6C1 100%)',
    accentHex: '#C28DF2',
    shortCode: 'BC',
  },
  cache: {
    id: 'cache',
    label: 'Valkey / Redis',
    category: 'Infrastructure',
    artKey: 'bedrock_outpost',
    gradient: 'linear-gradient(135deg, #281722 0%, #6D2940 58%, #F4A6C1 100%)',
    accentHex: '#EC7E8A',
    shortCode: 'KV',
  },
  generic: {
    id: 'generic',
    label: 'Game Container',
    category: 'Infrastructure',
    artKey: 'bedrock_outpost',
    gradient: 'linear-gradient(135deg, #1F1B26 0%, #44374F 58%, #F4A6C1 100%)',
    accentHex: '#F4A6C1',
    shortCode: 'SV',
  },
};

export function classifyServerSoftware(eggName: string, serverName = ''): ServerSoftwareVisual {
  const hay = `${eggName} ${serverName}`.toLowerCase();

  if (hay.includes('neoforge')) return SOFTWARE_CATALOG.neoforge;
  if (hay.includes('forge')) return SOFTWARE_CATALOG.forge;
  if (hay.includes('fabric')) return SOFTWARE_CATALOG.fabric;
  if (hay.includes('modpack') || hay.includes('all the mods') || hay.includes('atm') || hay.includes('curseforge')) {
    return SOFTWARE_CATALOG.modpack;
  }
  if (hay.includes('purpur')) return SOFTWARE_CATALOG.purpur;
  if (hay.includes('paper')) return SOFTWARE_CATALOG.paper;
  if (hay.includes('spigot') || hay.includes('bukkit')) return SOFTWARE_CATALOG.spigot;
  if (hay.includes('velocity')) return SOFTWARE_CATALOG.velocity;
  if (hay.includes('waterfall')) return SOFTWARE_CATALOG.waterfall;
  if (hay.includes('bungee')) return SOFTWARE_CATALOG.bungeecord;
  if (hay.includes('bedrock') || hay.includes('geyser') || hay.includes('pocketmine')) {
    return SOFTWARE_CATALOG.bedrock;
  }
  if (hay.includes('vanilla')) return SOFTWARE_CATALOG.vanilla;
  if (hay.includes('valkey') || hay.includes('redis') || hay.includes('postgres')) {
    return SOFTWARE_CATALOG.cache;
  }

  return SOFTWARE_CATALOG.generic;
}

export const SERVER_BANNER_STORAGE_KEY = 'petalnodes.server.banners.v1';
export const MAX_CUSTOM_BANNER_BYTES = 1_500_000;

export function loadCustomServerBanners(
  storage?: Pick<Storage, 'getItem'> | null,
): Record<string, string> {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const raw = store?.getItem(SERVER_BANNER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [id, val] of Object.entries(parsed)) {
      if (typeof val === 'string') {
        const safe = sanitizeImageSrc(val);
        if (safe) result[id] = safe;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveCustomServerBanners(
  banners: Record<string, string>,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    store?.setItem(SERVER_BANNER_STORAGE_KEY, JSON.stringify(banners));
  } catch {
    // Ignore quota/storage restrictions
  }
}

export function validateBannerImageFile(file: { type: string; size: number }): string | null {
  const allowed = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
  if (!allowed.has(file.type.toLowerCase())) {
    return 'Upload a PNG, JPEG, or WebP banner image.';
  }
  if (file.size > MAX_CUSTOM_BANNER_BYTES) {
    return 'Banner image must be 1.5 MB or smaller.';
  }
  return null;
}
