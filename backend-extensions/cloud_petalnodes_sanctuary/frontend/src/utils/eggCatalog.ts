export type EggRepositorySlug =
  | 'pterodactyl/game-eggs'
  | 'pterodactyl/application-eggs'
  | 'pterodactyl/generic-eggs';

export type EggCategoryGroup = 'Game Eggs' | 'Application Eggs' | 'Generic Eggs';

export type EggArtId =
  | 'mc-vanilla'
  | 'mc-paper'
  | 'mc-purpur'
  | 'mc-spigot'
  | 'mc-fabric'
  | 'mc-forge'
  | 'mc-neoforge'
  | 'mc-bedrock'
  | 'mc-velocity'
  | 'mc-waterfall'
  | 'mc-bungeecord'
  | 'game-cs2'
  | 'game-rust'
  | 'game-ark'
  | 'game-terraria'
  | 'game-palworld'
  | 'game-valheim'
  | 'game-factorio'
  | 'app-discord-py'
  | 'app-discord-js'
  | 'app-postgres'
  | 'app-redis'
  | 'app-prometheus'
  | 'app-grafana'
  | 'app-code-server'
  | 'app-gitea'
  | 'app-lavalink'
  | 'app-nginx'
  | 'gen-nodejs'
  | 'gen-python'
  | 'gen-java'
  | 'gen-rust'
  | 'gen-go'
  | 'gen-dotnet'
  | 'gen-linux'
  | 'gen-bun'
  | 'fallback';

export interface ConfiguredEggRepository {
  slug: EggRepositorySlug;
  name: string;
  url: string;
  category: EggCategoryGroup;
  description: string;
}

/**
 * The three Pterodactyl Egg repositories are already configured inside Calagopus.
 * Never duplicate, modify, or re-register them from theme code.
 */
export const CONFIGURED_EGG_REPOSITORIES: readonly ConfiguredEggRepository[] = [
  {
    slug: 'pterodactyl/game-eggs',
    name: 'Game Eggs',
    url: 'https://github.com/pterodactyl/game-eggs',
    category: 'Game Eggs',
    description: 'Dedicated game server Eggs synced from the existing Calagopus repository.',
  },
  {
    slug: 'pterodactyl/application-eggs',
    name: 'Application Eggs',
    url: 'https://github.com/pterodactyl/application-eggs',
    category: 'Application Eggs',
    description: 'Bots, databases, monitoring stacks, and self-hosted tools.',
  },
  {
    slug: 'pterodactyl/generic-eggs',
    name: 'Generic Eggs',
    url: 'https://github.com/pterodactyl/generic-eggs',
    category: 'Generic Eggs',
    description: 'Language runtimes and general-purpose Linux containers.',
  },
];

export interface CalagopusEggEntry {
  id: EggArtId;
  name: string;
  shortTag: string;
  category: EggCategoryGroup;
  subcategory: string;
  repository: EggRepositorySlug;
  description: string;
  runtimeLabel: string;
  dockerImages: readonly string[];
  startupCommand: string;
  variableCount: number;
  imported: boolean;
}

