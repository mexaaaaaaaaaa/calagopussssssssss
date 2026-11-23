import paperVanillaArt from '../assets/servers/paper_vanilla.jpg';
import purpurEndArt from '../assets/servers/purpur_end.jpg';
import moddedForgeArt from '../assets/servers/modded_forge.jpg';
import proxyNetworkArt from '../assets/servers/proxy_network.jpg';
import bedrockOutpostArt from '../assets/servers/bedrock_outpost.jpg';
import type { ServerArtKey } from './serverArtwork';

export const SERVER_ARTWORK_ASSETS: Record<ServerArtKey, string> = {
  paper_vanilla: paperVanillaArt,
  purpur_end: purpurEndArt,
  modded_forge: moddedForgeArt,
  proxy_network: proxyNetworkArt,
  bedrock_outpost: bedrockOutpostArt,
};
