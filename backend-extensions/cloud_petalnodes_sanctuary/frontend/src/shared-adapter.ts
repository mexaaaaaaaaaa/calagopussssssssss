import type { ComponentType, FC, ReactElement } from 'react';
import type { CSSVariablesResolver, MantineThemeOverride } from '@mantine/core';

export interface ThemeRegistryLike {
  disableVariants?: (options?: { schemes?: Array<'light' | 'dark'> }) => unknown;
}

export interface ComponentListRegistryLike {
  prependComponent?: (component: FC) => unknown;
  appendComponent?: (component: FC) => unknown;
}

export interface RouteDefinitionLike {
  path: string;
  filter?: () => boolean;
  matches?: (path: string) => boolean;
  element: FC;
  exact?: boolean;
  name: string | (() => string) | undefined;
  icon?: unknown;
  activeMatches?: string[];
}

export interface AdminRouteDefinitionLike extends RouteDefinitionLike {
  permission?: string | string[] | null;
  category?: string;
}

export interface ServerRouteDefinitionLike extends RouteDefinitionLike {
  permission?: string | string[] | null;
}

export interface RouteRegistryLike {
  globalRoutes?: Array<Omit<RouteDefinitionLike, 'name'>>;
  authenticationRoutes?: Array<Omit<RouteDefinitionLike, 'name'>>;
  accountRoutes?: RouteDefinitionLike[];
  adminRoutes?: AdminRouteDefinitionLike[];
  serverRoutes?: ServerRouteDefinitionLike[];
  addGlobalRoute?: (route: Omit<RouteDefinitionLike, 'name'>) => unknown;
  addAuthenticationRoute?: (route: Omit<RouteDefinitionLike, 'name'>) => unknown;
  addAccountRoute?: (route: RouteDefinitionLike) => unknown;
  addAdminRoute?: (route: AdminRouteDefinitionLike) => unknown;
  addServerRoute?: (route: ServerRouteDefinitionLike) => unknown;
  addAccountRouteInterceptor?: (interceptor: (items: RouteDefinitionLike[]) => void) => unknown;
  addAdminRouteInterceptor?: (interceptor: (items: AdminRouteDefinitionLike[]) => void) => unknown;
  addServerRouteInterceptor?: (interceptor: (items: ServerRouteDefinitionLike[]) => void) => unknown;
}

export interface ExtensionRegistryLike {
  enterThemes?: (callback: (registry: ThemeRegistryLike) => unknown) => unknown;
  enterGlobal?: (callback: (registry: ComponentListRegistryLike) => unknown) => unknown;
  enterRoutes?: (callback: (registry: RouteRegistryLike) => unknown) => unknown;
}

export interface OverrideEntry {
  original: unknown;
  replacement: unknown;
}

export type HookableComponentBase<P> = {
  addPropsInterceptor(interceptor: (props: P) => P): () => void;
  addRenderInterceptor(interceptor: (element: ReactElement<P>, props: P) => ReactElement<P>): () => void;
  replaceBaseComponent(newComponent: ComponentType<P>): () => void;
};

export type HookableComponent<P extends object> = FC<P> & HookableComponentBase<P>;

export function makeComponentHookable<
  P extends object,
  AdditionalComponents extends Record<string, FC<any>> = {},
>(
  Component: ComponentType<P>,
  additionalComponents?: AdditionalComponents,
): HookableComponent<P> & AdditionalComponents {
  const Hookable = ((props: P) => {
    const Comp = Component as FC<P>;
    return Comp(props);
  }) as unknown as HookableComponent<P> & AdditionalComponents;

  Hookable.addPropsInterceptor = () => () => {};
  Hookable.addRenderInterceptor = () => () => {};
  Hookable.replaceBaseComponent = () => () => {};

  if (additionalComponents) {
    for (const key in additionalComponents) {
      (Hookable as unknown as Record<string, FC<never>>)[key] = additionalComponents[key];
    }
  }
  return Hookable;
}

/**
 * Type-safe adapter mirroring the Calagopus Panel `shared` extension contract:
 * `import { Extension, ExtensionContext } from 'shared';`
 *
 * Inside the full `calagopus-panel` build environment, imports of `'shared'`
 * resolve directly to `calagopus-panel/frontend/extensions/shared`.
 */
export class ExtensionContext {
  public readonly extensionIdentifier?: string;
  public extensionRegistry?: ExtensionRegistryLike;
}

export class Extension {
  public packageName = '';

  public initialize(_ctx: ExtensionContext): void {}

  public initializeMantineTheme(_ctx: ExtensionContext): MantineThemeOverride {
    return {};
  }

  public initializeMantineCssResolver(_ctx: ExtensionContext): CSSVariablesResolver | null {
    return null;
  }
}

export { Extension as CalagopusExtensionBase };
