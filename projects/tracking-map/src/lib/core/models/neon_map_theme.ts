export interface NeonMapPalette {
  cyan: string;
  electricBlue: string;
  darkNavy: string;
  graphite: string;
  deepBlueWater: string;
}

export interface NeonMapTheme {
  palette: NeonMapPalette;
  hybridVectorSource: string;
  waterSourceLayer: string;
  buildingSourceLayer: string;
  themeName: string;
}

export const NEON_MAP_THEME: NeonMapTheme = {
  palette: {
    cyan: '#00ffff',
    electricBlue: '#00bfff',
    darkNavy: '#020617',
    graphite: '#111827',
    deepBlueWater: '#050b1a',
  },
  hybridVectorSource: 'maptiler_planet',
  waterSourceLayer: 'water',
  buildingSourceLayer: 'building',
  themeName: 'neon-hud',
};
