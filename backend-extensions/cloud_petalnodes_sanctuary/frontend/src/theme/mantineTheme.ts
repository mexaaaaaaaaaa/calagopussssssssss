import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type MantineThemeOverride,
} from '@mantine/core';
import { BLUSH_PALETTE_SCALE, blushTokens } from './tokens';

const blushTuple: MantineColorsTuple = [...BLUSH_PALETTE_SCALE];

// Warm blush-tinted neutrals replacing stock cold gray/dark scales across Mantine & Calagopus core components
const blushGrayTuple: MantineColorsTuple = [
  '#FFF8FA',
  '#FCEEF3',
  '#F5E8EE',
  '#E6D6DE',
  '#CFC2C9',
  '#9A8F99',
  '#7D737E',
  '#68616B',
  '#433B45',
  '#29232A',
];

const sanctuaryDarkTuple: MantineColorsTuple = [
  '#F7F2F5',
  '#D8CFD6',
  '#B2AAB5',
  '#8C8292',
  '#5A5266',
  '#3E3A4D',
  '#2C2B38',
  '#21212C',
  '#1A1A23',
  '#111116',
];

export const blushThemeConfig: MantineThemeOverride = {
  primaryColor: 'blush',
  primaryShade: { light: 4, dark: 4 },
  colors: {
    blush: blushTuple,
    gray: blushGrayTuple,
    dark: sanctuaryDarkTuple,
  },
  fontFamily: blushTokens.typography.fontBody,
  fontFamilyMonospace: blushTokens.typography.fontMono,
  headings: {
    fontFamily: blushTokens.typography.fontDisplay,
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.25' },
      h2: { fontSize: '1.125rem', lineHeight: '1.35' },
      h3: { fontSize: '0.9375rem', lineHeight: '1.4' },
      h4: { fontSize: '0.875rem', lineHeight: '1.45' },
    },
  },
  defaultRadius: 'md',
  autoContrast: true,
  luminanceThreshold: 0.35,
  radius: {
    xs: '4px',
    sm: blushTokens.radii.sm,
    md: blushTokens.radii.md,
    lg: blushTokens.radii.lg,
    xl: blushTokens.radii.xl,
  },
  shadows: {
    xs: blushTokens.shadows.card,
    sm: blushTokens.shadows.card,
    md: blushTokens.shadows.popover,
  },
  focusRing: 'auto',
  cursorType: 'pointer',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        radius: 'lg',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Badge: {
      defaultProps: {
        variant: 'light',
        radius: 'sm',
      },
    },
    Tabs: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Switch: {
      defaultProps: {
        color: 'blush',
      },
    },
    Checkbox: {
      defaultProps: {
        color: 'blush',
        radius: 'sm',
      },
    },
    Alert: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        centered: true,
        transitionProps: { duration: 150, transition: 'fade' },
      },
    },
    Drawer: {
      defaultProps: {
        transitionProps: { duration: 160, transition: 'slide-right' },
      },
    },
    Menu: {
      defaultProps: {
        radius: 'lg',
        transitionProps: { duration: 120, transition: 'fade' },
      },
    },
    Tooltip: {
      defaultProps: {
        radius: 'sm',
        transitionProps: { duration: 120, transition: 'fade' },
      },
    },
  },
};

export const blushMantineTheme = createTheme(blushThemeConfig);

export const blushCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-font-family': blushTokens.typography.fontBody,
    '--mantine-font-family-headings': blushTokens.typography.fontDisplay,
    '--mantine-font-family-monospace': blushTokens.typography.fontMono,
    '--chart-series-1-border': blushTokens.colors.primary,
    '--chart-series-1-fill': 'rgba(244, 166, 193, 0.24)',
    '--mantine-primary-color-filled': blushTokens.colors.primary,
    '--mantine-primary-color-filled-hover': blushTokens.colors.primaryHover,
    '--mantine-primary-color-light': blushTokens.colors.primarySoft,
    '--mantine-primary-color-light-hover': blushTokens.colors.borderStrong,
    '--mantine-primary-color-light-color': blushTokens.colors.primaryTextOnSoft,
  },
  light: {
    '--mantine-color-body': blushTokens.colors.background,
    '--mantine-color-text': blushTokens.colors.mainText,
    '--mantine-color-dimmed': blushTokens.colors.secondaryText,
    '--mantine-color-default': blushTokens.colors.surface,
    '--mantine-color-default-hover': blushTokens.colors.primarySubtle,
    '--mantine-color-default-border': blushTokens.colors.border,
    '--mantine-color-placeholder': blushTokens.colors.secondaryText,
    '--chart-grid-color': blushTokens.colors.border,
    '--chart-tick-color': blushTokens.colors.secondaryText,
    '--chart-series-2-border': blushTokens.colors.mainText,
    '--chart-series-2-fill': 'rgba(41, 35, 42, 0.12)',
  },
  dark: {
    '--mantine-color-body': blushTokens.darkColors.background,
    '--mantine-color-text': blushTokens.darkColors.mainText,
    '--mantine-color-dimmed': blushTokens.darkColors.secondaryText,
    '--mantine-color-default': blushTokens.darkColors.surface,
    '--mantine-color-default-hover': blushTokens.darkColors.secondarySurface,
    '--mantine-color-default-border': blushTokens.darkColors.border,
    '--mantine-color-placeholder': blushTokens.darkColors.secondaryText,
    '--chart-grid-color': blushTokens.darkColors.border,
    '--chart-tick-color': blushTokens.darkColors.secondaryText,
    '--chart-series-2-border': '#C4B5FD',
    '--chart-series-2-fill': 'rgba(196, 181, 253, 0.16)',
  },
});
