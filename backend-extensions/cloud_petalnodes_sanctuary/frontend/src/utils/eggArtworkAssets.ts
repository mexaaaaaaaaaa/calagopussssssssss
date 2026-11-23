import type { EggArtId } from './eggCatalog';

import mcVanillaArt from '../assets/eggs/mc-vanilla.svg';
import mcPaperArt from '../assets/eggs/mc-paper.svg';
import mcPurpurArt from '../assets/eggs/mc-purpur.svg';
import mcSpigotArt from '../assets/eggs/mc-spigot.svg';
import mcFabricArt from '../assets/eggs/mc-fabric.svg';
import mcForgeArt from '../assets/eggs/mc-forge.svg';
import mcNeoforgeArt from '../assets/eggs/mc-neoforge.svg';
import mcBedrockArt from '../assets/eggs/mc-bedrock.svg';
import mcVelocityArt from '../assets/eggs/mc-velocity.svg';
import mcWaterfallArt from '../assets/eggs/mc-waterfall.svg';
import mcBungeecordArt from '../assets/eggs/mc-bungeecord.svg';

import gameCs2Art from '../assets/eggs/game-cs2.svg';
import gameRustArt from '../assets/eggs/game-rust.svg';
import gameArkArt from '../assets/eggs/game-ark.svg';
import gameTerrariaArt from '../assets/eggs/game-terraria.svg';
import gamePalworldArt from '../assets/eggs/game-palworld.svg';
import gameValheimArt from '../assets/eggs/game-valheim.svg';
import gameFactorioArt from '../assets/eggs/game-factorio.svg';

import appDiscordPyArt from '../assets/eggs/app-discord-py.svg';
import appDiscordJsArt from '../assets/eggs/app-discord-js.svg';
import appPostgresArt from '../assets/eggs/app-postgres.svg';
import appRedisArt from '../assets/eggs/app-redis.svg';
import appPrometheusArt from '../assets/eggs/app-prometheus.svg';
import appGrafanaArt from '../assets/eggs/app-grafana.svg';
import appCodeServerArt from '../assets/eggs/app-code-server.svg';
import appGiteaArt from '../assets/eggs/app-gitea.svg';
import appLavalinkArt from '../assets/eggs/app-lavalink.svg';
import appNginxArt from '../assets/eggs/app-nginx.svg';

import genNodejsArt from '../assets/eggs/gen-nodejs.svg';
import genPythonArt from '../assets/eggs/gen-python.svg';
import genJavaArt from '../assets/eggs/gen-java.svg';
import genRustArt from '../assets/eggs/gen-rust.svg';
import genGoArt from '../assets/eggs/gen-go.svg';
import genDotnetArt from '../assets/eggs/gen-dotnet.svg';
import genLinuxArt from '../assets/eggs/gen-linux.svg';
import genBunArt from '../assets/eggs/gen-bun.svg';

import fallbackArt from '../assets/eggs/fallback.svg';

export const EGG_ARTWORK_ASSETS: Record<EggArtId, string> = {
  'mc-vanilla': mcVanillaArt,
  'mc-paper': mcPaperArt,
  'mc-purpur': mcPurpurArt,
  'mc-spigot': mcSpigotArt,
  'mc-fabric': mcFabricArt,
  'mc-forge': mcForgeArt,
  'mc-neoforge': mcNeoforgeArt,
  'mc-bedrock': mcBedrockArt,
  'mc-velocity': mcVelocityArt,
  'mc-waterfall': mcWaterfallArt,
  'mc-bungeecord': mcBungeecordArt,
  'game-cs2': gameCs2Art,
  'game-rust': gameRustArt,
  'game-ark': gameArkArt,
  'game-terraria': gameTerrariaArt,
  'game-palworld': gamePalworldArt,
  'game-valheim': gameValheimArt,
  'game-factorio': gameFactorioArt,
  'app-discord-py': appDiscordPyArt,
  'app-discord-js': appDiscordJsArt,
  'app-postgres': appPostgresArt,
  'app-redis': appRedisArt,
  'app-prometheus': appPrometheusArt,
  'app-grafana': appGrafanaArt,
  'app-code-server': appCodeServerArt,
  'app-gitea': appGiteaArt,
  'app-lavalink': appLavalinkArt,
  'app-nginx': appNginxArt,
  'gen-nodejs': genNodejsArt,
  'gen-python': genPythonArt,
  'gen-java': genJavaArt,
  'gen-rust': genRustArt,
  'gen-go': genGoArt,
  'gen-dotnet': genDotnetArt,
  'gen-linux': genLinuxArt,
  'gen-bun': genBunArt,
  fallback: fallbackArt,
};

export function getEggArtworkUrl(artworkId: EggArtId): string {
  return EGG_ARTWORK_ASSETS[artworkId] ?? EGG_ARTWORK_ASSETS.fallback;
}
