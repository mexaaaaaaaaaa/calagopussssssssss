import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  hash,
  layoutWord,
  lookAt,
  seatPoint,
  stepFloater,
  timeline,
  type Floater,
} from './DoodleCrewFooter';
import { PETALNODES_LINK_MAP, PETALNODES_MINECRAFT_DISCLAIMER } from '../navigation/petalnodesBrand';

test('hash is deterministic and always in [0, 1)', () => {
  for (let i = -5; i < 20; i++) {
    const a = hash(i);
    const b = hash(i);
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 1);
  }
});

test('layoutWord handles normal and invalid letter advances safely', () => {
  const res = layoutWord([120, 110, NaN, -10, 100], 0.05, 200);
  assert.equal(res.x.length, 5);
  assert.equal(res.w[2], 0);
  assert.equal(res.w[3], 0);
  assert.ok(res.width > 300);
});

test('seatPoint places front, top, and behind seats relative to cap height', () => {
  const front = seatPoint('front', 100, 80, 144, 0, 1);
  const top = seatPoint('top', 100, 80, 144, 0, 1);
  const behind = seatPoint('behind', 100, 80, 144, 0, 1);

  assert.equal(front.x, 140);
  assert.equal(front.y, 0);
  assert.equal(top.y, -144);
  assert.equal(behind.y, -114);
});

test('lookAt caps pupil displacement within max radius', () => {
  const p = lookAt(0, 0, 500, 0, 3, 200);
  assert.ok(Math.abs(p.x - 3) < 1e-6);
  assert.equal(p.y, 0);

  const zero = lookAt(10, 10, 10, 10, 3, 200);
  assert.deepEqual(zero, { x: 0, y: 0 });
});

test('stepFloater advances and wraps out-of-bounds floaters deterministically', () => {
  const f: Floater = {
    x: 100,
    y: 450,
    vx: 0,
    vy: 20,
    rot: 0,
    vr: 10,
    fall: 20,
    phase: 0,
    pop: 0,
  };
  stepFloater(f, 0.05, 1, 800, 400, NaN, NaN, 100, () => 0.5);
  assert.equal(f.y, -40);
  assert.equal(f.x, 400);
});

test('timeline calculates progressive animation delays across PETALNODES length', () => {
  const tl = timeline('PETALNODES'.length, 6, 5, 2);
  assert.ok(tl.ground < tl.letter(0));
  assert.ok(tl.letter(9) < tl.crewStart);
  assert.ok(tl.member(0) < tl.member(5));
  assert.ok(tl.action(1) < tl.total);
  assert.equal(clamp(12, 0, 9), 9);
});

test('verified Petalnodes URLs and Mojang disclaimer are exact', () => {
  assert.equal(PETALNODES_LINK_MAP.website, 'https://petalnodes.cloud');
  assert.equal(PETALNODES_LINK_MAP.billing, 'https://billing.petalnodes.cloud');
  assert.equal(PETALNODES_LINK_MAP.panel, 'https://panel.petalnodes.cloud');
  assert.equal(PETALNODES_LINK_MAP.discord, 'https://discord.gg/GS3wuc4HGk');
  assert.equal(PETALNODES_LINK_MAP.status, 'https://status.petalnodes.cloud');
  assert.match(PETALNODES_MINECRAFT_DISCLAIMER, /Mojang or Microsoft/i);
});
