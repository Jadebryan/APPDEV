import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PALETTES, DEFAULT_PALETTE_ID, type PaletteId, type Palette } from '../theme/palettes';
import { storage } from '../utils/storage';

type ThemeContextValue = {
  palette: Palette;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteIdState] = useState<PaletteId>(DEFAULT_PALETTE_ID);

  useEffect(() => {
    storage.getColorPalette().then((v) => {
      if (v && v in PALETTES) {
        setPaletteIdState(v as PaletteId);
      }
    });
  }, []);

  const setPaletteId = useCallback(async (id: PaletteId) => {
    setPaletteIdState(id);
    await storage.setColorPalette(id);
  }, []);

  const palette = PALETTES[paletteId] ?? PALETTES.run_barbie;

  return (
    <ThemeContext.Provider value={{ palette, paletteId, setPaletteId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
