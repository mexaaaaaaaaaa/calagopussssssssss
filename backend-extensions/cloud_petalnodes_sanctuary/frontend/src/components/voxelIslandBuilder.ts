import type { VoxelBlockKind } from './voxelTextures';

export type QualityTier = 'high' | 'medium' | 'low' | 'static';

export interface QualityProfile {
  tier: QualityTier;
  pixelRatio: number;
  enableShadows: boolean;
  shadowMapSize: number;
  enableBloom: boolean;
  petalCount: number;
}

export interface EnvironmentCapabilities {
  hasWebGL: boolean;
  reducedMotion: boolean;
  isSoftwareGl: boolean;
  isCoarseSmallScreen?: boolean;
  hardwareConcurrency?: number;
}

export interface VoxelBlockPlacement {
  x: number;
  y: number;
  z: number;
  kind: VoxelBlockKind;
  tintHex?: number;
}

export interface PetalParticleSeed {
  x: number;
  y: number;
  z: number;
  speedY: number;
  driftX: number;
  phase: number;
  scale: number;
  colorHex: number;
}

export interface VoxelIslandLayout {
  blocks: VoxelBlockPlacement[];
  /** World anchor on grass surface where Nodey stands */
  nodeyAnchor: { x: number; y: number; z: number };
  /** World anchor on grass surface where Sprout stands */
  sproutAnchor: { x: number; y: number; z: number };
  /** World anchor of warm cottage porch lantern */
  lanternLightPos: { x: number; y: number; z: number };
  /** Petals seeds matching requested count */
  petals: PetalParticleSeed[];
}

export function selectQualityProfile(env: EnvironmentCapabilities): QualityProfile {
  if (!env.hasWebGL || env.reducedMotion) {
    return {
      tier: 'static',
      pixelRatio: 1,
      enableShadows: false,
      shadowMapSize: 512,
      enableBloom: false,
      petalCount: 0,
    };
  }

  if (env.isSoftwareGl || env.isCoarseSmallScreen) {
    return {
      tier: 'low',
      pixelRatio: 1,
      enableShadows: false,
      shadowMapSize: 512,
      enableBloom: false,
      petalCount: 64,
    };
  }

  if ((env.hardwareConcurrency ?? 8) <= 4) {
    return {
      tier: 'medium',
      pixelRatio: 1.25,
      enableShadows: true,
      shadowMapSize: 1024,
      enableBloom: true,
      petalCount: 150,
    };
  }

  return {
    tier: 'high',
    pixelRatio: 1.5,
    enableShadows: true,
    shadowMapSize: 1024,
    enableBloom: true,
    petalCount: 240,
  };
}

function deterministic(seed: number): number {
  const s = Math.sin(seed * 91.345 + 17.23) * 47453.5453;
  return s - Math.floor(s);
}

/**
 * Generates a deterministic floating cherry-blossom voxel sanctuary:
 * - Tapered stone & glowing ore underside (y = -4 .. -1)
 * - Grass surface + small serene pond + waterfall drop (y = 0 .. -3)
 * - Cozy cherry-plank cabin with warm lantern porch
 * - Primary and secondary cherry-blossom trees with layered canopies
 */
