import { Theme } from '../types/theme';

export const climateWatchTheme: Theme = {
  name: 'Climate Watch',
  colors: {
    // Brand/Primary
    primary: '#0033A0',
    secondary: '#1C3B81',
    background: '#FFFFFF',
    text: '#0A2239',
    primaryDark: '#0A2239',
    primaryMid: '#1C3B81',
    primaryLight: '#6B8ED6',
    primaryLighter: '#E6E7F8',
    primaryLightest: '#F5F6F8',
    accent: '#FFC300',

    // Greys
    greyDark: '#74747C',
    grey: '#A6A6AD',
    greyLight: '#D1D3D4',
    greyLighter: '#E6E7E8',
    greyLightest: '#F5F6F8',

    // Ticks
    tickGreen: '#1CC88A',
    tickOrange: '#FF7043',
    tickBlue: '#42A5F5',
    tickYellow: '#FFC300',

    // Gradients
    gradientA: ['#4CAF50', '#81C784', '#C8E6C9', '#E6F4EA'],
    gradientB: ['#0A2239', '#1C3B81', '#3B8EA5', '#7FC7D9', '#B2DFDB', '#E0F7FA'],

    // Categorical Ramp (for charts)
    categorical: [
      '#FF8500', '#FFC52F', '#13CB81', '#00C3F6', '#FF6CD0', '#6D40EA',
      '#D01367', '#53AF5C', '#0A97D9', '#CEA041', '#869FF4', '#007DAD'
    ],

    // Utility
    white: '#FFFFFF',
    black: '#000000',
    error: '#D01367',
    success: '#1CC88A',
    warning: '#FFC300',
    info: '#00C3F6',
  },
  typography: {
    fontFamily: {
      primary: 'Lato, sans-serif',
      secondary: 'Lato, sans-serif',
    },
    fontSize: {
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
      extrabold: 800,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  shadows: {
    small: '0 1px 3px rgba(0,0,0,0.12)',
    medium: '0 4px 6px rgba(0,0,0,0.1)',
    large: '0 10px 15px rgba(0,0,0,0.1)',
  },
  button: {
    primary: {
      bg: '#FFC300',
      bgHover: '#F6A900',
      text: '#0E2B3E',
      disabledBg: 'rgba(255, 195, 0, 0.6)',
      disabledText: 'rgba(14, 43, 62, 0.6)',
      borderRadius: '4px',
      fontWeight: 700,
      transition: 'background 250ms ease-in',
    },
    secondary: {
      bg: '#FFFFFF',
      bgHover: '#F1F4FB',
      text: '#0E2B3E',
      border: '2.5px solid #F1F4FB',
      disabledBg: 'rgba(255,255,255,0.6)',
      disabledText: 'rgba(14, 43, 62, 0.6)',
      borderRadius: '4px',
      fontWeight: 700,
      transition: 'background 250ms ease-in',
    },
    icon: {
      bg: '#FFFFFF',
      border: '2.5px solid #F1F4FB',
      icon: '#0E2B3E',
      borderRadius: '4px',
      transition: 'background 250ms ease-in',
    },
  },
  dropdown: {
    bg: '#FFFFFF',
    border: '2px solid #F1F4FB',
    borderRadius: '4px',
    boxShadow: '0 2px 8px 0 rgba(14, 43, 62, 0.06)',
    label: '#0E2B3E',
    labelFontWeight: 600,
    labelFontSize: '0.95rem',
    optionBg: '#FFFFFF',
    optionHoverBg: '#F1F4FB',
    optionSelectedBg: '#F1F4FB',
    optionText: '#0E2B3E',
    optionSelectedDot: '#0E2B3E',
    optionDisabledText: '#B0B8C1',
    icon: '#0E2B3E',
    transition: 'background 200ms ease',
    padding: '12px 16px',
    minWidth: '180px',
    zIndex: 30,
  },
  // Add more theme properties as needed
};

export const systemChangeLabTheme: Theme = {
  name: 'System Change Lab',
  colors: {
    primary: '#2E7D32',
    secondary: '#388E3C',
    background: '#FFFFFF',
    text: '#212121',
    accent: '#FF6D00',
    success: '#43A047',
    warning: '#FFA000',
    error: '#D32F2F',
    // Add more specific colors as needed
  },
  typography: {
    fontFamily: {
      primary: 'Roboto, sans-serif',
      secondary: 'Open Sans, sans-serif',
    },
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
      extrabold: 800,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  shadows: {
    small: '0 1px 3px rgba(0,0,0,0.12)',
    medium: '0 4px 6px rgba(0,0,0,0.1)',
    large: '0 10px 15px rgba(0,0,0,0.1)',
  },
  // Add more theme properties as needed
};

export const ourWorldInDataTheme: Theme = {
  name: 'Our World in Data',
  colors: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    background: '#FFFFFF',
    text: '#1F2937',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    // Add more specific colors as needed
  },
  typography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      secondary: 'Source Sans Pro, sans-serif',
    },
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
      extrabold: 800,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  shadows: {
    small: '0 1px 3px rgba(0,0,0,0.12)',
    medium: '0 4px 6px rgba(0,0,0,0.1)',
    large: '0 10px 15px rgba(0,0,0,0.1)',
  },
  // Add more theme properties as needed
}; 