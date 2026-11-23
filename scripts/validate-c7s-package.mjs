import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_DIR = process.cwd();
const ZIP_PATH = path.resolve(ROOT_DIR, 'cloud_petalnodes_sanctuary.c7s.zip');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseZipEntries(buffer) {
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  assert(eocdOffset !== -1, 'Invalid ZIP archive: End of Central Directory not found.');

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map();

  let cursor = centralOffset;
  for (let i = 0; i < totalEntries; i++) {
    assert(buffer.readUInt32LE(cursor) === 0x02014b50, `Invalid central directory signature at index ${i}`);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLen = buffer.readUInt16LE(cursor + 28);
    const extraLen = buffer.readUInt16LE(cursor + 30);
    const commentLen = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLen);

    assert(buffer.readUInt32LE(localHeaderOffset) === 0x04034b50, `Invalid local header for ${name}`);
    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = buffer.subarray(dataStart, dataStart + compressedSize);
    const content = method === 8 ? zlib.inflateRawSync(rawSlice) : rawSlice;

    entries.set(name, content);
    cursor += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

assert(fs.existsSync(ZIP_PATH), `Missing extension package archive: ${ZIP_PATH}`);
const zipBuffer = fs.readFileSync(ZIP_PATH);
const entries = parseZipEntries(zipBuffer);

try {
  execFileSync('unzip', ['-tqq', ZIP_PATH], { stdio: 'pipe' });
} catch (err) {
  if (err && err.code !== 'ENOENT') {
    throw new Error(`unzip integrity check failed: ${err.message}`);
  }
}

const requiredFiles = [
  'Metadata.toml',
  'backend/Cargo.toml',
  'backend/src/lib.rs',
  'frontend/package.json',
  'frontend/src/index.tsx',
  'frontend/src/app.css',
  'frontend/src/overrides.ts',
  'frontend/src/overrides/CalagopusExtensionRoutes.tsx',
  'frontend/src/overrides/PetalnodesAdminOverview.tsx',
  'frontend/src/overrides/PetalnodesAppIcon.tsx',
  'frontend/src/overrides/PetalnodesAuthWrapper.tsx',
  'frontend/src/overrides/PetalnodesButton.tsx',
  'frontend/src/overrides/PetalnodesCard.tsx',
  'frontend/src/overrides/PetalnodesContainer.tsx',
  'frontend/src/overrides/PetalnodesContentContainerHeader.tsx',
  'frontend/src/overrides/PetalnodesCopyright.tsx',
  'frontend/src/overrides/PetalnodesDashboardHomeAll.tsx',
  'frontend/src/overrides/PetalnodesDashboardHomeGrouped.tsx',
  'frontend/src/overrides/PetalnodesServerItem.tsx',
  'frontend/src/overrides/PetalnodesSidebar.tsx',
  'frontend/src/overrides/PetalnodesTitleCard.tsx',
  'frontend/src/theme/mantineTheme.ts',
  'frontend/src/assets/eggs/mc-paper.svg',
  'frontend/src/assets/servers/paper_vanilla.jpg',
];

for (const file of requiredFiles) {
  assert(entries.has(file), `Missing required entry in .c7s.zip: ${file}`);
}

const forbiddenPrefixesOrNames = [
  'frontend/src/boot.html',
  'frontend/src/shared-adapter.ts',
  'frontend/src/workbench.ts',
  'frontend/tsconfig.json',
];

for (const name of entries.keys()) {
  assert(!forbiddenPrefixesOrNames.includes(name), `Forbidden dev file included in .c7s.zip: ${name}`);
  assert(!name.endsWith('.test.ts') && !name.endsWith('.test.tsx'), `Test file included in .c7s.zip: ${name}`);
  assert(!name.includes('node_modules/'), `node_modules leaked into .c7s.zip: ${name}`);
}

const metadataToml = entries.get('Metadata.toml').toString('utf8');
assert(metadataToml.includes('package_name = "cloud.petalnodes.sanctuary"'), 'Metadata.toml package_name mismatch');
assert(metadataToml.includes('name = "Petalnodes Sanctuary Theme"'), 'Metadata.toml name mismatch');

const cargoToml = entries.get('backend/Cargo.toml').toString('utf8');
assert(cargoToml.includes('name = "cloud_petalnodes_sanctuary"'), 'Cargo.toml package name mismatch');
assert(cargoToml.includes('version = "2.1.0"'), 'Cargo.toml version mismatch');

const pkgJson = JSON.parse(entries.get('frontend/package.json').toString('utf8'));
assert(pkgJson.name === 'cloud.petalnodes.sanctuary', 'frontend/package.json name mismatch');

const overridesTs = entries.get('frontend/src/overrides.ts').toString('utf8');
const defineOverrideCount = (overridesTs.match(/defineOverride\(/g) || []).length;
assert(defineOverrideCount === 13, `Expected 13 defineOverride declarations, found ${defineOverrideCount}`);

const indexTsx = entries.get('frontend/src/index.tsx').toString('utf8');
assert(indexTsx.includes('enterThemes'), 'index.tsx must register enterThemes');
assert(indexTsx.includes('enterGlobal'), 'index.tsx must register enterGlobal');
assert(indexTsx.includes('enterRoutes'), 'index.tsx must register enterRoutes');
assert(indexTsx.includes("path: '/minecraft'"), 'index.tsx must register /minecraft route');
assert(indexTsx.includes("path: '/notifications'"), 'index.tsx must register /notifications route');

const appCss = entries.get('frontend/src/app.css').toString('utf8');
assert(
  appCss.includes(':root[data-petalnodes-theme]'),
  'app.css must scope overrides under :root[data-petalnodes-theme]',
);

console.log(`Validated cloud_petalnodes_sanctuary.c7s.zip (${entries.size} entries, 13 overrides, 0 forbidden files).`);
