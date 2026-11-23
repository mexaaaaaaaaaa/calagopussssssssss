import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXT_FRONTEND_SRC = path.resolve(THIS_DIR, '..');
const EXT_ROOT = path.resolve(EXT_FRONTEND_SRC, '../..');

test('extension metadata files use canonical cloud.petalnodes.sanctuary v2.1.0', () => {
  const metadataToml = fs.readFileSync(path.join(EXT_ROOT, 'Metadata.toml'), 'utf8');
  assert.match(metadataToml, /package_name\s*=\s*"cloud\.petalnodes\.sanctuary"/);
  assert.match(metadataToml, /name\s*=\s*"Petalnodes Sanctuary Theme"/);

  const cargoToml = fs.readFileSync(path.join(EXT_ROOT, 'backend/Cargo.toml'), 'utf8');
  assert.match(cargoToml, /name\s*=\s*"cloud_petalnodes_sanctuary"/);
  assert.match(cargoToml, /version\s*=\s*"2\.1\.0"/);

  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(EXT_ROOT, 'frontend/package.json'), 'utf8'),
  ) as { name: string; version: string };
  assert.equal(pkgJson.name, 'cloud.petalnodes.sanctuary');
  assert.equal(pkgJson.version, '2.1.0');
});

test('overrides.ts declares 13 unique defineOverride mappings with existing modules and safe hooks', () => {
  const overridesSource = fs.readFileSync(path.join(EXT_FRONTEND_SRC, 'overrides.ts'), 'utf8');
  const matches = [...overridesSource.matchAll(/defineOverride\(\s*([A-Za-z0-9_]+)\s*,\s*([A-Za-z0-9_]+)\s*\)/g)];
  assert.equal(matches.length, 13);

  const originals = new Set(matches.map((m) => m[1]));
  const replacements = new Set(matches.map((m) => m[2]));
  assert.equal(originals.size, 13, 'Each Orig component must be overridden at most once');
  assert.equal(replacements.size, 13, 'Each Petalnodes replacement must be unique');

  const overrideFiles = fs
    .readdirSync(THIS_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => path.join(THIS_DIR, f));

  assert.ok(overrideFiles.length >= 14, 'Expected 13 component overrides + CalagopusExtensionRoutes');

  for (const file of overrideFiles) {
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(!src.includes("from '../workbench"), `${path.basename(file)} must not import workbench`);
    assert.ok(!src.includes("from './workbench"), `${path.basename(file)} must not import workbench`);
    const earlyFallbackIdx = src.indexOf('return <Orig');
    if (earlyFallbackIdx !== -1) {
      const fnStart = src.lastIndexOf('function ', earlyFallbackIdx);
      const preamble = fnStart !== -1 ? src.slice(fnStart, earlyFallbackIdx) : src.slice(0, earlyFallbackIdx);
      assert.equal(
        /\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(preamble),
        false,
        `${path.basename(file)} must not invoke React hooks before conditional <Orig*> return`,
      );
    }
  }
});

test('index.tsx registers theme isolation, global petal layer, and /minecraft + /notifications routes', () => {
  const indexSrc = fs.readFileSync(path.join(EXT_FRONTEND_SRC, 'index.tsx'), 'utf8');
  assert.match(indexSrc, /data-petalnodes-theme/);
  assert.match(indexSrc, /cloud\.petalnodes\.sanctuary@2\.1\.0/);
  assert.match(indexSrc, /enterThemes/);
  assert.match(indexSrc, /disableVariants/);
  assert.match(indexSrc, /enterGlobal/);
  assert.match(indexSrc, /AmbientPetalBackground/);
  assert.match(indexSrc, /enterRoutes/);
  assert.match(indexSrc, /addServerRoute/);
  assert.match(indexSrc, /path:\s*'\/minecraft'/);
  assert.match(indexSrc, /addAccountRoute/);
  assert.match(indexSrc, /path:\s*'\/notifications'/);
  assert.equal(
    fs.existsSync(path.join(EXT_FRONTEND_SRC, 'boot.html')),
    false,
    'Extension must never emit frontend/src/boot.html',
  );
});

test('app.css scopes theme variables and Mantine overrides under data-petalnodes-theme', () => {
  const css = fs.readFileSync(path.join(EXT_FRONTEND_SRC, 'app.css'), 'utf8');
  assert.match(css, /:root\[data-petalnodes-theme\]/);
  assert.match(css, /#fff8fa/i);
  assert.match(css, /#f4a6c1/i);
  assert.match(css, /\[data-mantine-color-scheme='dark'\]/);
});
