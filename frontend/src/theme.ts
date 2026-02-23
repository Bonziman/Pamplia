// theme.ts — Apple-inspired design system for Chakra UI v2.8.2
// Single source of truth for colors, spacing, typography, shadows, and component styles.
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// ─── Color Palette ───────────────────────────────────────────────────────────
// Brand teal refined with wider range for subtle backgrounds & strong accents.
const colors = {
  brand: {
    25:  '#F0FDFA',
    50:  '#CCFBF1',
    100: '#99F6E4',
    200: '#5EEAD4',
    300: '#2DD4BF',
    400: '#14B8A6',
    500: '#0D9488',  // Primary
    600: '#0F766E',
    700: '#115E59',
    800: '#134E4A',
    900: '#042F2E',
  },
  gray: {
    25:  '#FCFCFD',
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
  // Semantic status colors — full scales for badges/backgrounds
  green:  { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
  red:    { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  yellow: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 400: '#FACC15', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207' },
  blue:   { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
  orange: { 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 400: '#FB923C', 500: '#F97316', 600: '#EA580C' },
  // UI semantic tokens — single source for all layout colors
  ui: {
    bg:             '#F9FAFB',        // Page background (soft gray)
    surface:        '#FFFFFF',        // Card/panel surfaces
    surfaceRaised:  '#FFFFFF',        // Elevated surfaces (modals, popovers)
    border:         '#E5E7EB',        // Default borders
    borderSubtle:   '#F3F4F6',        // Very subtle dividers
    sidebarBg:      '#111827',        // Dark sidebar
    sidebarText:    '#F9FAFB',        // Light text on sidebar
    sidebarMuted:   '#9CA3AF',        // Muted sidebar text
    sidebarHover:   'rgba(255,255,255,0.06)',
    sidebarActive:  'rgba(255,255,255,0.10)',
    headerBg:       '#FFFFFF',        // Clean white header
    topbarBg:       '#FFFFFF',        // Legacy alias for header bg
    inputBorder:    '#D1D5DB',
    inputFocusBorder: '#0D9488',
  },
  blackAlpha: {
    50:  'rgba(0, 0, 0, 0.04)',
    100: 'rgba(0, 0, 0, 0.06)',
    200: 'rgba(0, 0, 0, 0.08)',
    300: 'rgba(0, 0, 0, 0.16)',
    400: 'rgba(0, 0, 0, 0.24)',
    500: 'rgba(0, 0, 0, 0.36)',
    600: 'rgba(0, 0, 0, 0.48)',
    700: 'rgba(0, 0, 0, 0.64)',
    800: 'rgba(0, 0, 0, 0.80)',
    900: 'rgba(0, 0, 0, 0.92)',
  },
};

// ─── Typography ──────────────────────────────────────────────────────────────
const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  body:    `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono:    `'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace`,
};

const fontSizes = {
  '2xs': '11px',
  xs:    '12px',
  sm:    '13px',
  md:    '14px',
  lg:    '16px',
  xl:    '18px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '30px',
  '5xl': '36px',
  '6xl': '48px',
};

const fontWeights = {
  hairline: 100, thin: 200, light: 300,
  normal: 400, medium: 500, semibold: 600,
  bold: 700, extrabold: 800, black: 900,
};

const lineHeights = {
  normal: 'normal', none: 1,
  shorter: 1.25, short: 1.375,
  base: 1.5, tall: 1.625, taller: 2,
};

const letterSpacings = {
  tighter: '-0.05em', tight: '-0.025em',
  normal: '0', wide: '0.025em',
  wider: '0.05em', widest: '0.1em',
};

// ─── Border Radii (Apple-inspired: generous, consistent) ─────────────────────
const radii = {
  none: '0',
  xs:   '4px',
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  '2xl':'24px',
  full: '9999px',
};

// ─── Shadows (3-tier Apple-style: soft, subtle, layered) ─────────────────────
const shadows = {
  xs:    '0 1px 2px 0 rgba(0,0,0,0.03)',
  sm:    '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
  md:    '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)',
  lg:    '0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.03)',
  xl:    '0 20px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.03)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.15)',
  // Semantic shadows
  card:    '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)',
  cardHover: '0 8px 24px -4px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.03)',
  modal:   '0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
  dropdown:'0 4px 16px -2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
  focus:   `0 0 0 3px rgba(13, 148, 136, 0.20)`,  // Brand teal focus ring
  inner:   'inset 0 2px 4px 0 rgba(0,0,0,0.04)',
  none:    'none',
};

// ─── Spacing (kept standard, 4px base) ───────────────────────────────────────
const space = {
  px: '1px',
  0.5: '2px', 1: '4px', 1.5: '6px', 2: '8px', 2.5: '10px',
  3: '12px', 3.5: '14px', 4: '16px', 5: '20px', 6: '24px',
  7: '28px', 8: '32px', 9: '36px', 10: '40px', 12: '48px',
  14: '56px', 16: '64px', 20: '80px', 24: '96px',
};

// ─── Z-Index Scale ───────────────────────────────────────────────────────────
const zIndices = {
  hide: -1, base: 0, dropdown: 10, sticky: 20,
  banner: 30, overlay: 40, modal: 50,
  popover: 60, toast: 70, tooltip: 80,
};

// ─── Breakpoints ──────────────────────────────────────────────────────────────
const breakpoints = {
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ─── Transition Presets ──────────────────────────────────────────────────────
const transition = {
  property: {
    common: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
    colors: 'background-color, border-color, color, fill, stroke',
    dimensions: 'width, height',
    position: 'left, right, top, bottom',
    background: 'background-color, background-image, background-position',
  },
  easing: {
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  duration: {
    'ultra-fast': '50ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    'ultra-slow': '500ms',
  },
};

// ─── Component Styles ────────────────────────────────────────────────────────
const components = {
  // ── Button ──────────────────────────────────────────────────────────────
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      _focusVisible: { boxShadow: 'focus', outline: 'none' },
    },
    sizes: {
      xs: { h: '28px', fontSize: 'xs', px: 2.5 },
      sm: { h: '34px', fontSize: 'sm', px: 3 },
      md: { h: '40px', fontSize: 'md', px: 4 },
      lg: { h: '46px', fontSize: 'lg', px: 6 },
    },
    variants: {
      primary: {
        bg: 'brand.500', color: 'white',
        _hover: { bg: 'brand.600', transform: 'translateY(-1px)', boxShadow: 'md', _disabled: { bg: 'brand.500', transform: 'none', boxShadow: 'none' } },
        _active: { bg: 'brand.700', transform: 'translateY(0)' },
        _disabled: { opacity: 0.5, cursor: 'not-allowed' },
      },
      secondary: {
        bg: 'gray.100', color: 'gray.700', border: '1px solid', borderColor: 'gray.200',
        _hover: { bg: 'gray.200', _disabled: { bg: 'gray.100' } },
        _active: { bg: 'gray.300' },
      },
      ghost: {
        color: 'gray.600',
        _hover: { bg: 'gray.100' },
        _active: { bg: 'gray.200' },
      },
      danger: {
        bg: 'red.500', color: 'white',
        _hover: { bg: 'red.600', transform: 'translateY(-1px)', boxShadow: 'md' },
        _active: { bg: 'red.700', transform: 'translateY(0)' },
      },
      outline: {
        bg: 'transparent', color: 'brand.600', border: '1px solid', borderColor: 'brand.500',
        _hover: { bg: 'brand.25' },
        _active: { bg: 'brand.50' },
      },
      // Legacy compat — map solid brand to primary
      solid: (props: Record<string, any>) => {
        if (props.colorScheme === 'brand') {
          return {
            bg: 'brand.500', color: 'white',
            _hover: { bg: 'brand.600', _disabled: { bg: 'brand.500' } },
            _active: { bg: 'brand.700' },
            _disabled: { opacity: 0.5, cursor: 'not-allowed' },
          };
        }
        return {};
      },
    },
    defaultProps: { variant: 'primary', size: 'md' },
  },

  // ── Heading ─────────────────────────────────────────────────────────────
  Heading: {
    baseStyle: {
      color: 'gray.900',
      fontWeight: 'semibold',
      letterSpacing: 'tight',
    },
    sizes: {
      '2xl': { fontSize: '4xl', lineHeight: 'shorter' },
      xl:  { fontSize: '3xl', lineHeight: 'shorter' },
      lg:  { fontSize: '2xl', lineHeight: 'short' },
      md:  { fontSize: 'xl', lineHeight: 'short' },
      sm:  { fontSize: 'lg', lineHeight: 'base' },
    },
  },

  // ── Text ────────────────────────────────────────────────────────────────
  Text: {
    baseStyle: { color: 'gray.700', lineHeight: 'base' },
    variants: {
      secondary: { color: 'gray.500', fontSize: 'sm' },
      muted:     { color: 'gray.400', fontSize: 'sm' },
      label:     { color: 'gray.500', fontSize: 'xs', fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: 'wider' },
      caption:   { color: 'gray.500', fontSize: 'xs' },
    },
  },

  // ── Input ───────────────────────────────────────────────────────────────
  Input: {
    baseStyle: {
      field: {
        _focusVisible: { outline: 'none' },
      },
    },
    sizes: {
      md: { field: { h: '40px', fontSize: 'md', px: 3, borderRadius: 'md' } },
      lg: { field: { h: '46px', fontSize: 'lg', px: 4, borderRadius: 'md' } },
    },
    variants: {
      outline: {
        field: {
          bg: 'white',
          borderColor: 'ui.inputBorder',
          borderRadius: 'md',
          _hover:       { borderColor: 'gray.400' },
          _placeholder: { color: 'gray.400' },
          _focus:       { borderColor: 'brand.500', boxShadow: 'focus' },
          _disabled:    { opacity: 0.5, cursor: 'not-allowed', bg: 'gray.50' },
          _invalid:     { borderColor: 'red.500', boxShadow: `0 0 0 1px var(--chakra-colors-red-500)` },
        },
      },
      filled: {
        field: {
          bg: 'gray.50', borderColor: 'transparent', borderRadius: 'md', border: '1px solid',
          _hover:   { bg: 'gray.100' },
          _focus:   { bg: 'white', borderColor: 'brand.500', boxShadow: 'focus' },
          _placeholder: { color: 'gray.400' },
        },
      },
    },
    defaultProps: { variant: 'outline', size: 'md' },
  },

  // ── Select ──────────────────────────────────────────────────────────────
  Select: {
    variants: {
      outline: {
        field: {
          bg: 'white', borderColor: 'ui.inputBorder', borderRadius: 'md',
          _hover: { borderColor: 'gray.400' },
          _focus: { borderColor: 'brand.500', boxShadow: 'focus' },
        },
      },
    },
    defaultProps: { variant: 'outline' },
  },

  // ── Textarea ────────────────────────────────────────────────────────────
  Textarea: {
    variants: {
      outline: {
        bg: 'white', borderColor: 'ui.inputBorder', borderRadius: 'md',
        _hover:   { borderColor: 'gray.400' },
        _focus:   { borderColor: 'brand.500', boxShadow: 'focus' },
        _placeholder: { color: 'gray.400' },
      },
    },
    defaultProps: { variant: 'outline' },
  },

  // ── Badge ───────────────────────────────────────────────────────────────
  Badge: {
    baseStyle: {
      borderRadius: 'full',
      px: 2.5,
      py: 0.5,
      fontSize: 'xs',
      fontWeight: 'medium',
      textTransform: 'capitalize',
    },
    variants: {
      subtle: (props: Record<string, any>) => ({
        bg: `${props.colorScheme}.50`,
        color: `${props.colorScheme}.700`,
      }),
      status: {
        // Default status badge style
      },
    },
  },

  // ── Card (custom) ──────────────────────────────────────────────────────
  Card: {
    baseStyle: {
      container: {
        bg: 'white',
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: 'ui.border',
        boxShadow: 'card',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      },
      header: { px: 5, pt: 5, pb: 0 },
      body:   { px: 5, py: 4 },
      footer: { px: 5, pb: 5, pt: 0 },
    },
    variants: {
      elevated: {
        container: {
          borderColor: 'transparent',
          boxShadow: 'md',
          _hover: { boxShadow: 'cardHover', transform: 'translateY(-2px)' },
        },
      },
      outline: {
        container: {
          boxShadow: 'none',
          borderColor: 'ui.border',
        },
      },
      ghost: {
        container: {
          bg: 'transparent', border: 'none', boxShadow: 'none',
        },
      },
    },
    defaultProps: { variant: 'outline' },
  },

  // ── Table ───────────────────────────────────────────────────────────────
  Table: {
    baseStyle: {
      th: {
        color: 'gray.500',
        fontWeight: 'medium',
        fontSize: 'xs',
        textTransform: 'uppercase',
        letterSpacing: 'wider',
        borderColor: 'ui.border',
      },
      td: {
        fontSize: 'md',
        color: 'gray.700',
        borderColor: 'ui.borderSubtle',
      },
    },
    variants: {
      simple: {
        th: {
          bg: 'gray.50',
          borderBottom: '1px solid',
          borderColor: 'ui.border',
        },
        td: {
          borderBottom: '1px solid',
          borderColor: 'ui.borderSubtle',
        },
        tbody: {
          tr: {
            _hover: { bg: 'gray.25' },
            transition: 'background-color 0.15s ease',
          },
        },
      },
    },
    defaultProps: { variant: 'simple' },
  },

  // ── Modal ───────────────────────────────────────────────────────────────
  Modal: {
    baseStyle: {
      overlay: {
        bg: 'blackAlpha.400',
        backdropFilter: 'blur(4px)',
      },
      dialog: {
        borderRadius: 'xl',
        boxShadow: 'modal',
        bg: 'white',
        mx: 4,
      },
      header: {
        fontSize: 'xl',
        fontWeight: 'semibold',
        color: 'gray.900',
        px: 6, pt: 6, pb: 0,
      },
      body: { px: 6, py: 5 },
      footer: {
        px: 6, pb: 6, pt: 0,
        gap: 3,
      },
      closeButton: {
        _focusVisible: { boxShadow: 'focus' },
      },
    },
  },

  // ── Drawer ──────────────────────────────────────────────────────────────
  Drawer: {
    baseStyle: {
      overlay: { bg: 'blackAlpha.400', backdropFilter: 'blur(4px)' },
      dialog: { boxShadow: 'modal', bg: 'white' },
      header: { fontSize: 'xl', fontWeight: 'semibold', color: 'gray.900', px: 6, pt: 6 },
      body: { px: 6, py: 5 },
      footer: { px: 6, pb: 6, gap: 3 },
    },
  },

  // ── Menu ────────────────────────────────────────────────────────────────
  Menu: {
    baseStyle: {
      list: {
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: 'ui.border',
        boxShadow: 'dropdown',
        py: 1.5,
        minW: '180px',
      },
      item: {
        fontSize: 'md',
        px: 3,
        py: 2,
        borderRadius: 'sm',
        mx: 1.5,
        _hover: { bg: 'gray.50' },
        _focus: { bg: 'gray.50' },
        transition: 'background-color 0.15s ease',
      },
      divider: { my: 1.5, borderColor: 'ui.border' },
    },
  },

  // ── Tabs ────────────────────────────────────────────────────────────────
  Tabs: {
    variants: {
      line: {
        tab: {
          color: 'gray.500', fontWeight: 'medium', fontSize: 'md',
          _selected: { color: 'brand.600', borderColor: 'brand.500' },
          _hover: { color: 'gray.700' },
          _focusVisible: { boxShadow: 'focus' },
        },
        tablist: { borderColor: 'ui.border' },
      },
      enclosed: {
        tab: {
          borderRadius: 'md', fontWeight: 'medium', fontSize: 'sm',
          _selected: { bg: 'white', color: 'gray.900', borderColor: 'ui.border', borderBottomColor: 'white' },
        },
      },
    },
  },

  // ── Tooltip ─────────────────────────────────────────────────────────────
  Tooltip: {
    baseStyle: {
      bg: 'gray.800',
      color: 'white',
      fontSize: 'xs',
      fontWeight: 'medium',
      px: 3, py: 1.5,
      borderRadius: 'md',
      boxShadow: 'lg',
    },
  },

  // ── Stat ────────────────────────────────────────────────────────────────
  Stat: {
    baseStyle: {
      label: { color: 'gray.500', fontSize: 'sm', fontWeight: 'medium' },
      number: { color: 'gray.900', fontSize: '3xl', fontWeight: 'semibold', letterSpacing: 'tight' },
      helpText: { color: 'gray.500', fontSize: 'xs' },
    },
  },

  // ── Tag ─────────────────────────────────────────────────────────────────
  Tag: {
    baseStyle: {
      container: {
        borderRadius: 'full',
        fontWeight: 'medium',
        fontSize: 'xs',
      },
    },
    variants: {
      subtle: (props: Record<string, any>) => ({
        container: {
          bg: `${props.colorScheme}.50`,
          color: `${props.colorScheme}.700`,
        },
      }),
    },
  },

  // ── Skeleton ────────────────────────────────────────────────────────────
  Skeleton: {
    baseStyle: {
      borderRadius: 'md',
      startColor: 'gray.100',
      endColor: 'gray.200',
    },
  },

  // ── FormLabel ───────────────────────────────────────────────────────────
  FormLabel: {
    baseStyle: {
      color: 'gray.700',
      fontSize: 'sm',
      fontWeight: 'medium',
      mb: 1.5,
    },
  },

  // ── Divider ─────────────────────────────────────────────────────────────
  Divider: {
    baseStyle: {
      borderColor: 'ui.border',
      opacity: 1,
    },
  },

  // ── Avatar ──────────────────────────────────────────────────────────────
  Avatar: {
    baseStyle: {
      container: {
        bg: 'brand.100',
        color: 'brand.700',
        fontWeight: 'semibold',
      },
    },
  },

  // ── Switch ──────────────────────────────────────────────────────────────
  Switch: {
    baseStyle: {
      track: {
        _checked: { bg: 'brand.500' },
        _focusVisible: { boxShadow: 'focus' },
      },
    },
  },

  // ── Accordion ───────────────────────────────────────────────────────────
  Accordion: {
    baseStyle: {
      container: { borderColor: 'ui.border' },
      button: {
        _hover: { bg: 'gray.50' },
        _focusVisible: { boxShadow: 'focus' },
        fontWeight: 'medium',
      },
    },
  },
};

// ─── Global Styles ───────────────────────────────────────────────────────────
const styles = {
  global: {
    'html, body': {
      color: 'gray.700',
      bg: 'ui.bg',
      fontFamily: 'body',
      lineHeight: 'base',
      fontSize: 'md',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    // Global focus-visible ring
    '*:focus-visible': {
      outline: 'none',
      boxShadow: 'focus',
    },
    // Smooth scrolling
    '*': {
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--chakra-colors-gray-300) transparent',
    },
    '*::-webkit-scrollbar': { width: '6px', height: '6px' },
    '*::-webkit-scrollbar-track': { background: 'transparent' },
    '*::-webkit-scrollbar-thumb': {
      background: 'var(--chakra-colors-gray-300)',
      borderRadius: '3px',
    },
    '*::-webkit-scrollbar-thumb:hover': {
      background: 'var(--chakra-colors-gray-400)',
    },
    // Selection color
    '::selection': {
      bg: 'brand.100',
      color: 'brand.900',
    },
  },
};

// ─── Config ──────────────────────────────────────────────────────────────────
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// ─── Export ──────────────────────────────────────────────────────────────────
const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  radii,
  shadows,
  space,
  zIndices,
  breakpoints,
  transition,
  components,
  styles,
});

export default theme;
