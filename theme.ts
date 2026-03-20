import { MD3LightTheme } from 'react-native-paper';

// Standardized app colors so Expo Go, dev app, and web look the same (avoid dull app appearance)
const PRIMARY = '#1565C0';      // Richer blue
const PRIMARY_CONTAINER = '#BBDEFB';
const SECONDARY = '#2E7D32';    // Green accent
const SECONDARY_CONTAINER = '#C8E6C9';
const TERTIARY = '#E65100';    // Orange accent
const SURFACE = '#FFFFFF';
const SURFACE_VARIANT = '#F5F5F5';
const BACKGROUND = '#FAFAFA';
const OUTLINE = '#E0E0E0';
const ERROR = '#B00020';
const ON_PRIMARY = '#FFFFFF';
const ON_SECONDARY = '#FFFFFF';
const ON_SURFACE = '#1C1B1F';
const ON_SURFACE_VARIANT = '#49454F';
const ON_ERROR = '#FFFFFF';
const OUTLINE_VARIANT = '#CAC4D0';

export const AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: PRIMARY,
    onPrimary: ON_PRIMARY,
    primaryContainer: PRIMARY_CONTAINER,
    onPrimaryContainer: '#0D47A1',
    secondary: SECONDARY,
    onSecondary: ON_SECONDARY,
    secondaryContainer: SECONDARY_CONTAINER,
    onSecondaryContainer: '#1B5E20',
    tertiary: TERTIARY,
    onTertiary: '#FFFFFF',
    surface: SURFACE,
    onSurface: ON_SURFACE,
    surfaceVariant: SURFACE_VARIANT,
    onSurfaceVariant: ON_SURFACE_VARIANT,
    background: BACKGROUND,
    onBackground: ON_SURFACE,
    outline: OUTLINE,
    outlineVariant: OUTLINE_VARIANT,
    error: ERROR,
    onError: ON_ERROR,
    elevation: {
      level0: 'transparent',
      level1: '#F5F5F5',
      level2: '#EEEEEE',
      level3: '#E0E0E0',
      level4: '#BDBDBD',
      level5: '#9E9E9E',
    },
  },
};

// For use in StyleSheet where theme isn't available (e.g. StatusBar, RefreshControl)
export const AppColors = {
  primary: PRIMARY,
  primaryContainer: PRIMARY_CONTAINER,
  secondary: SECONDARY,
  surface: SURFACE,
  background: BACKGROUND,
  outline: OUTLINE,
  error: ERROR,
};