export function buildVoxelIslandLayout(petalCount: number): VoxelIslandLayout {
  const blocks: VoxelBlockPlacement[] = [];
  const occupied = new Set<string>();

  const setBlock = (x: number, y: number, z: number, kind: VoxelBlockKind, tintHex?: number) => {
    const key = `${x},${y},${z}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    blocks.push({ x, y, z, kind, tintHex });
  };

  // 1. Pond cutout coordinates on surface (y = 0)
  const isPond = (x: number, z: number) =>
    (x === 1 && z === 2) ||
    (x === 2 && z === 2) ||
    (x === 2 && z === 3) ||
    (x === 1 && z === 3);

  // 2. Tapered island crust & underside (radius ~ 4.4 at surface -> 1.3 at y=-4)
  for (let y = 0; y >= -4; y--) {
    const radius = y === 0 ? 4.35 : y === -1 ? 3.85 : y === -2 ? 3.1 : y === -3 ? 2.15 : 1.25;
    for (let x = -5; x <= 5; x++) {
      for (let z = -5; z <= 5; z++) {
        const dist = Math.hypot(x, z) + (deterministic(x * 13 + z * 29 + y * 7) - 0.5) * 0.55;
        if (dist > radius) continue;

        if (y === 0) {
          if (isPond(x, z)) {
            setBlock(x, y, z, 'water');
          } else {
            setBlock(x, y, z, 'grassTop');
          }
        } else if (y === -1) {
          setBlock(x, y, z, isPond(x, z) ? 'stone' : 'grassSide');
        } else if (y === -2) {
          setBlock(x, y, z, 'stone');
        } else {
          const isOre = deterministic(x * 37 + y * 19 + z * 53) > 0.77;
          setBlock(x, y, z, isOre ? 'glowOre' : 'deepStone');
        }
      }
    }
  }

  // Stylized waterfall cascading off the front-right pond rim
  setBlock(2, -1, 4, 'water');
  setBlock(2, -2, 4, 'water');
  setBlock(2, -3, 4, 'water');

  // 3. Cozy cherry-plank cabin on back-right quadrant (x: 1..3, z: -3..-1)
  for (let x = 1; x <= 3; x++) {
    for (let z = -3; z <= -1; z++) {
      setBlock(x, 1, z, 'cherryPlanks');
      // Corner logs for depth contrast
      const corner = (x === 1 || x === 3) && (z === -3 || z === -1);
      setBlock(x, 2, z, corner ? 'cherryLog' : 'cherryPlanks');
    }
  }
  // Pitched blossom-wood roof
  for (let x = 0; x <= 4; x++) {
    for (let z = -3; z <= -1; z++) {
      setBlock(x, 3, z, 'cherryPlanks');
    }
  }
  for (let x = 1; x <= 3; x++) {
    setBlock(x, 4, -2, 'cherryLeaves');
  }
  // Warm paper lantern hanging at cabin porch
  setBlock(0, 2, -1, 'lantern');

  // 4. Primary Hero Cherry Tree (x: -2, z: -1)
  for (let y = 1; y <= 4; y++) {
    setBlock(-2, y, -1, 'cherryLog');
  }
  setBlock(-1, 4, -1, 'cherryLog');
  const primaryCanopy: Array<[number, number, number]> = [];
  for (let dy = 4; dy <= 6; dy++) {
    const r = dy === 5 ? 2.4 : 1.75;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.hypot(dx, dz) <= r) {
          primaryCanopy.push([-2 + dx, dy, -1 + dz]);
        }
      }
    }
  }
  // Cascading blossom overhang
  primaryCanopy.push([-4, 4, -1], [-3, 3, 1], [-1, 3, -3], [0, 4, 0]);
  for (const [cx, cy, cz] of primaryCanopy) {
    const tint = deterministic(cx * 17 + cy * 31 + cz * 43) > 0.55 ? 0xffd3e1 : 0xffffff;
    setBlock(cx, cy, cz, 'cherryLeaves', tint);
  }

  // 5. Secondary Sapling Cherry Tree (x: -2, z: 2)
  setBlock(-2, 1, 2, 'cherryLog');
  setBlock(-2, 2, 2, 'cherryLog');
  const smallCanopy: Array<[number, number, number]> = [
    [-2, 3, 2],
    [-3, 3, 2],
    [-1, 3, 2],
    [-2, 3, 1],
    [-2, 3, 3],
    [-2, 4, 2],
  ];
  for (const [cx, cy, cz] of smallCanopy) {
    setBlock(cx, cy, cz, 'cherryLeaves', 0xffe0ea);
  }

  // Lantern post beside pond path
  setBlock(0, 1, 1, 'lantern');

  // 6. Petals seeds
  const palette = [0xff8fab, 0xffc9d6, 0xf4a6c1, 0xffe4ec];
  const safeCount = Math.max(0, Math.min(300, Math.floor(petalCount)));
  const petals: PetalParticleSeed[] = Array.from({ length: safeCount }, (_, i) => ({
    x: (deterministic(i * 3.1 + 1) - 0.5) * 11,
    y: 0.4 + deterministic(i * 5.7 + 2) * 7.5,
    z: (deterministic(i * 7.3 + 3) - 0.5) * 11,
    speedY: 0.35 + deterministic(i * 11.1) * 0.45,
    driftX: 0.25 + deterministic(i * 13.7) * 0.35,
    phase: deterministic(i * 17.9) * Math.PI * 2,
    scale: 0.08 + deterministic(i * 23.3) * 0.07,
    colorHex: palette[i % palette.length],
  }));

  return {
    blocks,
    nodeyAnchor: { x: -0.6, y: 0.5, z: 0.7 },
    sproutAnchor: { x: 2.3, y: 0.5, z: 0.8 },
    lanternLightPos: { x: 0.2, y: 2.1, z: -0.8 },
    petals,
  };
}