export const CALAGOPUS_EGG_CATALOG: readonly CalagopusEggEntry[] = [
  // === Game Eggs (pterodactyl/game-eggs) ===
  {
    id: 'mc-vanilla',
    name: 'Minecraft Vanilla',
    shortTag: 'Minecraft Java',
    category: 'Game Eggs',
    subcategory: 'Minecraft',
    repository: 'pterodactyl/game-eggs',
    description: 'Official Mojang Java Edition survival server with zero third-party modifications.',
    runtimeLabel: 'Java 21 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}} nogui',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'mc-paper',
    name: 'Paper',
    shortTag: 'Minecraft Java',
    category: 'Game Eggs',
    subcategory: 'Minecraft',
    repository: 'pterodactyl/game-eggs',
    description: 'High-performance Minecraft Java server compatible with Bukkit, Spigot, and Paper plugins.',
    runtimeLabel: 'Java 21 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -jar {{SERVER_JARFILE}}',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'mc-purpur',
    name: 'Purpur',
    shortTag: 'Minecraft Java',
    category: 'Game Eggs',
    subcategory: 'Minecraft',
    repository: 'pterodactyl/game-eggs',
    description: 'Drop-in fork of Paper offering extra gameplay configurability and entity optimizations.',
    runtimeLabel: 'Java 21 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}} nogui',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'mc-spigot',
    name: 'Spigot',
    shortTag: 'Minecraft Java',
    category: 'Game Eggs',
    subcategory: 'Minecraft',
    repository: 'pterodactyl/game-eggs',
    description: 'Classic BuildTools-compiled Minecraft Java plugin server.',
    runtimeLabel: 'Java 21 / 17',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'mc-fabric',
    name: 'Fabric',
    shortTag: 'Modded Minecraft',
    category: 'Game Eggs',
    subcategory: 'Minecraft Modded',
    repository: 'pterodactyl/game-eggs',
    description: 'Lightweight modular toolchain for modern Minecraft modding.',
    runtimeLabel: 'Java 21 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar fabric-server-launch.jar nogui',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'mc-forge',
    name: 'Minecraft Forge',
    shortTag: 'Modded Minecraft',
    category: 'Game Eggs',
    subcategory: 'Minecraft Modded',
    repository: 'pterodactyl/game-eggs',
    description: 'Community modpack and Forge mod loader runtime environment.',
    runtimeLabel: 'Java 21 / 17 / 8',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17', 'ghcr.io/pterodactyl/yolks:java_8'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 @libraries/net/minecraftforge/forge/{{FORGE_VERSION}}/unix_args.txt nogui',
    variableCount: 5,
    imported: true,
  },
  {
    id: 'mc-neoforge',
    name: 'NeoForge',
    shortTag: 'Modded Minecraft',
    category: 'Game Eggs',
    subcategory: 'Minecraft Modded',
    repository: 'pterodactyl/game-eggs',
    description: 'Next-generation Forge-compatible mod loader for Minecraft 1.20+.',
    runtimeLabel: 'Java 21 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 @user_jvm_args.txt @libraries/net/neoforged/neoforge/{{NEOFORGE_VERSION}}/unix_args.txt nogui',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'mc-bedrock',
    name: 'Minecraft Bedrock',
    shortTag: 'Bedrock Edition',
    category: 'Game Eggs',
    subcategory: 'Minecraft',
    repository: 'pterodactyl/game-eggs',
    description: 'Dedicated Bedrock server supporting Xbox, PlayStation, Switch, mobile, and Windows clients.',
    runtimeLabel: 'Ubuntu / glibc',
    dockerImages: ['ghcr.io/pterodactyl/games:source', 'ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: './bedrock_server',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'mc-velocity',
    name: 'Velocity',
    shortTag: 'Minecraft Proxy',
    category: 'Game Eggs',
    subcategory: 'Minecraft Proxy',
    repository: 'pterodactyl/game-eggs',
    description: 'Modern, low-latency PaperMC network proxy forwarding players across backend instances.',
    runtimeLabel: 'Java 21 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21'],
    startupCommand: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'mc-waterfall',
    name: 'Waterfall',
    shortTag: 'Minecraft Proxy',
    category: 'Game Eggs',
    subcategory: 'Minecraft Proxy',
    repository: 'pterodactyl/game-eggs',
    description: 'BungeeCord-API compatible Minecraft proxy maintained by the PaperMC project.',
    runtimeLabel: 'Java 21 / 17',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startupCommand: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'mc-bungeecord',
    name: 'BungeeCord',
    shortTag: 'Minecraft Proxy',
    category: 'Game Eggs',
    subcategory: 'Minecraft Proxy',
    repository: 'pterodactyl/game-eggs',
    description: 'SpigotMC proxy tier linking multi-server Minecraft portals.',
    runtimeLabel: 'Java 21 / 17',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startupCommand: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
    variableCount: 2,
    imported: true,
  },
  {
    id: 'game-cs2',
    name: 'Counter-Strike 2',
    shortTag: 'Tactical FPS',
    category: 'Game Eggs',
    subcategory: 'SteamCMD FPS',
    repository: 'pterodactyl/game-eggs',
    description: 'Source 2 dedicated Counter-Strike 2 server provisioned via SteamCMD.',
    runtimeLabel: 'SteamCMD · Linux x64',
    dockerImages: ['ghcr.io/pterodactyl/games:source'],
    startupCommand: './game/bin/linuxsteamrt64/cs2 -dedicated +ip 0.0.0.0 -port {{SERVER_PORT}} +map {{SRCDS_MAP}} -maxplayers {{MAX_PLAYERS}}',
    variableCount: 6,
    imported: true,
  },
  {
    id: 'game-rust',
    name: 'Rust Dedicated Server',
    shortTag: 'Multiplayer Survival',
    category: 'Game Eggs',
    subcategory: 'SteamCMD Survival',
    repository: 'pterodactyl/game-eggs',
    description: 'Open-world Rust dedicated server with Oxide/uMod and Carbon modding framework support.',
    runtimeLabel: 'SteamCMD · Mono',
    dockerImages: ['ghcr.io/pterodactyl/games:rust'],
    startupCommand: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.identity "rust" +rcon.port {{RCON_PORT}} +server.worldsize {{WORLD_SIZE}}',
    variableCount: 11,
    imported: true,
  },
  {
    id: 'game-ark',
    name: 'ARK: Survival Evolved',
    shortTag: 'Prehistoric Survival',
    category: 'Game Eggs',
    subcategory: 'SteamCMD Survival',
    repository: 'pterodactyl/game-eggs',
    description: 'ShooterGame dedicated survival cluster world with RCON and map rotation support.',
    runtimeLabel: 'SteamCMD · Linux x64',
    dockerImages: ['ghcr.io/pterodactyl/games:source'],
    startupCommand: './ShooterGame/Binaries/Linux/ShooterGameServer {{SERVER_MAP}}?listen?Port={{SERVER_PORT}}?RCONEnabled=True?RCONPort={{RCON_PORT}} -server -log',
    variableCount: 7,
    imported: true,
  },
  {
    id: 'game-terraria',
    name: 'Terraria (tShock)',
    shortTag: '2D Sandbox',
    category: 'Game Eggs',
    subcategory: 'Sandbox',
    repository: 'pterodactyl/game-eggs',
    description: 'Dedicated Terraria sandbox adventure server powered by tShock permission & plugin API.',
    runtimeLabel: '.NET 6.0 / Mono',
    dockerImages: ['ghcr.io/pterodactyl/yolks:dotnet_6'],
    startupCommand: './TShock.Server -port {{SERVER_PORT}} -maxplayers {{MAX_PLAYERS}} -worldpath /home/container/worlds',
    variableCount: 5,
    imported: true,
  },
  {
    id: 'game-palworld',
    name: 'Palworld',
    shortTag: 'Creature Survival',
    category: 'Game Eggs',
    subcategory: 'SteamCMD Survival',
    repository: 'pterodactyl/game-eggs',
    description: 'Dedicated Unreal Engine Palworld server supporting co-op squads and community worlds.',
    runtimeLabel: 'SteamCMD · Linux x64',
    dockerImages: ['ghcr.io/pterodactyl/games:source'],
    startupCommand: './PalServer.sh -port={{SERVER_PORT}} -players={{MAX_PLAYERS}} -useperfthreads -NoAsyncLoadingThread',
    variableCount: 6,
    imported: true,
  },
  {
    id: 'game-valheim',
    name: 'Valheim',
    shortTag: 'Norse Co-op Survival',
    category: 'Game Eggs',
    subcategory: 'SteamCMD Survival',
    repository: 'pterodactyl/game-eggs',
    description: 'Brutal exploration and Viking survival dedicated world with crossplay & BepInEx flags.',
    runtimeLabel: 'SteamCMD · Linux x64',
    dockerImages: ['ghcr.io/pterodactyl/games:valheim'],
    startupCommand: './valheim_server.x86_64 -name "{{SERVER_NAME}}" -port {{SERVER_PORT}} -world "{{WORLD}}" -password "{{PASSWORD}}"',
    variableCount: 6,
    imported: true,
  },
  {
    id: 'game-factorio',
    name: 'Factorio',
    shortTag: 'Factory Automation',
    category: 'Game Eggs',
    subcategory: 'Simulation',
    repository: 'pterodactyl/game-eggs',
    description: 'Headless multiplayer Factorio simulation instance with save-slot management and RCON.',
    runtimeLabel: 'Headless Linux x64',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: './bin/x64/factorio --port {{SERVER_PORT}} --server-settings data/server-settings.json --start-server {{SAVE_NAME}}.zip',
    variableCount: 5,
    imported: false,
  },

  // === Application Eggs (pterodactyl/application-eggs) ===
  {
    id: 'app-discord-py',
    name: 'Discord.py Bot',
    shortTag: 'Bot Runtime',
    category: 'Application Eggs',
    subcategory: 'Discord Bots',
    repository: 'pterodactyl/application-eggs',
    description: 'Async Python Discord bot worker with pip requirements sync and Git auto-pull support.',
    runtimeLabel: 'Python 3.12',
    dockerImages: ['ghcr.io/pterodactyl/yolks:python_3.12', 'ghcr.io/pterodactyl/yolks:python_3.11'],
    startupCommand: 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; python3 {{PY_FILE}}',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'app-discord-js',
    name: 'Discord.js Bot',
    shortTag: 'Bot Runtime',
    category: 'Application Eggs',
    subcategory: 'Discord Bots',
    repository: 'pterodactyl/application-eggs',
    description: 'Node.js Discord bot container optimized for slash commands and clustered shards.',
    runtimeLabel: 'Node.js 20 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:nodejs_20', 'ghcr.io/pterodactyl/yolks:nodejs_18'],
    startupCommand: 'if [[ -f package.json ]]; then npm install; fi; node {{BOT_JS_FILE}}',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'app-postgres',
    name: 'PostgreSQL',
    shortTag: 'Relational Database',
    category: 'Application Eggs',
    subcategory: 'Databases',
    repository: 'pterodactyl/application-eggs',
    description: 'Dedicated PostgreSQL database container for panel workloads and game plugin persistence.',
    runtimeLabel: 'PostgreSQL 16',
    dockerImages: ['ghcr.io/pterodactyl/apps:postgres_16', 'ghcr.io/pterodactyl/apps:postgres_15'],
    startupCommand: 'postgres -D /home/container/postgres_db -p {{SERVER_PORT}}',
    variableCount: 4,
    imported: true,
  },
  {
    id: 'app-redis',
    name: 'Redis / Valkey',
    shortTag: 'In-Memory Cache',
    category: 'Application Eggs',
    subcategory: 'Caching',
    repository: 'pterodactyl/application-eggs',
    description: 'High-throughput Redis-compatible key-value store for session caching and proxy state.',
    runtimeLabel: 'Redis 7 / Valkey 8',
    dockerImages: ['ghcr.io/pterodactyl/apps:redis_7', 'ghcr.io/pterodactyl/apps:redis_6'],
    startupCommand: 'redis-server /home/container/redis.conf --port {{SERVER_PORT}} --requirepass {{SERVER_PASSWORD}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'app-prometheus',
    name: 'Prometheus',
    shortTag: 'Metrics Scraper',
    category: 'Application Eggs',
    subcategory: 'Monitoring',
    repository: 'pterodactyl/application-eggs',
    description: 'Time-series monitoring database scraping Wings nodes, containers, and exporter targets.',
    runtimeLabel: 'Prometheus v2',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: './prometheus --config.file=prometheus.yml --web.listen-address=0.0.0.0:{{SERVER_PORT}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'app-grafana',
    name: 'Grafana',
    shortTag: 'Observability UI',
    category: 'Application Eggs',
    subcategory: 'Monitoring',
    repository: 'pterodactyl/application-eggs',
    description: 'Interactive telemetry dashboards paired with Prometheus and PostgreSQL data sources.',
    runtimeLabel: 'Grafana 11',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: './bin/grafana server --homepath=/home/container --config=/home/container/conf/custom.ini',
    variableCount: 4,
    imported: false,
  },
  {
    id: 'app-code-server',
    name: 'Code Server',
    shortTag: 'Browser IDE',
    category: 'Application Eggs',
    subcategory: 'Developer Tools',
    repository: 'pterodactyl/application-eggs',
    description: 'Remote VS Code development workspace running directly inside a container allocation.',
    runtimeLabel: 'Node.js · Linux x64',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: './bin/code-server --bind-addr 0.0.0.0:{{SERVER_PORT}} --auth password',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'app-gitea',
    name: 'Gitea',
    shortTag: 'Git Forge',
    category: 'Application Eggs',
    subcategory: 'Developer Tools',
    repository: 'pterodactyl/application-eggs',
    description: 'Lightweight self-hosted Git repositories, pull requests, and CI package registry.',
    runtimeLabel: 'Go Static Binary',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: './gitea web --port {{SERVER_PORT}} --config /home/container/app.ini',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'app-lavalink',
    name: 'Lavalink',
    shortTag: 'Audio Streaming Node',
    category: 'Application Eggs',
    subcategory: 'Media',
    repository: 'pterodactyl/application-eggs',
    description: 'Standalone Java audio sending node designed to offload voice processing for bots.',
    runtimeLabel: 'Java 17 / 21',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_17', 'ghcr.io/pterodactyl/yolks:java_21'],
    startupCommand: 'java -Xmx{{SERVER_MEMORY}}M -jar Lavalink.jar',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'app-nginx',
    name: 'Nginx Web Server',
    shortTag: 'HTTP / Reverse Proxy',
    category: 'Application Eggs',
    subcategory: 'Web Infrastructure',
    repository: 'pterodactyl/application-eggs',
    description: 'Static web hosting and HTTP reverse-proxy container with modular site blocks.',
    runtimeLabel: 'Nginx 1.26',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian'],
    startupCommand: 'nginx -c /home/container/nginx/nginx.conf -p /home/container',
    variableCount: 2,
    imported: false,
  },

  // === Generic Eggs (pterodactyl/generic-eggs) ===
  {
    id: 'gen-nodejs',
    name: 'Node.js Generic',
    shortTag: 'JavaScript Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'General-purpose Node.js LTS runtime for APIs, workers, and TypeScript services.',
    runtimeLabel: 'Node.js 22 / 20',
    dockerImages: ['ghcr.io/pterodactyl/yolks:nodejs_22', 'ghcr.io/pterodactyl/yolks:nodejs_20'],
    startupCommand: 'node {{MAIN_FILE}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'gen-python',
    name: 'Python Generic',
    shortTag: 'Python Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'Clean Python environment with virtualenvs and requirements.txt auto-installation.',
    runtimeLabel: 'Python 3.12 / 3.11',
    dockerImages: ['ghcr.io/pterodactyl/yolks:python_3.12', 'ghcr.io/pterodactyl/yolks:python_3.11'],
    startupCommand: 'python3 {{PY_FILE}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'gen-java',
    name: 'Java Generic (Temurin)',
    shortTag: 'JVM Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'General Eclipse Temurin OpenJDK container for custom JARs and backend microservices.',
    runtimeLabel: 'Temurin 21 / 17',
    dockerImages: ['ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17'],
    startupCommand: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{JARFILE}}',
    variableCount: 2,
    imported: true,
  },
  {
    id: 'gen-rust',
    name: 'Rust Generic (Cargo)',
    shortTag: 'Systems Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'Rust toolchain & compiled binary runner built for native Axum or Tonic workloads.',
    runtimeLabel: 'Rust Stable · Cargo',
    dockerImages: ['ghcr.io/pterodactyl/yolks:rust_latest'],
    startupCommand: './target/release/{{BINARY_NAME}}',
    variableCount: 3,
    imported: true,
  },
  {
    id: 'gen-go',
    name: 'Go (Golang) Generic',
    shortTag: 'Compiled Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'Go runtime building or launching single-binary web APIs and networking services.',
    runtimeLabel: 'Go 1.23',
    dockerImages: ['ghcr.io/pterodactyl/yolks:golang_1.23'],
    startupCommand: 'go run {{GO_PACKAGE}}',
    variableCount: 2,
    imported: true,
  },
  {
    id: 'gen-dotnet',
    name: '.NET Generic',
    shortTag: 'CLR Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'Cross-platform .NET 8 ASP.NET and game utility runtime container.',
    runtimeLabel: '.NET 8.0 LTS',
    dockerImages: ['ghcr.io/pterodactyl/yolks:dotnet_8', 'ghcr.io/pterodactyl/yolks:dotnet_7'],
    startupCommand: 'dotnet {{DOTNET_BINARY}}',
    variableCount: 2,
    imported: true,
  },
  {
    id: 'gen-linux',
    name: 'Linux (Alpine / Ubuntu)',
    shortTag: 'Base Shell Container',
    category: 'Generic Eggs',
    subcategory: 'Operating Systems',
    repository: 'pterodactyl/generic-eggs',
    description: 'Minimal Debian, Ubuntu, or Alpine shell environment for custom startup entrypoints.',
    runtimeLabel: 'Debian / Alpine',
    dockerImages: ['ghcr.io/pterodactyl/yolks:debian', 'ghcr.io/pterodactyl/yolks:alpine'],
    startupCommand: 'bash {{STARTUP_SCRIPT}}',
    variableCount: 2,
    imported: true,
  },
  {
    id: 'gen-bun',
    name: 'Bun Runtime',
    shortTag: 'Fast JS/TS Runtime',
    category: 'Generic Eggs',
    subcategory: 'Language Runtimes',
    repository: 'pterodactyl/generic-eggs',
    description: 'All-in-one Bun TypeScript runtime, bundler, and high-speed HTTP server.',
    runtimeLabel: 'Bun 1.1+',
    dockerImages: ['ghcr.io/pterodactyl/yolks:bun_latest'],
    startupCommand: 'bun run {{MAIN_FILE}}',
    variableCount: 2,
    imported: false,
  },
];

