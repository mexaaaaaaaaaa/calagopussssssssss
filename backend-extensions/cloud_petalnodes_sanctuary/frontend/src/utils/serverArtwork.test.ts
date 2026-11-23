import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyServerSoftware,
  loadCustomServerBanners,
  MAX_CUSTOM_BANNER_BYTES,
  saveCustomServerBanners,
  SERVER_BANNER_STORAGE_KEY,
  validateBannerImageFile,
} from './serverArtwork';

test('classifyServerSoftware maps all Minecraft and proxy eggs accurately', () => {
  assert.equal(classifyServerSoftware('Paper 1.21').id, 'paper');
  assert.equal(classifyServerSoftware('Paper 1.21').artKey, 'paper_vanilla');

  assert.equal(classifyServerSoftware('Vanilla Minecraft').id, 'vanilla');
  assert.equal(classifyServerSoftware('Purpur 1.21.4').id, 'purpur');
  assert.equal(classifyServerSoftware('Purpur 1.21.4').artKey, 'purpur_end');

  assert.equal(classifyServerSoftware('Spigot 1.20').id, 'spigot');
  assert.equal(classifyServerSoftware('Fabric 1.21').id, 'fabric');
  assert.equal(classifyServerSoftware('NeoForge 21.1').id, 'neoforge');
  assert.equal(classifyServerSoftware('Forge Server').id, 'forge');
  assert.equal(classifyServerSoftware('All The Mods 9 Modpack').id, 'modpack');
  assert.equal(classifyServerSoftware('Bedrock Dedicated').id, 'bedrock');
  assert.equal(classifyServerSoftware('Velocity').id, 'velocity');
  assert.equal(classifyServerSoftware('Waterfall Proxy').id, 'waterfall');
  assert.equal(classifyServerSoftware('BungeeCord').id, 'bungeecord');
  assert.equal(classifyServerSoftware('Valkey 8').id, 'cache');
  assert.equal(classifyServerSoftware('Custom Container').id, 'generic');
});

test('validateBannerImageFile rejects unsupported MIME types and oversized files', () => {
  assert.equal(validateBannerImageFile({ type: 'image/png', size: 256000 }), null);
  assert.equal(validateBannerImageFile({ type: 'image/webp', size: 512000 }), null);
  assert.ok(validateBannerImageFile({ type: 'image/svg+xml', size: 12000 }));
  assert.ok(validateBannerImageFile({ type: 'text/html', size: 100 }));
  assert.ok(validateBannerImageFile({ type: 'image/jpeg', size: MAX_CUSTOM_BANNER_BYTES + 1 }));
});

test('loadCustomServerBanners sanitizes unsafe URLs and preserves valid data URIs', () => {
  const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const store = new Map<string, string>();
  saveCustomServerBanners(
    {
      'alpha-01': validPng,
      'bad-01': 'javascript:alert(1)',
    },
    { setItem: (k, v) => store.set(k, v) },
  );

  const loaded = loadCustomServerBanners({ getItem: (k) => store.get(k) ?? null });
  assert.equal(loaded['alpha-01'], validPng);
  assert.equal(loaded['bad-01'], undefined);
  assert.ok(store.has(SERVER_BANNER_STORAGE_KEY));
});
