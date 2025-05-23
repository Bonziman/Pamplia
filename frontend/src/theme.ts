// theme.ts (for Chakra UI v2.8.2 with React 18)
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const colors = {
  brand: {
    50: '#E0F2F1', 100: '#B2DFDB', 200: '#80CBC4', 300: '#4DB6AC', 400: '#26A69A',
    500: '#0D9488', 600: '#00897B', 700: '#00796B', 800: '#00695C', 900: '#004D40',
  },
  gray: {
    50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF',
    500: '#6B7281', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827',
  },
  ui: {
    sidebarBg: '#18181B', sidebarText: '#FFFFFF', sidebarIcon: 'brand.500',
    sidebarActiveBg: 'rgba(247, 247, 247, 0.1)', topbarBg: '#CCFBF7',
    contentBg: '#FFFFFF', inputBorder: 'gray.300', inputFocusBorder: 'brand.500', bodybg: 'rgb(238, 238, 238)',
  },
  green: { 500: '#22C55E' }, red: { 500: '#EF4444' },
  yellow: { 400: '#FACC15' }, blue: { 500: '#3B82F6' },
  blackAlpha: {
    50: 'rgba(0, 0, 0, 0.04)', 100: 'rgba(0, 0, 0, 0.06)', 200: 'rgba(0, 0, 0, 0.08)',
  },
};

const fonts = {
  heading: `'Inter', sans-serif`, body: `'Inter', sans-serif`,
  mono: `'Inter', sans-serif`,
};

const heading = {
  baseStyle: {
    fontWeight: 'bold',
  },
};

const fontSizes = {
  xs: '12px', sm: '14px', md: '16px', lg: '18px', xl: '20px',
  '2xl': '24px', '3xl': '30px', '4xl': '36px',
};

const fontWeights = {
  hairline: 100, thin: 200, light: 300, normal: 400, medium: 500,
  semibold: 600, bold: 700, extrabold: 800, black: 900,
};

const lineHeights = {
  normal: 'normal', none: 1, shorter: 1.25, short: 1.375, base: 1.5,
  tall: 1.625, taller: '2',
};

const radii = {
  none: '0',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
};

const components = {
  Button: {
    baseStyle: { fontWeight: 'semibold', borderRadius: 'md' },
    variants: {
      solid: (props: Record<string, any>) => {
        if (props.colorScheme === 'brand') {
          return {
            bg: `${props.colorScheme}.500`, color: 'white',
            _hover: { bg: `${props.colorScheme}.600`, _disabled: { bg: `${props.colorScheme}.500` }},
            _active: { bg: `${props.colorScheme}.700` },
            _disabled: { opacity: 0.6, cursor: 'not-allowed', bg: `${props.colorScheme}.500` }
          };
        }
        return {};
      },
      ghostTopbar: { color: 'gray.600', _hover: { bg: 'blackAlpha.100' }, _active: { bg: 'blackAlpha.200' }},
    },
  },
  Heading: {
    baseStyle: { color: 'gray.800', fontWeight: 'bold' },
    sizes: { 'xl': { fontSize: '2xl', lineHeight: 'shorter' }, 'lg': { fontSize: 'xl' }, 'md': { fontSize: 'lg' }},
  },
  Text: {
    baseStyle: { color: 'gray.800', lineHeight: 'base' },
    variants: {
      secondary: { color: 'gray.600' }, muted: { color: 'gray.500' },
      sidebar: { color: 'ui.sidebarText', fontSize: 'md', fontWeight: 'medium' }
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: 'ui.inputBorder', borderRadius: 'md', bg: 'transparent',
          _hover: { borderColor: 'gray.400' }, _placeholder: { color: 'gray.400' },
          _focus: { borderColor: 'ui.inputFocusBorder', boxShadow: `0 0 0 1px ${colors.brand[500]}`},
          _disabled: { opacity: 0.4, cursor: 'not-allowed' },
        },
      },
      topbarSearch: {
         field: {
            bg: 'white', borderColor: 'transparent', borderRadius: 'md',
            _placeholder: { color: 'gray.400' },
            _focus: { borderColor: 'ui.inputFocusBorder', boxShadow: `0 0 0 1px ${colors.brand[500]}`},
        },
      }
    },
    defaultProps: { variant: 'outline' },
  },
  Select: {
    variants: {
      outline: {
        field: {
          borderColor: 'ui.inputBorder', borderRadius: 'md',
          _hover: { borderColor: 'gray.400' },
          _focus: { borderColor: 'ui.inputFocusBorder', boxShadow: `0 0 0 1px ${colors.brand[500]}`},
        },
      },
    },
    defaultProps: { variant: 'outline' },
  },
  Menu: {
    baseStyle: {
      list: { borderRadius: 'md', borderColor: 'gray.200', boxShadow: 'md' },
      item: { _hover: { bg: 'brand.50' }, _focus: { bg: 'brand.50' } },
    },
  },
};

const styles = {
  global: (props: Record<string, any>) => ({
    'html, body': {
      color: 'gray.700', bg: 'ui.bodyBg', fontFamily: 'body',
      lineHeight: 'base', fontSize: 'md',
    },
  }),
};

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config, colors, fonts, fontSizes, fontWeights, lineHeights, radii, components, styles, heading,
});

export default theme;
