/**
 * Nilaaya Official Brand Colour System & Design Tokens
 * Premium Hospitality + Modern Property Management
 */

export const NILAAYA_PALETTE = {
  // Official Core Foundation
  olive: '#4F5330', // Primary brand colour
  bone: '#EEE7D7', // Main background colour
  cyan: '#19D3E6', // Accent and interactive colour

  // Supporting palette
  white: '#FFFFFF', // Cards and surfaces
  navy: '#0C192B', // Primary text, titles, headings
  warmBackground: '#F8F2E7', // Light screen background
  cardSurface: '#FFFDF8', // Light cards & inputs
  oliveDark: '#383C22', // Pressed states & deep olive
  oliveLight: '#777B52', // Secondary highlights
  cyanDark: '#0799AA', // Accessible cyan text/icons
  secondaryText: '#657080', // Descriptions & captions
  border: '#E5DDCD', // Borders and dividers

  // Functional alerts
  alertRedBg: '#FFF1F2',
  alertRedBorder: '#FECDD3',
  alertRedText: '#BE123C',
  alertGreenBg: '#F0FDF4',
  alertGreenBorder: '#BBF7D0',
  alertGreenText: '#15803D',
} as const;

export const NILAAYA_THEME = {
  light: {
    background: '#F8F2E7',
    primary: '#4F5330',
    primaryPressed: '#383C22',
    secondaryAccent: '#19D3E6',
    surface: '#FFFDF8',
    surfaceSecondary: '#EEE7D7',
    textPrimary: '#0C192B',
    textSecondary: '#657080',
    border: '#E5DDCD',
  },
  dark: {
    background: '#111B1B',
    primary: '#777B52',
    primaryPressed: '#4F5330',
    secondaryAccent: '#19D3E6',
    surface: '#202C2B',
    surfaceSecondary: '#293531',
    textPrimary: '#F7F5ED',
    textSecondary: '#B3BDB6',
    border: '#35423B',
  },
} as const;
