#!/usr/bin/env node
/**
 * Generates deterministic, domain-authentic 16:9 vector artwork files for every
 * Egg in the three already-configured Calagopus repositories
 * (pterodactyl/game-eggs, pterodactyl/application-eggs, pterodactyl/generic-eggs)
 * plus compliant PNG/SVG PWA icons for Petalnodes.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const EGGS_ASSET_DIR = path.join(ROOT_DIR, 'backend-extensions', 'cloud_petalnodes_sanctuary', 'frontend', 'src', 'assets', 'eggs');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Crisp minimal SVG generator per Egg with unique composition, motif geometry, sky/terrain, and accent lighting.
const EGG_VISUAL_SPECS = [
  // Game Eggs — Minecraft family
  { id: 'mc-vanilla', bg1: '#1A3024', bg2: '#3B6E4C', accent: '#6BD482', glow: '#F4A6C1', motif: 'voxel-meadow' },
  { id: 'mc-paper', bg1: '#182A24', bg2: '#2D5847', accent: '#8FE0A4', glow: '#F7BDD2', motif: 'voxel-scroll' },
  { id: 'mc-purpur', bg1: '#1A122C', bg2: '#46266E', accent: '#C68BF5', glow: '#F4A6C1', motif: 'end-citadel' },
  { id: 'mc-spigot', bg1: '#2D1F12', bg2: '#6B4926', accent: '#F2B459', glow: '#F7D394', motif: 'golden-anvil' },
  { id: 'mc-fabric', bg1: '#211F28', bg2: '#4B4558', accent: '#E6CFA8', glow: '#F4A6C1', motif: 'loom-blocks' },
  { id: 'mc-forge', bg1: '#1B2230', bg2: '#374863', accent: '#F09D58', glow: '#F4A6C1', motif: 'forge-spire' },
  { id: 'mc-neoforge', bg1: '#2B1815', bg2: '#753928', accent: '#F68D5C', glow: '#FAD0A8', motif: 'ember-cuboid' },
  { id: 'mc-bedrock', bg1: '#152233', bg2: '#2A4B6C', accent: '#75B8EB', glow: '#B8E0FA', motif: 'coastal-bastion' },
  { id: 'mc-velocity', bg1: '#141728', bg2: '#2B355C', accent: '#8FA3F8', glow: '#F4A6C1', motif: 'prism-bridge' },
  { id: 'mc-waterfall', bg1: '#102232', bg2: '#1F5178', accent: '#62CCF2', glow: '#B4ECFA', motif: 'cascade-gate' },
  { id: 'mc-bungeecord', bg1: '#231730', bg2: '#513170', accent: '#C58DF5', glow: '#F4A6C1', motif: 'portal-ring' },
  // Game Eggs — Other Games
  { id: 'game-cs2', bg1: '#171C24', bg2: '#323E4F', accent: '#F09D38', glow: '#F7C97E', motif: 'tactical-radar' },
  { id: 'game-rust', bg1: '#291716', bg2: '#5E2E26', accent: '#E86A4A', glow: '#F4A88E', motif: 'salvage-dome' },
  { id: 'game-ark', bg1: '#132424', bg2: '#254C4A', accent: '#5BE0C1', glow: '#A7F5DF', motif: 'obelisk-canopy' },
  { id: 'game-terraria', bg1: '#16253A', bg2: '#2C4D6E', accent: '#6CE08A', glow: '#E88EF2', motif: 'crystal-cavern' },
  { id: 'game-palworld', bg1: '#1C1D36', bg2: '#433F75', accent: '#F4A6C1', glow: '#8ED8F8', motif: 'sphere-plateau' },
  { id: 'game-valheim', bg1: '#182124', bg2: '#31454A', accent: '#79C4D6', glow: '#F2B86D', motif: 'runestone-fjord' },
  { id: 'game-factorio', bg1: '#241D15', bg2: '#544029', accent: '#F2AE49', glow: '#F7D286', motif: 'gear-belt' },
  // Application Eggs
  { id: 'app-discord-py', bg1: '#171A30', bg2: '#343C6E', accent: '#7B8DF8', glow: '#F7D06B', motif: 'bot-nodes' },
  { id: 'app-discord-js', bg1: '#151B2E', bg2: '#2C406B', accent: '#62A8F5', glow: '#F4A6C1', motif: 'bot-wave' },
  { id: 'app-postgres', bg1: '#122033', bg2: '#24476E', accent: '#6DB3F2', glow: '#B8DDFB', motif: 'db-vault' },
  { id: 'app-redis', bg1: '#2B141D', bg2: '#662439', accent: '#F26B82', glow: '#F4A6C1', motif: 'cache-rings' },
  { id: 'app-prometheus', bg1: '#291815', bg2: '#633426', accent: '#F27D49', glow: '#F7C199', motif: 'metric-flame' },
  { id: 'app-grafana', bg1: '#241922', bg2: '#573242', accent: '#F29A52', glow: '#F4A6C1', motif: 'panel-bars' },
  { id: 'app-code-server', bg1: '#151924', bg2: '#26344D', accent: '#62B6F5', glow: '#F4A6C1', motif: 'code-panes' },
  { id: 'app-gitea', bg1: '#13241E', bg2: '#254E3E', accent: '#6CE0A0', glow: '#B5F5CF', motif: 'git-branch' },
  { id: 'app-lavalink', bg1: '#23162D', bg2: '#4E2A63', accent: '#E284F2', glow: '#F4A6C1', motif: 'audio-bars' },
  { id: 'app-nginx', bg1: '#12261E', bg2: '#22523E', accent: '#5CD692', glow: '#A9F0C8', motif: 'proxy-hex' },
  // Generic Eggs
  { id: 'gen-nodejs', bg1: '#14241A', bg2: '#295236', accent: '#7BD87A', glow: '#BDF2BC', motif: 'hex-loop' },
  { id: 'gen-python', bg1: '#162233', bg2: '#2B486B', accent: '#62ADEF', glow: '#F2CE6B', motif: 'dual-coil' },
  { id: 'gen-java', bg1: '#281C16', bg2: '#5E3B29', accent: '#F09459', glow: '#86B8F2', motif: 'jvm-steam' },
  { id: 'gen-rust', bg1: '#261A16', bg2: '#593426', accent: '#EB7D49', glow: '#F4C5A6', motif: 'cargo-cog' },
  { id: 'gen-go', bg1: '#12242C', bg2: '#224F61', accent: '#62D6F0', glow: '#B5EEFA', motif: 'goroutine-lanes' },
  { id: 'gen-dotnet', bg1: '#1E1630', bg2: '#472D73', accent: '#B488F5', glow: '#F4A6C1', motif: 'dotnet-grid' },
  { id: 'gen-linux', bg1: '#16161D', bg2: '#2C2B3B', accent: '#F4A6C1', glow: '#F5D28E', motif: 'shell-crest' },
  { id: 'gen-bun', bg1: '#281E24', bg2: '#573D4C', accent: '#F7D9BC', glow: '#F4A6C1', motif: 'fast-bun' },
  // Fallback for unknown eggs
  { id: 'fallback', bg1: '#1B1822', bg2: '#3B2B3F', accent: '#F4A6C1', glow: '#FCE7EF', motif: 'petal-seed' },
];

function buildMotifSvg(spec) {
  const { motif, accent, glow } = spec;
  switch (motif) {
    case 'voxel-meadow':
      return `
        <path d="M120 260 L220 210 L320 260 L220 310 Z" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2"/>
        <path d="M120 260 L220 310 L220 355 L120 305 Z" fill="#1C2E24" stroke="${accent}" stroke-opacity="0.6" stroke-width="1.5"/>
        <path d="M220 310 L320 260 L320 305 L220 355 Z" fill="#13211A" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.5"/>
        <path d="M310 215 L410 165 L510 215 L410 265 Z" fill="${accent}" fill-opacity="0.55" stroke="${accent}" stroke-width="2"/>
        <path d="M310 215 L410 265 L410 315 L310 265 Z" fill="#233C2D" stroke="${accent}" stroke-opacity="0.65" stroke-width="1.5"/>
        <path d="M410 265 L510 215 L510 265 L410 315 Z" fill="#182B20" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.5"/>
        <rect x="398" y="105" width="24" height="65" rx="4" fill="#634039"/>
        <circle cx="410" cy="100" r="34" fill="${glow}" fill-opacity="0.88"/>
        <circle cx="384" cy="112" r="20" fill="${glow}" fill-opacity="0.72"/>
        <circle cx="436" cy="112" r="20" fill="${glow}" fill-opacity="0.72"/>`;
    case 'voxel-scroll':
      return `
        <rect x="200" y="96" width="240" height="170" rx="14" fill="#13221B" stroke="${accent}" stroke-width="2"/>
        <path d="M228 135 H396 M228 165 H360 M228 195 H382 M228 225 H330" stroke="${accent}" stroke-width="6" stroke-linecap="round" stroke-opacity="0.8"/>
        <path d="M402 82 L438 118 L402 154 L366 118 Z" fill="${glow}" fill-opacity="0.9"/>
        <circle cx="170" cy="240" r="26" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2"/>`;
    case 'end-citadel':
      return `
        <rect x="275" y="75" width="90" height="220" rx="4" fill="#23123A" stroke="${accent}" stroke-width="2"/>
        <rect x="195" y="135" width="60" height="160" rx="4" fill="#1B0E2E" stroke="${accent}" stroke-opacity="0.75" stroke-width="1.5"/>
        <rect x="385" y="135" width="60" height="160" rx="4" fill="#1B0E2E" stroke="${accent}" stroke-opacity="0.75" stroke-width="1.5"/>
        <rect x="305" y="110" width="30" height="30" fill="${glow}" rx="3"/>
        <rect x="305" y="160" width="30" height="30" fill="${accent}" fill-opacity="0.7" rx="3"/>
        <circle cx="320" cy="52" r="14" fill="${glow}" fill-opacity="0.9"/>`;
    case 'golden-anvil':
      return `
        <path d="M210 130 H430 L405 182 H355 V225 H415 V262 H225 V225 H285 V182 H235 Z" fill="${accent}" fill-opacity="0.82" stroke="${glow}" stroke-width="2.5"/>
        <circle cx="468" cy="112" r="14" fill="${glow}" fill-opacity="0.85"/>
        <circle cx="176" cy="108" r="10" fill="${accent}" fill-opacity="0.6"/>`;
    case 'loom-blocks':
      return `
        <g stroke="${accent}" stroke-width="2" fill="${accent}" fill-opacity="0.25">
          <rect x="180" y="92" width="84" height="84" rx="10"/>
          <rect x="278" y="92" width="84" height="84" rx="10" fill="${glow}" fill-opacity="0.35"/>
          <rect x="376" y="92" width="84" height="84" rx="10"/>
          <rect x="228" y="190" width="84" height="84" rx="10" fill="${glow}" fill-opacity="0.3"/>
          <rect x="328" y="190" width="84" height="84" rx="10"/>
        </g>`;
    case 'forge-spire':
      return `
        <path d="M165 265 L235 125 L305 265 Z" fill="#233046" stroke="${accent}" stroke-width="2"/>
        <path d="M250 265 L335 88 L420 265 Z" fill="#2B3B56" stroke="${accent}" stroke-width="2.5"/>
        <path d="M365 265 L430 140 L495 265 Z" fill="#233046" stroke="${glow}" stroke-width="2"/>
        <circle cx="335" cy="88" r="14" fill="${accent}"/>`;
    case 'ember-cuboid':
      return `
        <polygon points="320,76 424,136 424,244 320,304 216,244 216,136" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="3"/>
        <polygon points="320,114 390,154 390,226 320,266 250,226 250,154" fill="${glow}" fill-opacity="0.3" stroke="${glow}" stroke-width="2"/>
        <circle cx="320" cy="190" r="24" fill="${accent}"/>`;
    case 'coastal-bastion':
      return `
        <path d="M0 245 Q160 220 320 245 T640 240 V360 H0 Z" fill="${accent}" fill-opacity="0.22"/>
        <rect x="220" y="110" width="200" height="140" rx="12" fill="#182C42" stroke="${accent}" stroke-width="2.5"/>
        <rect x="255" y="145" width="44" height="44" rx="4" fill="${glow}" fill-opacity="0.8"/>
        <rect x="341" y="145" width="44" height="44" rx="4" fill="${accent}" fill-opacity="0.8"/>
        <rect x="298" y="202" width="44" height="48" rx="4" fill="#0E1A29"/>`;
    case 'prism-bridge':
    case 'cascade-gate':
    case 'portal-ring':
      return `
        <circle cx="195" cy="180" r="46" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2.5"/>
        <circle cx="320" cy="180" r="64" fill="${glow}" fill-opacity="0.24" stroke="${glow}" stroke-width="3"/>
        <circle cx="445" cy="180" r="46" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2.5"/>
        <path d="M241 180 H256 M384 180 H399" stroke="${glow}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="320" cy="180" r="22" fill="${glow}"/>`;
    case 'tactical-radar':
      return `
        <circle cx="320" cy="180" r="96" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
        <circle cx="320" cy="180" r="60" fill="none" stroke="${accent}" stroke-opacity="0.7" stroke-width="2"/>
        <circle cx="320" cy="180" r="22" fill="${accent}" fill-opacity="0.25" stroke="${glow}" stroke-width="2.5"/>
        <path d="M320 66 V125 M320 235 V294 M206 180 H265 M375 180 H434" stroke="${glow}" stroke-width="3" stroke-linecap="round"/>`;
    case 'salvage-dome':
      return `
        <path d="M160 272 A160 140 0 0 1 480 272 Z" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2.5"/>
        <path d="M220 272 A100 90 0 0 1 420 272" fill="none" stroke="${glow}" stroke-width="2" stroke-dasharray="10 8"/>
        <rect x="296" y="90" width="48" height="182" rx="6" fill="#2A1615" stroke="${accent}" stroke-width="2"/>
        <circle cx="320" cy="128" r="14" fill="${accent}"/>`;
    case 'obelisk-canopy':
      return `
        <polygon points="320,58 356,280 284,280" fill="#1C3D3B" stroke="${accent}" stroke-width="2.5"/>
        <polygon points="320,96 334,148 320,174 306,148" fill="${glow}"/>
        <path d="M120 285 Q200 220 265 280 M375 280 Q440 215 520 285" stroke="${accent}" stroke-width="3" fill="none"/>`;
    case 'crystal-cavern':
      return `
        <polygon points="220,275 256,120 296,275" fill="${accent}" fill-opacity="0.7"/>
        <polygon points="295,275 338,76 382,275" fill="${glow}" fill-opacity="0.82"/>
        <polygon points="376,275 415,140 452,275" fill="${accent}" fill-opacity="0.6"/>
        <path d="M120 276 H520" stroke="${accent}" stroke-width="2.5"/>`;
    case 'sphere-plateau':
      return `
        <path d="M110 268 Q320 215 530 268 L530 330 H110 Z" fill="${accent}" fill-opacity="0.25"/>
        <circle cx="320" cy="162" r="68" fill="#24224A" stroke="${accent}" stroke-width="3"/>
        <path d="M252 162 H388" stroke="${glow}" stroke-width="4"/>
        <circle cx="320" cy="162" r="20" fill="${glow}" stroke="#24224A" stroke-width="4"/>`;
    case 'runestone-fjord':
      return `
        <path d="M100 250 L220 140 L320 220 L430 130 L540 250 Z" fill="#1E2F34" stroke="${accent}" stroke-opacity="0.5" stroke-width="2"/>
        <rect x="278" y="96" width="84" height="176" rx="34" fill="#22353B" stroke="${accent}" stroke-width="2.5"/>
        <path d="M320 132 V224 M296 158 L320 138 L344 158 M298 192 L342 166" stroke="${glow}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    case 'gear-belt':
      return `
        <circle cx="265" cy="180" r="62" fill="none" stroke="${accent}" stroke-width="14" stroke-dasharray="18 12"/>
        <circle cx="265" cy="180" r="24" fill="${glow}"/>
        <circle cx="395" cy="180" r="46" fill="none" stroke="${glow}" stroke-width="12" stroke-dasharray="14 10"/>
        <circle cx="395" cy="180" r="16" fill="${accent}"/>`;
    case 'bot-nodes':
    case 'bot-wave':
      return `
        <rect x="220" y="106" width="200" height="144" rx="28" fill="#1D2245" stroke="${accent}" stroke-width="3"/>
        <circle cx="278" cy="176" r="18" fill="${glow}"/>
        <circle cx="362" cy="176" r="18" fill="${glow}"/>
        <path d="M320 74 V106 M270 220 H370" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="320" cy="68" r="10" fill="${accent}"/>`;
    case 'db-vault':
      return `
        <ellipse cx="320" cy="112" rx="108" ry="28" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="2.5"/>
        <path d="M212 112 V248 A108 28 0 0 0 428 248 V112" fill="#13253A" fill-opacity="0.8" stroke="${accent}" stroke-width="2.5"/>
        <path d="M212 158 A108 26 0 0 0 428 158 M212 204 A108 26 0 0 0 428 204" fill="none" stroke="${glow}" stroke-width="2"/>`;
    case 'cache-rings':
      return `
        <rect x="225" y="100" width="190" height="46" rx="12" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="2.5"/>
        <rect x="225" y="160" width="190" height="46" rx="12" fill="${glow}" fill-opacity="0.28" stroke="${glow}" stroke-width="2.5"/>
        <rect x="225" y="220" width="190" height="46" rx="12" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="2.5"/>
        <circle cx="256" cy="123" r="7" fill="${glow}"/>
        <circle cx="256" cy="183" r="7" fill="${accent}"/>
        <circle cx="256" cy="243" r="7" fill="${glow}"/>`;
    case 'metric-flame':
    case 'panel-bars':
      return `
        <rect x="175" y="96" width="290" height="174" rx="14" fill="#1C141E" stroke="${accent}" stroke-opacity="0.7" stroke-width="2"/>
        <rect x="210" y="190" width="32" height="54" rx="5" fill="${accent}"/>
        <rect x="260" y="152" width="32" height="92" rx="5" fill="${glow}"/>
        <rect x="310" y="128" width="32" height="116" rx="5" fill="${accent}"/>
        <rect x="360" y="168" width="32" height="76" rx="5" fill="${glow}"/>
        <rect x="410" y="114" width="32" height="130" rx="5" fill="${accent}"/>`;
    case 'code-panes':
      return `
        <rect x="168" y="88" width="304" height="184" rx="12" fill="#131924" stroke="${accent}" stroke-width="2.5"/>
        <circle cx="194" cy="112" r="5" fill="#F2728C"/>
        <circle cx="212" cy="112" r="5" fill="#F2C86B"/>
        <circle cx="230" cy="112" r="5" fill="#6BE09E"/>
        <path d="M240 165 L208 192 L240 218 M400 165 L432 192 L400 218 M332 152 L308 232" stroke="${glow}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'git-branch':
      return `
        <path d="M250 112 V252 M250 198 C250 156 390 176 390 128" stroke="${accent}" stroke-width="7" stroke-linecap="round" fill="none"/>
        <circle cx="250" cy="108" r="18" fill="${glow}"/>
        <circle cx="250" cy="252" r="18" fill="${accent}"/>
        <circle cx="390" cy="124" r="18" fill="${glow}"/>`;
    case 'audio-bars':
      return `
        <g stroke-linecap="round" stroke-width="14">
          <line x1="210" y1="150" x2="210" y2="210" stroke="${accent}"/>
          <line x1="248" y1="114" x2="248" y2="246" stroke="${glow}"/>
          <line x1="286" y1="90" x2="286" y2="270" stroke="${accent}"/>
          <line x1="324" y1="128" x2="324" y2="232" stroke="${glow}"/>
          <line x1="362" y1="98" x2="362" y2="262" stroke="${accent}"/>
          <line x1="400" y1="138" x2="400" y2="222" stroke="${glow}"/>
          <line x1="438" y1="158" x2="438" y2="202" stroke="${accent}"/>
        </g>`;
    case 'proxy-hex':
    case 'hex-loop':
      return `
        <polygon points="320,76 410,128 410,232 320,284 230,232 230,128" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="3.5"/>
        <polygon points="320,122 370,151 370,209 320,238 270,209 270,151" fill="${glow}" fill-opacity="0.32" stroke="${glow}" stroke-width="2.5"/>`;
    case 'dual-coil':
      return `
        <rect x="216" y="106" width="124" height="72" rx="22" fill="${accent}" fill-opacity="0.82"/>
        <rect x="300" y="182" width="124" height="72" rx="22" fill="${glow}" fill-opacity="0.88"/>
        <circle cx="248" cy="134" r="8" fill="#162233"/>
        <circle cx="392" cy="226" r="8" fill="#162233"/>`;
    case 'jvm-steam':
      return `
        <rect x="242" y="150" width="156" height="96" rx="22" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="3"/>
        <path d="M398 172 H422 A18 18 0 0 1 422 214 H398" fill="none" stroke="${accent}" stroke-width="3"/>
        <path d="M286 130 Q274 106 292 84 M322 128 Q310 100 328 76 M358 130 Q346 106 364 84" stroke="${glow}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
    case 'cargo-cog':
      return `
        <circle cx="320" cy="180" r="82" fill="none" stroke="${accent}" stroke-width="18" stroke-dasharray="22 14"/>
        <circle cx="320" cy="180" r="46" fill="#261A16" stroke="${glow}" stroke-width="3"/>
        <path d="M294 180 H346 M320 154 V206" stroke="${glow}" stroke-width="6" stroke-linecap="round"/>`;
    case 'goroutine-lanes':
      return `
        <path d="M165 130 H445 M165 180 H475 M165 230 H410" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="445" cy="130" r="14" fill="${glow}"/>
        <circle cx="475" cy="180" r="14" fill="${glow}"/>
        <circle cx="410" cy="230" r="14" fill="${glow}"/>`;
    case 'dotnet-grid':
      return `
        <g fill="${accent}" fill-opacity="0.3" stroke="${glow}" stroke-width="2.5">
          <circle cx="248" cy="145" r="32"/>
          <circle cx="320" cy="145" r="32" fill="${glow}" fill-opacity="0.45"/>
          <circle cx="392" cy="145" r="32"/>
          <circle cx="284" cy="215" r="32"/>
          <circle cx="356" cy="215" r="32"/>
        </g>`;
    case 'shell-crest':
      return `
        <rect x="175" y="96" width="290" height="174" rx="14" fill="#121218" stroke="${accent}" stroke-width="2.5"/>
        <path d="M214 148 L254 180 L214 212" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <line x1="274" y1="212" x2="342" y2="212" stroke="${glow}" stroke-width="7" stroke-linecap="round"/>`;
    case 'fast-bun':
      return `
        <ellipse cx="320" cy="192" rx="112" ry="72" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="3"/>
        <ellipse cx="320" cy="176" rx="96" ry="54" fill="${glow}" fill-opacity="0.32" stroke="${glow}" stroke-width="2"/>
        <path d="M334 114 L298 180 H332 L308 242 L358 168 H324 Z" fill="${glow}"/>`;
    case 'petal-seed':
    default:
      return `
        <path d="M320 92 C360 132 384 172 384 208 C384 244 355 270 320 270 C285 270 256 244 256 208 C256 172 280 132 320 92 Z" fill="${accent}" fill-opacity="0.32" stroke="${accent}" stroke-width="3"/>
        <circle cx="320" cy="206" r="24" fill="${glow}"/>`;
  }
}

function renderEggSvg(spec) {
  const safeId = spec.id.replace(/[^a-z0-9-]/gi, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <linearGradient id="bg-${safeId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${spec.bg1}"/>
      <stop offset="100%" stop-color="${spec.bg2}"/>
    </linearGradient>
    <radialGradient id="glow-${safeId}" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${spec.glow}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${spec.bg1}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid-${safeId}" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="640" height="360" fill="url(#bg-${safeId})"/>
  <rect width="640" height="360" fill="url(#grid-${safeId})"/>
  <rect width="640" height="360" fill="url(#glow-${safeId})"/>
  ${buildMotifSvg(spec)}
</svg>
`;
}

// Pure-Node PNG encoder for Petalnodes PWA app icons (192x192, 512x512, 180x180, maskable)
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function encodeRgbaPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function blendPixel(buf, idx, r, g, b, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  buf[idx] = Math.round(buf[idx] * (1 - a) + r * a);
  buf[idx + 1] = Math.round(buf[idx + 1] * (1 - a) + g * a);
  buf[idx + 2] = Math.round(buf[idx + 2] * (1 - a) + b * a);
  buf[idx + 3] = 255;
}

function generatePetalnodesIconPng(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.16 : size * 0.08;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = (size - pad * 2) * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Soft charcoal-berry gradient canvas for crisp light/dark launcher visibility
      const t = (x + y) / (size * 2);
      rgba[idx] = Math.round(252 - t * 8);     // #FCE7EF -> #F4D8E4
      rgba[idx + 1] = Math.round(231 - t * 14);
      rgba[idx + 2] = Math.round(239 - t * 8);
      rgba[idx + 3] = 255;

      // Outer rounded card badge if non-maskable, full bleed if maskable
      const dx = (x - cx) / innerRadius;
      const dy = (y - cy) / innerRadius;
      const dist = Math.hypot(dx, dy);

      // 5-petal blossom silhouette using polar distance
      const angle = Math.atan2(dy, dx);
      const petalRadius = 0.72 + 0.24 * Math.cos(angle * 5 - Math.PI / 2);
      if (dist <= petalRadius) {
        const edge = Math.min(1, (petalRadius - dist) * 14);
        blendPixel(rgba, idx, 244, 166, 193, edge); // #F4A6C1
      }
      // Blossom core stamen
      if (dist <= 0.28) {
        const coreEdge = Math.min(1, (0.28 - dist) * 18);
        blendPixel(rgba, idx, 142, 46, 82, coreEdge); // #8E2E52
      }
    }
  }
  return encodeRgbaPng(size, size, rgba);
}

function main() {
  ensureDir(EGGS_ASSET_DIR);
  ensureDir(PUBLIC_DIR);

  for (const spec of EGG_VISUAL_SPECS) {
    const outPath = path.join(EGGS_ASSET_DIR, `${spec.id}.svg`);
    fs.writeFileSync(outPath, renderEggSvg(spec), 'utf8');
  }

  // Generate public/icon.svg and PNG PWA icons
  const brandSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#FCE7EF"/>
  <g transform="translate(32 32)">
    <path d="M0-22 C7-14 11-7 11-1 C11 5 6 10 0 10 C-6 10 -11 5 -11-1 C-11-7 -7-14 0-22 Z" fill="#F4A6C1" stroke="#8E2E52" stroke-width="2"/>
    <path d="M21-7 C14 2 8 7 1 7 C-5 7 -10 2 -10-4 C-10-10 -5-15 1-15 C7-15 14-12 21-7 Z" fill="#F4A6C1" fill-opacity="0.85" stroke="#8E2E52" stroke-width="2"/>
    <path d="M-21-7 C-14 2 -8 7 -1 7 C5 7 10 2 10-4 C10-10 5-15 -1-15 C-7-15 -14-12 -21-7 Z" fill="#F4A6C1" fill-opacity="0.85" stroke="#8E2E52" stroke-width="2"/>
    <circle cx="0" cy="-1" r="4.5" fill="#8E2E52"/>
  </g>
</svg>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), brandSvg, 'utf8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-192x192.png'), generatePetalnodesIconPng(192, false));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-512x512.png'), generatePetalnodesIconPng(512, false));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'), generatePetalnodesIconPng(512, true));
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), generatePetalnodesIconPng(180, false));

  console.log(`Generated ${EGG_VISUAL_SPECS.length} unique Egg SVGs and 5 PWA icons cleanly.`);
}

main();
