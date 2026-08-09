export const COLORS = {
  // Primary
  primary:        '#1E1E20',   // Warm dark neutral — main brand color
  primaryLight:   '#2A2A2E',
  accent:         '#C87A63',   // Muted terracotta — buttons, highlights
  accentLight:    '#DDA18F',
  accentDark:     '#A85F49',   // Pressed/active states, ensures contrast

  // Backgrounds
  background:     '#161618',   // Warm obsidian background
  card:           '#202024',   // Card background
  cardLight:      '#2A2A2E',   // Slightly lighter card

  // Text
  textPrimary:    '#F2F2F2',
  textSecondary:  '#94949C',
  textMuted:      '#606070',

  // Status
  success:        '#24B37F',
  warning:        '#E6A94A',
  error:          '#E25858',

  // Category badges (used in HomeScreen/ShopDetailScreen)
  categoryMen:    '#7898B0',
  categoryWomen:  '#C4849B',

  // Others
  border:         '#2E2E32',
  inputBg:        '#202024',
  overlay:        'rgba(0,0,0,0.7)',
  white:          '#FFFFFF',
  black:          '#000000',
};

export const FONTS = {
  regular:   'System',
  medium:    'System',
  bold:      'System',
  sizes: {
    xs:   11,
    sm:   13,
    md:   15,
    lg:   17,
    xl:   20,
    xxl:  24,
    xxxl: 30,
  },
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#C87A63',   // updated from old accent #E94560
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
};