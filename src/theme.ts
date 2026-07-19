import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  accentText: string;
  danger: string;
  warn: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Palette definitions
// ────────────────────────────────────────────────────────────────────────────

const ROSE: Palette = {
  bg: '#F7ECE6',
  surface: '#FFF7F1',
  surfaceAlt: '#EBDDD5',
  border: '#D8C2BA',
  text: '#3D2731',
  textMuted: '#8C7178',
  accent: '#A4707D',
  accentDim: '#D9B5BC',
  accentText: '#FFF7F1',
  danger: '#B8556A',
  warn: '#D69570',
};

const POP: Palette = {
  bg: '#E5EBF2',         // pale graffiti-paper blue
  surface: '#F5F2EA',     // ivory paper
  surfaceAlt: '#D5DCE8',  // muted lavender-blue
  border: '#1A1A20',      // bold black ink stroke
  text: '#0E0E12',        // deep ink black
  textMuted: '#525261',   // graphite gray
  accent: '#E91E78',      // hot pink magenta from the graffiti
  accentDim: '#F8C8DC',   // pale pink wash
  accentText: '#FFF7E5',  // warm cream
  danger: '#E53935',      // bright red
  warn: '#F4B400',        // golden yellow (her earrings)
};

const GRAPHITE: Palette = {
  bg: '#1A1B1F',          // near-black with cool undertone
  surface: '#26282E',      // dark slate surface
  surfaceAlt: '#34373F',   // lifted slate
  border: '#494D58',       // cool gray edge
  text: '#ECEDF0',         // bright off-white
  textMuted: '#8E929C',    // misty gray
  accent: '#B8C0CC',       // brushed silver / platinum
  accentDim: '#3D4350',    // muted steel
  accentText: '#1A1B1F',   // dark on silver
  danger: '#C75F6F',       // muted rose-red
  warn: '#D4A75B',         // warm gold (mineral hint)
};

const STORM: Palette = {
  bg: '#0B1A2E',           // deep ocean / midnight from satellite
  surface: '#16263F',       // lifted navy panel
  surfaceAlt: '#223653',    // storm-cloud slate-blue
  border: '#3A4F6E',        // wave-foam edge
  text: '#EAF1F8',          // bright cloud white
  textMuted: '#8FA3BC',     // misty gray-blue
  accent: '#5BC8E8',        // vivid cyan (storm eye / lightning)
  accentDim: '#2A4F6B',     // muted teal-deep
  accentText: '#0B1A2E',    // deep navy on cyan
  danger: '#E76A6E',        // warning red — distress flare
  warn: '#F2C25A',          // golden glow on cloud tops
};

export const PALETTES: Record<PaletteName, Palette> = {
  rose: ROSE,
  pop: POP,
  graphite: GRAPHITE,
  storm: STORM,
};

export type PaletteName = 'rose' | 'pop' | 'graphite' | 'storm';

export const PALETTE_LABELS: Record<PaletteName, string> = {
  rose: '🌹 Roses',
  pop: '🎨 Pop Art',
  graphite: '◾ Graphite',
  storm: '🌊 Tempête',
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// ────────────────────────────────────────────────────────────────────────────
// Theme context + provider
// ────────────────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  name: PaletteName;
  colors: Palette;
  setPalette: (name: PaletteName) => void;
  ready: boolean;
}

const STORAGE_KEY = 'calisthenics.palette.v1';
const DEFAULT_PALETTE: PaletteName = 'rose';

const ThemeContext = createContext<ThemeContextValue>({
  name: DEFAULT_PALETTE,
  colors: PALETTES[DEFAULT_PALETTE],
  setPalette: () => undefined,
  ready: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<PaletteName>(DEFAULT_PALETTE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          stored === 'rose' ||
          stored === 'pop' ||
          stored === 'graphite' ||
          stored === 'storm'
        ) {
          setName(stored);
        }
      } catch {
        /* noop */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPalette = useCallback((next: PaletteName) => {
    setName(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ name, colors: PALETTES[name], setPalette, ready }),
    [name, setPalette, ready]
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * Convenience hook: re-runs the styles factory whenever the palette changes.
 * Use it in every screen/component that defined static StyleSheet.create() calls.
 */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}

// ────────────────────────────────────────────────────────────────────────────
// Backwards-compatible static export (used only by code paths that cannot
// access the context — kept pointing at the default palette so types stay
// stable). Prefer useTheme() / useThemedStyles() inside components.
// ────────────────────────────────────────────────────────────────────────────

export const colors: Palette = ROSE;
