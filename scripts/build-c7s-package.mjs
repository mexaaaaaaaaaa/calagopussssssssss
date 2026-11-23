import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT_DIR = process.cwd();
const EXTENSION_DIR = path.resolve(ROOT_DIR, 'backend-extensions/cloud_petalnodes_sanctuary');
const OUTPUT_ZIP = path.resolve(ROOT_DIR, 'cloud_petalnodes_sanctuary.c7s.zip');

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'target', '.turbo']);
const EXCLUDED_RELATIVE_FILES = new Set([
  'frontend/src/shared-adapter.ts',
  'frontend/src/workbench.ts',
  'frontend/src/boot.html',
  'frontend/tsconfig.json',
]);

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrc32Table();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function shouldExclude(relPath) {
  const posix = relPath.split(path.sep).join('/');
  if (EXCLUDED_RELATIVE_FILES.has(posix)) return true;
  if (posix.endsWith('.test.ts') || posix.endsWith('.test.tsx')) return true;
  if (path.posix.basename(posix).startsWith('.env')) return true;
  return false;
}

function collectFiles(dir, baseDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const collected = [];

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, absPath).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      collected.push(...collectFiles(absPath, baseDir));
    } else if (entry.isFile()) {
      if (shouldExclude(relPath)) continue;
      collected.push({ absPath, relPath });
    }
  }

  return collected;
}

function createZipBuffer(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;
  const fixedDate = new Date('2026-01-01T00:00:00Z');
  const { dosTime, dosDate } = toDosTimeDate(fixedDate);

  for (const file of files) {
    const raw = fs.readFileSync(file.absPath);
    const compressed = zlib.deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const nameBuf = Buffer.from(file.relPath, 'utf8');

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirBuffer = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirBuffer, eocd]);
}

if (!fs.existsSync(EXTENSION_DIR)) {
  console.error(`Extension directory missing: ${EXTENSION_DIR}`);
  process.exit(1);
}

const files = collectFiles(EXTENSION_DIR, EXTENSION_DIR);
const zipBuffer = createZipBuffer(files);
fs.writeFileSync(OUTPUT_ZIP, zipBuffer);

console.log(
  `Built ${path.basename(OUTPUT_ZIP)} (${files.length} files, ${(zipBuffer.length / 1024).toFixed(1)} KiB)`,
);
