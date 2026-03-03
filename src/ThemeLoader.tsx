import React, { useEffect } from 'react';
import { api } from './services/api';

interface ThemeLoaderProps {
  storeId: number | null;
  children: React.ReactNode;
}

// Default theme values, matching index.css
const defaultTheme = {
  '--color-primary': '#000000',
  '--color-secondary': '#6366f1',
};

/**
 * Applies a theme by setting CSS custom properties on the root element.
 * @param settings - A record of settings, e.g., { primary_color: '#ff0000' }.
 */
const applyTheme = (settings: Partial<Record<string, string>>) => {
  const root = document.documentElement;

  // Reset to defaults first to handle switching between stores or logging out
  Object.entries(defaultTheme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Apply custom settings from the database
  if (settings.primary_color) {
    root.style.setProperty('--color-primary', settings.primary_color);
  }
  if (settings.secondary_color) {
    root.style.setProperty('--color-secondary', settings.secondary_color);
  }
};

export const ThemeLoader: React.FC<ThemeLoaderProps> = ({ storeId, children }) => {
  useEffect(() => {
    const loadAndApplyTheme = async () => {
      if (storeId) {
        try {
          const settings = await api.getSettings(storeId);
          applyTheme(settings);
        } catch (error) {
          console.error("Failed to load theme settings, using defaults.", error);
          applyTheme({}); // Apply defaults on error
        }
      } else {
        applyTheme({}); // Apply defaults if no storeId
      }
    };

    loadAndApplyTheme();
  }, [storeId]);

  return <>{children}</>;
};