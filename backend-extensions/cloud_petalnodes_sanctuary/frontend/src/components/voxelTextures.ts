/**
 * Deterministic 64x64 procedural pixel + height/normal texture generators
 * for the Petalnodes cherry-blossom voxel sanctuary.
 *
 * Original procedural pixel math only — zero external assets and zero vanilla Mojang sampling.
 */

export type VoxelBlockKind =
  | 'cherryLeaves'
  | 'cherryLog'
  | 'cherryPlanks'
  | 'grassTop'
  | 'grassSide'
  | 'stone'
  | 'deepStone'
  | 'glowOre'
  | 'lantern'
  | 'water';

export interface ProceduralTexturePixels {
  readonly kind: VoxelBlockKind;
  readonly size: 64;
  /** RGBA Uint8Array length = 64 * 64 * 4 */
  readonly rgba: Uint8Array;
  /** Optional RGBA emissive map length = 64 * 64 * 4 */
  readonly emissiveRgba?: Uint8Array;
  /** Tangent-space RGB normal map length = 64 * 64 * 4 */
  readonly normalRgba: Uint8Array;
}

const TEX_SIZE = 64;

function hash2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function buildNormalMap(height: Float32Array, strength = 2.2): Uint8Array {
  const out = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
  const sample = (x: number, y: number) => {
    const wx = ((x % TEX_SIZE) + TEX_SIZE) % TEX_SIZE;
    const wy = ((y % TEX_SIZE) + TEX_SIZE) % TEX_SIZE;
    return height[wy * TEX_SIZE + wx];
  };

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      const idx = (y * TEX_SIZE + x) * 4;
      out[idx] = clampByte(((nx / len) * 0.5 + 0.5) * 255);
      out[idx + 1] = clampByte(((ny / len) * 0.5 + 0.5) * 255);
      out[idx + 2] = clampByte(((nz / len) * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }
  return out;
}

export function generateVoxelBlockPixels(kind: VoxelBlockKind): ProceduralTexturePixels {
  const rgba = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
  const height = new Float32Array(TEX_SIZE * TEX_SIZE);
  let emissiveRgba: Uint8Array | undefined;

  if (kind === 'glowOre' || kind === 'lantern') {
    emissiveRgba = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
  }

  for (let y = 0; y < TEX_SIZE; y++) {
    for (let x = 0; x < TEX_SIZE; x++) {
      const i = y * TEX_SIZE + x;
      const idx = i * 4;
      let r = 255;
      let g = 255;
      let b = 255;
      let a = 255;
      let h = 0.5;
      let er = 0;
      let eg = 0;
      let eb = 0;

      const cellX = Math.floor(x / 4);
      const cellY = Math.floor(y / 4);
      const nFine = hash2d(x, y, 11);
      const nCell = hash2d(cellX, cellY, 23);

      switch (kind) {
        case 'cherryLeaves': {
          // Painterly 3-tone blossom clusters with ~25% crisp cutout holes
          const cluster = hash2d(Math.floor(x / 6), Math.floor(y / 6), 31) * 0.65 + nCell * 0.35;
          const cutout = hash2d(Math.floor(x / 3), Math.floor(y / 3), 59);
          if (cutout < 0.25) {
            a = 0;
            h = 0.05;
          } else if (cluster > 0.72) {
            [r, g, b] = hexToRgb(0xffd9e4);
            h = 0.92;
          } else if (cluster > 0.36) {
            [r, g, b] = hexToRgb(0xff9ab5);
            h = 0.72;
          } else {
            [r, g, b] = hexToRgb(0xe9799a);
            h = 0.55;
          }
          // subtle top-left highlight fleck
          if (a > 0 && x % 6 === 1 && y % 6 === 1 && nFine > 0.4) {
            [r, g, b] = hexToRgb(0xfff1f4);
            h = 1.0;
          }
          break;
        }

        case 'cherryLog': {
          const groove = hash2d(Math.floor(x / 4), Math.floor(y / 14), 73);
          const streak = (x % 8 === 0 && nFine > 0.35) || groove < 0.22;
          if (streak) {
            [r, g, b] = hexToRgb(0x52372b);
            h = 0.28;
          } else if (groove > 0.72) {
            [r, g, b] = hexToRgb(0x845e4c);
            h = 0.75;
          } else {
            [r, g, b] = hexToRgb(0x6b4a3a);
            h = 0.55;
          }
          break;
        }

        case 'cherryPlanks': {
          const seam = y % 16 === 0 || (Math.floor(y / 16) % 2 === 0 ? x === 32 : x === 12 || x === 48);
          const grain = hash2d(Math.floor(x / 8), y, 91);
          if (seam) {
            [r, g, b] = hexToRgb(0xc79184);
            h = 0.22;
          } else if (grain > 0.65) {
            [r, g, b] = hexToRgb(0xf1cab9);
            h = 0.74;
          } else {
            [r, g, b] = hexToRgb(0xe7b9a6);
            h = 0.6;
          }
          break;
        }

        case 'grassTop': {
          const mossTone = nCell * 0.6 + nFine * 0.4;
          const petalFleck = hash2d(x, y, 107) > 0.965;
          if (petalFleck) {
            [r, g, b] = hexToRgb(0xff9bb8);
            h = 0.88;
          } else if (mossTone > 0.72) {
            [r, g, b] = hexToRgb(0x83c26e);
            h = 0.76;
          } else if (mossTone > 0.36) {
            [r, g, b] = hexToRgb(0x6faf5b);
            h = 0.62;
          } else {
            [r, g, b] = hexToRgb(0x5b9649);
            h = 0.48;
          }
          break;
        }

        case 'grassSide': {
          const overhang = 11 + Math.round(Math.sin(x * 0.45) * 2.5 + hash2d(Math.floor(x / 2), 0, 121) * 3);
          if (y <= overhang) {
            [r, g, b] = nFine > 0.5 ? hexToRgb(0x78b964) : hexToRgb(0x6faf5b);
            h = 0.75;
          } else {
            const pebble = hash2d(Math.floor(x / 3), Math.floor(y / 3), 137) > 0.85;
            [r, g, b] = pebble ? hexToRgb(0xa3877a) : nCell > 0.45 ? hexToRgb(0x8a6550) : hexToRgb(0x785543);
            h = pebble ? 0.65 : 0.42;
          }
          break;
        }

        case 'stone': {
          const blockCrack = hash2d(Math.floor(x / 6), Math.floor(y / 6), 149);
          const crack = (x + Math.floor(Math.sin(y * 0.2) * 3)) % 24 === 0 && blockCrack < 0.48;
          if (crack) {
            [r, g, b] = hexToRgb(0x7f7987);
            h = 0.25;
          } else if (nCell > 0.68) {
            [r, g, b] = hexToRgb(0xaca6b4);
            h = 0.74;
          } else {
            [r, g, b] = hexToRgb(0x9c96a3);
            h = 0.58;
          }
          break;
        }

        case 'deepStone': {
          const dNoise = hash2d(Math.floor(x / 5), Math.floor(y / 5), 173);
          if (dNoise < 0.24) {
            [r, g, b] = hexToRgb(0x4b4252);
            h = 0.3;
          } else if (dNoise > 0.74) {
            [r, g, b] = hexToRgb(0x6e6377);
            h = 0.68;
          } else {
            [r, g, b] = hexToRgb(0x5e5466);
            h = 0.5;
          }
          break;
        }

        case 'glowOre': {
          const crystal = hash2d(Math.floor(x / 4), Math.floor(y / 4), 197);
          const inVein = crystal > 0.82 && x > 6 && x < 58 && y > 6 && y < 58;
          if (inVein) {
            const goldCore = crystal > 0.91;
            [r, g, b] = goldCore ? hexToRgb(0xffd26a) : hexToRgb(0xff8fab);
            [er, eg, eb] = [r, g, b];
            h = 0.95;
          } else {
            [r, g, b] = nCell > 0.55 ? hexToRgb(0x665b6e) : hexToRgb(0x544a5c);
            h = 0.45;
          }
          break;
        }

        case 'lantern': {
          const border = x < 6 || x >= 58 || y < 6 || y >= 58 || x === 31 || x === 32;
          const topBottomCap = y < 10 || y >= 54;
          if (border || topBottomCap) {
            [r, g, b] = hexToRgb(0x6b4a3a);
            h = 0.8;
          } else {
            const warm = y > 18 && y < 46 && x > 14 && x < 50;
            [r, g, b] = warm ? hexToRgb(0xffe194) : hexToRgb(0xfff4dd);
            [er, eg, eb] = warm ? hexToRgb(0xffc75a) : hexToRgb(0xffde9e);
            h = 0.38;
          }
          break;
        }

        case 'water': {
          const ripple = Math.sin((x + y * 0.5) * 0.35) * 0.5 + 0.5;
          const foam = hash2d(Math.floor(x / 2), Math.floor(y / 2), 211) > 0.88;
          if (foam) {
            [r, g, b] = hexToRgb(0xf7fbff);
            h = 0.72;
          } else if (ripple > 0.55) {
            [r, g, b] = hexToRgb(0x9bd7f8);
            h = 0.55;
          } else {
            [r, g, b] = hexToRgb(0x7cc3eb);
            h = 0.44;
          }
          a = 228;
          break;
        }
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
      height[i] = h;

      if (emissiveRgba) {
        emissiveRgba[idx] = er;
        emissiveRgba[idx + 1] = eg;
        emissiveRgba[idx + 2] = eb;
        emissiveRgba[idx + 3] = 255;
      }
    }
  }

  return {
    kind,
    size: TEX_SIZE,
    rgba,
    emissiveRgba,
    normalRgba: buildNormalMap(height, kind === 'water' ? 0.9 : 2.1),
  };
}