const EXACT_ID_SET = new Set<string>(CALAGOPUS_EGG_CATALOG.map((e) => e.id));

/**
 * Deterministically maps any Egg (live Calagopus API record or catalog entry) to a unique
 * domain-authentic artwork ID. Strictly separates Minecraft Eggs from unrelated games/apps.
 */
export function resolveEggArtworkId(egg: {
  id?: string;
  name?: string;
  category?: string;
  repository?: string;
}): EggArtId {
  if (egg.id && EXACT_ID_SET.has(egg.id) && egg.id !== 'fallback') {
    return egg.id as EggArtId;
  }

  const hay = `${egg.id ?? ''} ${egg.name ?? ''} ${egg.category ?? ''} ${egg.repository ?? ''}`.toLowerCase();

  // Generic language runtimes first when explicitly generic or runtime-tagged
  if (hay.includes('discord.py') || (hay.includes('discord') && hay.includes('python'))) return 'app-discord-py';
  if (hay.includes('discord.js') || (hay.includes('discord') && (hay.includes('node') || hay.includes('js')))) return 'app-discord-js';
  if (hay.includes('postgres')) return 'app-postgres';
  if (hay.includes('redis') || hay.includes('valkey')) return 'app-redis';
  if (hay.includes('prometheus')) return 'app-prometheus';
  if (hay.includes('grafana')) return 'app-grafana';
  if (hay.includes('code-server') || hay.includes('code server')) return 'app-code-server';
  if (hay.includes('gitea')) return 'app-gitea';
  if (hay.includes('lavalink')) return 'app-lavalink';
  if (hay.includes('nginx')) return 'app-nginx';

  if (hay.includes('neoforge')) return 'mc-neoforge';
  if (hay.includes('forge')) return 'mc-forge';
  if (hay.includes('fabric')) return 'mc-fabric';
  if (hay.includes('purpur')) return 'mc-purpur';
  if (hay.includes('paper')) return 'mc-paper';
  if (hay.includes('spigot') || hay.includes('bukkit')) return 'mc-spigot';
  if (hay.includes('bedrock') || hay.includes('pocketmine')) return 'mc-bedrock';
  if (hay.includes('velocity')) return 'mc-velocity';
  if (hay.includes('waterfall')) return 'mc-waterfall';
  if (hay.includes('bungee')) return 'mc-bungeecord';
  if (hay.includes('minecraft') || hay.includes('vanilla')) return 'mc-vanilla';

  if (hay.includes('counter-strike') || hay.includes('cs2') || hay.includes('cs:go')) return 'game-cs2';
  if (hay.includes('ark:') || hay.includes('survival evolved')) return 'game-ark';
  if (hay.includes('terraria') || hay.includes('tshock')) return 'game-terraria';
  if (hay.includes('palworld')) return 'game-palworld';
  if (hay.includes('valheim')) return 'game-valheim';
  if (hay.includes('factorio')) return 'game-factorio';
  if (hay.includes('rust')) {
    return hay.includes('generic') || hay.includes('cargo') ? 'gen-rust' : 'game-rust';
  }

  if (hay.includes('node.js') || hay.includes('nodejs')) return 'gen-nodejs';
  if (hay.includes('python')) return 'gen-python';
  if (hay.includes('java') || hay.includes('temurin')) return 'gen-java';
  if (hay.includes('golang') || /\bgo\b/.test(hay)) return 'gen-go';
  if (hay.includes('.net') || hay.includes('dotnet')) return 'gen-dotnet';
  if (hay.includes('linux') || hay.includes('alpine') || hay.includes('ubuntu')) return 'gen-linux';
  if (hay.includes('bun')) return 'gen-bun';

  return 'fallback';
}

