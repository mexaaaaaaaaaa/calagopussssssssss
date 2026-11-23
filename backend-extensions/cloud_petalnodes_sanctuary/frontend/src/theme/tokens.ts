export const blushTokens = {
  colors: {
    primary: '#F4A6C1',
    primaryHover: '#EA8CAE',
    primaryActive: '#E0789F',
    primaryTextOnSoft: '#8E2E52',
    primarySoft: '#FCE7EF',
    primarySubtle: '#FFF5F8',
    background: '#FFF8FA',
    surface: '#FFFFFF',
    secondarySurface: '#FCFAFB',
    mainText: '#29232A',
    secondaryText: '#68616B',
    border: '#EEE5E9',
    borderStrong: '#DECED5',
    success: '#65A879',
    successBg: '#EFF7F1',
    successText: '#275D38',
    warning: '#E7AD55',
    warningBg: '#FDF7EB',
    warningText: '#7A4E0B',
    danger: '#DC6B78',
    dangerBg: '#FDF1F2',
    dangerText: '#942B38',
  },
  darkColors: {
    primary: '#F4A6C1',
    primaryHover: '#F7BDD2',
    primaryActive: '#EA8CAE',
    primaryTextOnSoft: '#F9C6D8',
    primarySoft: 'rgba(244, 166, 193, 0.16)',
    primarySubtle: 'rgba(244, 166, 193, 0.09)',
    background: '#111116',
    surface: '#1A1A23',
    secondarySurface: '#21212C',
    mainText: '#F7F2F5',
    secondaryText: '#B2AAB5',
    border: '#2C2B38',
    borderStrong: '#3E3A4D',
  },
  typography: {
    fontDisplay: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontBody: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    card: '0 1px 2px rgba(41, 35, 42, 0.04)',
    popover: '0 10px 28px rgba(41, 35, 42, 0.09)',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
} as const;

export const BLUSH_PALETTE_SCALE = [
  '#FFF8FA', // 0: Canvas
  '#FCE7EF', // 1: Primary Soft
  '#FAD5E2', // 2: Soft Tint
  '#F7BDD2', // 3: Light Rose
  '#F4A6C1', // 4: Primary Pink
  '#EA8CAE', // 5: Primary Hover
  '#DC7298', // 6: Medium Rose
  '#C2527B', // 7: Deep Rose
  '#8E2E52', // 8: High-contrast Accent Text
  '#661E3A', // 9: Darkest Rose
] as const;
