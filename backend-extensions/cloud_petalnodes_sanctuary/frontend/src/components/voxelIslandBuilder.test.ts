import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVoxelIslandLayout, selectQualityProfile } from './voxelIslandBuilder';

test('selectQualityProfile degrades gracefully for software WebGL, mobile, and reduced-motion', () => {
  assert.equal(
    selectQualityProfile({ hasWebGL: false, reducedMotion: false, isSoftwareGl: false }).tier,
    'static',
  );
  assert.equal(
    selectQualityProfile({ hasWebGL: true, reducedMotion: true, isSoftwareGl: false }).tier,
    'static',
  );
  const sw = selectQualityProfile({ hasWebGL: true, reducedMotion: false, isSoftwareGl: true });
  assert.equal(sw.tier, 'low');
  assert.equal(sw.enableShadows, false);
  assert.equal(sw.enableBloom, false);

  const high = selectQualityProfile({
    hasWebGL: true,
    reducedMotion: false,
    isSoftwareGl: false,
    hardwareConcurrency: 8,
  });
  assert.equal(high.tier, 'high');
  assert.equal(high.enableShadows, true);
  assert.equal(high.enableBloom, true);
});

test('buildVoxelIslandLayout is deterministic with zero duplicate block coordinates', () => {
  const a = buildVoxelIslandLayout(80);
  const b = buildVoxelIslandLayout(80);

  assert.deepEqual(a, b);
  assert.ok(a.blocks.length > 150);
  assert.equal(a.petals.length, 80);

  const coords = new Set(a.blocks.map((blk) => `${blk.x},${blk.y},${blk.z}`));
  assert.equal(coords.size, a.blocks.length);

  assert.ok(a.blocks.some((blk) => blk.kind === 'cherryLeaves'));
  assert.ok(a.blocks.some((blk) => blk.kind === 'cherryPlanks'));
  assert.ok(a.blocks.some((blk) => blk.kind === 'lantern'));
  assert.ok(a.blocks.some((blk) => blk.kind === 'water'));
});