export type EggSortKey = 'name-asc' | 'name-desc' | 'category';

export function filterAndSortEggs(
  eggs: readonly CalagopusEggEntry[],
  options: {
    query: string;
    category: 'all' | EggCategoryGroup;
    repository: 'all' | EggRepositorySlug;
    sortBy: EggSortKey;
  },
): CalagopusEggEntry[] {
  const q = options.query.trim().toLowerCase();
  const filtered = eggs.filter((egg) => {
    if (options.category !== 'all' && egg.category !== options.category) return false;
    if (options.repository !== 'all' && egg.repository !== options.repository) return false;
    if (!q) return true;
    return (
      egg.name.toLowerCase().includes(q) ||
      egg.shortTag.toLowerCase().includes(q) ||
      egg.subcategory.toLowerCase().includes(q) ||
      egg.description.toLowerCase().includes(q) ||
      egg.runtimeLabel.toLowerCase().includes(q) ||
      egg.repository.toLowerCase().includes(q)
    );
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'name-desc') {
      return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
    }
    if (options.sortBy === 'category') {
      const catCmp = a.category.localeCompare(b.category);
      if (catCmp !== 0) return catCmp;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export interface EggArtworkMappingEntry {
  eggId: string;
  eggName: string;
  repository: EggRepositorySlug;
  category: EggCategoryGroup;
  artworkId: EggArtId;
  assetFile: string;
  usedFallback: boolean;
}

export interface EggArtworkCoverageReport {
  totalEggs: number;
  uniqueArtworkCount: number;
  fallbackCount: number;
  duplicateArtworkIds: EggArtId[];
  entries: EggArtworkMappingEntry[];
}

export function generateEggArtworkCoverageReport(
  eggs: readonly CalagopusEggEntry[] = CALAGOPUS_EGG_CATALOG,
): EggArtworkCoverageReport {
  const seenCounts = new Map<EggArtId, number>();
  const entries: EggArtworkMappingEntry[] = eggs.map((egg) => {
    const artworkId = resolveEggArtworkId(egg);
    seenCounts.set(artworkId, (seenCounts.get(artworkId) ?? 0) + 1);
    return {
      eggId: egg.id,
      eggName: egg.name,
      repository: egg.repository,
      category: egg.category,
      artworkId,
      assetFile: `assets/eggs/${artworkId}.svg`,
      usedFallback: artworkId === 'fallback',
    };
  });

  const duplicateArtworkIds = Array.from(seenCounts.entries())
    .filter(([id, count]) => id !== 'fallback' && count > 1)
    .map(([id]) => id);

  return {
    totalEggs: eggs.length,
    uniqueArtworkCount: seenCounts.size,
    fallbackCount: entries.filter((e) => e.usedFallback).length,
    duplicateArtworkIds,
    entries,
  };
}
