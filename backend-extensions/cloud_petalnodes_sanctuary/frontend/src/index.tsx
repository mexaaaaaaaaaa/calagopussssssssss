import { faBell, faCube } from '@fortawesome/free-solid-svg-icons';
import type { CSSVariablesResolver, MantineThemeOverride } from '@mantine/core';
import { Extension, type ExtensionContext } from 'shared';
import './app.css';
import { AmbientPetalBackground } from './components/AmbientPetalBackground';
import {
  ConnectedMinecraftRoute,
  ConnectedNotificationsRoute,
} from './overrides/CalagopusExtensionRoutes';
import { blushCssVariablesResolver, blushThemeConfig } from './theme/mantineTheme';

const PETALNODES_GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';

function ensurePetalnodesFonts(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('petalnodes-google-fonts')) return;
  const link = document.createElement('link');
  link.id = 'petalnodes-google-fonts';
  link.rel = 'stylesheet';
  link.href = PETALNODES_GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}

/**
 * Official Calagopus Frontend Extension Entrypoint (`cloud.petalnodes.sanctuary` v2.1.0).
 */
export class PetalnodesSanctuaryExtension extends Extension {
  public override initialize(ctx: ExtensionContext): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(
        'data-petalnodes-theme',
        'cloud.petalnodes.sanctuary@2.1.0',
      );
      ensurePetalnodesFonts();
    }

    ctx.extensionRegistry?.enterThemes?.((themes) => {
      themes.disableVariants?.({ schemes: ['light', 'dark'] });
    });

    ctx.extensionRegistry?.enterGlobal?.((global) => {
      global.prependComponent?.(AmbientPetalBackground);
    });

    ctx.extensionRegistry?.enterRoutes?.((routes) => {
      routes.addServerRoute?.({
        path: '/minecraft',
        name: 'Minecraft',
        icon: faCube,
        permission: 'file.read',
        element: ConnectedMinecraftRoute,
      });

      routes.addAccountRoute?.({
        path: '/notifications',
        name: 'Notifications',
        icon: faBell,
        element: ConnectedNotificationsRoute,
      });
    });
  }

  public override initializeMantineTheme(_ctx: ExtensionContext): MantineThemeOverride {
    return blushThemeConfig;
  }

  public override initializeMantineCssResolver(
    _ctx: ExtensionContext,
  ): CSSVariablesResolver | null {
    return blushCssVariablesResolver;
  }
}

export { PetalnodesSanctuaryExtension as CalagopusBlushExtension };
export * from './workbench';

export default new PetalnodesSanctuaryExtension();
