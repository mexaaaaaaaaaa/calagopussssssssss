import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVoxelBlockPixels, type VoxelBlockKind } from './voxelTextures';

const ALL_KINDS: VoxelBlockKind[] = [
  'cherryLeaves',
  'cherryLog',
  'cherryPlanks',
  'grassTop',
  'grassSide',
  'stone',
  'deepStone',
  'glowOre',
  'lantern',
  'water',
];

test('generateVoxelBlockPixels produces deterministic 64x64 RGBA and normal maps', () => {
  for (const kind of ALL_KINDS) {
    const a = generateVoxelBlockPixels(kind);
    const b = generateVoxelBlockPixels(kind);
    assert.equal(a.size, 64);
    assert.equal(a.rgba.length, 64 * 64 * 4);
    assert.equal(a.normalRgba.length, 64 * 64 * 4);
    assert.deepEqual(a.rgba, b.rgba);
    assert.deepEqual(a.normalRgba, b.normalRgba);
  }
});

test('cherryLeaves generates roughly ~25% alpha cutout holes', () => {
  const leaves = generateVoxelBlockPixels('cherryLeaves');
  let transparentCount = 0;
  for (let i = 3; i < leaves.rgba.length; i += 4) {
    if (leaves.rgba[i] === 0) transparentCount++;
  }
  const ratio = transparentCount / (64 * 64);
  assert.ok(ratio > 0.15 && ratio < 0.35, `Expected ~25% alpha cutout, got ${ratio}`);
});

test('glowOre and lantern provide emissive pixel maps', () => {
  const ore = generateVoxelBlockPixels('glowOre');
  const lantern = generateVoxelBlockPixels('lantern');
  assert.ok(ore.emissiveRgba);
  assert.ok(lantern.emissiveRgba);

  let oreGlowPixels = 0;
  for (let i = 0; i < ore.emissiveRgba!.length; i += 4) {
    if (ore.emissiveRgba![i] > 0) oreGlowPixels++;
  }
  assert.ok(oreGlowPixels > 10);
});
