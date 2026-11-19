import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';

export const DEFAULT_APPEARANCE = Object.freeze({
  mode: 'system',
  primaryColor: '#5b5bd6',
  secondaryColor: '#111827',
  accentColor: '#8b5cf6',
  successColor: '#16a36a',
  dangerColor: '#dc3f4f',
  warningColor: '#d89016',
  infoColor: '#2583d8',
  sidebarColor: '#111827',
  navbarColor: '#ffffff',
  backgroundColor: '#f6f7fb',
  cardColor: '#ffffff',
  borderColor: '#e4e7ec',
  tableHeaderColor: '#f7f8fa',
  hoverColor: '#f1f3f7',
  linkColor: '#4f46e5',
  iconColor: '#667085',
  fontFamily: 'Inter',
  fontSize: 14,
  headingScale: 1,
  lineHeight: 1.5,
  letterSpacing: 0,
  fontWeight: 400,
  borderRadius: 10,
  density: 'comfortable',
  sidebarWidth: 248,
  contentWidth: 1600,
  navbarHeight: 64,
  gapScale: 1,
  animationSpeed: 1,
  shadowIntensity: 0.7,
  blurIntensity: 12,
  glassEffect: false,
});

const ThemeContext = createContext(null);
const COLOR_KEYS = new Set([
  'primaryColor', 'secondaryColor', 'accentColor', 'successColor', 'dangerColor',
  'warningColor', 'infoColor', 'sidebarColor', 'navbarColor', 'backgroundColor',
  'cardColor', 'borderColor', 'tableHeaderColor', 'hoverColor', 'linkColor', 'iconColor',
]);
const validHex = (value) => /^#[0-9a-f]{6}$/i.test(value);

const isLightColor = (hex) => {
  if (!hex || typeof hex !== 'string') return true;
  const c = hex.replace('#', '');
  if (c.length !== 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
};

export const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return [91, 91, 214];
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return [91, 91, 214];
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
};

export const rgbToHex = (r, g, b) => {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, '0')).join('')}`;
};

export const blendColors = (hex1, hex2, ratio = 0.5) => {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex(
    r1 * (1 - ratio) + r2 * ratio,
    g1 * (1 - ratio) + g2 * ratio,
    b1 * (1 - ratio) + b2 * ratio,
  );
};

export const adjustLightness = (hex, percent) => {
  const [r, g, b] = hexToRgb(hex);
  if (percent > 0) {
    return rgbToHex(
      r + (255 - r) * (percent / 100),
      g + (255 - g) * (percent / 100),
      b + (255 - b) * (percent / 100),
    );
  }
  const factor = (100 + percent) / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
};

export const generateThemeWaveColors = (appearance) => {
  const primary = appearance?.primaryColor || DEFAULT_APPEARANCE.primaryColor;
  const accent = appearance?.accentColor || appearance?.linkColor || DEFAULT_APPEARANCE.accentColor;
  return [
    adjustLightness(accent, 22),
    accent,
    primary,
    blendColors(primary, accent, 0.45),
    adjustLightness(primary, -12),
  ];
};

const resolveAppearance = (appearance) => {
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const dark = appearance.mode === 'dark' || (appearance.mode === 'system' && systemDark);
  if (!dark) {
    return {
      ...appearance,
      dark,
      backgroundColor: !isLightColor(appearance.backgroundColor) ? DEFAULT_APPEARANCE.backgroundColor : appearance.backgroundColor,
      cardColor: !isLightColor(appearance.cardColor) ? DEFAULT_APPEARANCE.cardColor : appearance.cardColor,
      navbarColor: !isLightColor(appearance.navbarColor) ? DEFAULT_APPEARANCE.navbarColor : appearance.navbarColor,
      sidebarColor: appearance.sidebarColor || DEFAULT_APPEARANCE.sidebarColor,
      borderColor: !isLightColor(appearance.borderColor) ? DEFAULT_APPEARANCE.borderColor : appearance.borderColor,
      tableHeaderColor: !isLightColor(appearance.tableHeaderColor) ? DEFAULT_APPEARANCE.tableHeaderColor : appearance.tableHeaderColor,
      hoverColor: !isLightColor(appearance.hoverColor) ? DEFAULT_APPEARANCE.hoverColor : appearance.hoverColor,
    };
  }
  return {
    ...appearance,
    dark,
    backgroundColor: isLightColor(appearance.backgroundColor) ? '#0b0f17' : appearance.backgroundColor,
    cardColor: isLightColor(appearance.cardColor) ? '#111827' : appearance.cardColor,
    navbarColor: isLightColor(appearance.navbarColor) ? '#111827' : appearance.navbarColor,
    sidebarColor: '#111827',
    borderColor: isLightColor(appearance.borderColor) ? '#1f2937' : appearance.borderColor,
    tableHeaderColor: isLightColor(appearance.tableHeaderColor) ? '#151c28' : appearance.tableHeaderColor,
    hoverColor: isLightColor(appearance.hoverColor) ? '#1b2533' : appearance.hoverColor,
  };
};

const toCssVariables = (appearance) => {
  const waveColors = generateThemeWaveColors(appearance);
  const sbColor = appearance.sidebarColor || DEFAULT_APPEARANCE.sidebarColor;
  const isLightSb = isLightColor(sbColor);

  return {
    '--erp-primary': appearance.primaryColor,
    '--erp-orange': appearance.primaryColor,
    '--erp-orange-dark': appearance.primaryColor,
    '--erp-secondary': appearance.secondaryColor,
    '--erp-accent': appearance.accentColor,
    '--erp-green': appearance.successColor,
    '--erp-red': appearance.dangerColor,
    '--erp-yellow': appearance.warningColor,
    '--erp-blue': appearance.infoColor,
    '--erp-wave-1': waveColors[0],
    '--erp-wave-2': waveColors[1],
    '--erp-wave-3': waveColors[2],
    '--erp-wave-4': waveColors[3],
    '--erp-wave-5': waveColors[4],
    '--erp-sidebar-bg': sbColor,
    '--erp-sidebar-text': isLightSb ? '#334155' : 'rgba(255, 255, 255, 0.75)',
    '--erp-sidebar-text-hover': isLightSb ? '#0f172a' : '#ffffff',
    '--erp-sidebar-icon': isLightSb ? '#64748b' : 'rgba(255, 255, 255, 0.55)',
    '--erp-sidebar-title': isLightSb ? '#94a3b8' : 'rgba(255, 255, 255, 0.45)',
    '--erp-sidebar-title-logo': isLightSb ? '#0f172a' : '#ffffff',
    '--erp-sidebar-border': isLightSb ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
    '--erp-sidebar-hover': isLightSb ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
    '--erp-sidebar-card-bg': isLightSb ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
    '--erp-sidebar-card-border': isLightSb ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
    '--erp-navbar-bg': appearance.navbarColor,
    '--erp-bg': appearance.backgroundColor,
    '--erp-surface': appearance.cardColor,
    '--erp-border': appearance.borderColor,
    '--erp-table-head': appearance.tableHeaderColor,
    '--erp-surface-hover': appearance.hoverColor,
    '--erp-link': appearance.linkColor,
    '--erp-icon': appearance.iconColor,
    '--erp-radius': `${appearance.borderRadius}px`,
    '--erp-sidebar-width': `${appearance.sidebarWidth}px`,
    '--erp-content-width': `${appearance.contentWidth}px`,
    '--erp-navbar-height': `${appearance.navbarHeight}px`,
    '--erp-gap-scale': appearance.gapScale,
    '--erp-animation-speed': appearance.animationSpeed,
    '--erp-shadow-alpha': appearance.shadowIntensity,
    '--erp-blur': `${appearance.blurIntensity}px`,
    '--erp-font-size': `${appearance.fontSize}px`,
    '--erp-heading-scale': appearance.headingScale,
    '--erp-line-height': appearance.lineHeight,
    '--erp-letter-spacing': `${appearance.letterSpacing}em`,
    '--erp-font-weight': appearance.fontWeight,
    '--erp-font-family': appearance.fontFamily === 'System UI'
      ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : `"${appearance.fontFamily}", Inter, ui-sans-serif, system-ui, sans-serif`,
    '--erp-navy': appearance.dark ? '#f3f4f6' : '#17233c',
    '--erp-navy-2': appearance.dark ? '#f8fafc' : '#101828',
    '--erp-muted': appearance.dark ? '#a7b0c0' : '#667085',
    '--erp-subtle': appearance.dark ? '#7f8a9d' : '#98a2b3',
    '--erp-border-strong': appearance.dark ? '#36445a' : '#d3d9e2',
  };
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveTimer = useRef(null);
  const appearanceRef = useRef(DEFAULT_APPEARANCE);
  const cacheKey = user?._id ? `teamhub.appearance.pending.${user._id}` : '';

  const readPendingAppearance = useCallback(() => {
    if (!cacheKey) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      localStorage.removeItem(cacheKey);
      return null;
    }
  }, [cacheKey]);

  const apply = useCallback((next) => {
    const root = document.documentElement;
    const resolved = resolveAppearance(next);
    Object.entries(toCssVariables(resolved)).forEach(([key, value]) => root.style.setProperty(key, value));
    root.classList.toggle('dark', resolved.dark);
    root.dataset.density = next.density;
    root.dataset.glass = String(Boolean(next.glassEffect));
  }, []);

  useEffect(() => {
    appearanceRef.current = appearance;
    apply(appearance);
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handleSystemTheme = () => {
      if (appearance.mode === 'system') apply(appearance);
    };
    media?.addEventListener?.('change', handleSystemTheme);
    return () => media?.removeEventListener?.('change', handleSystemTheme);
  }, [appearance, apply]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!user) {
      setAppearance(DEFAULT_APPEARANCE);
      setSaveError('');
      return undefined;
    }
    let active = true;
    const pending = readPendingAppearance();
    if (pending) setAppearance({ ...DEFAULT_APPEARANCE, ...pending });
    setLoading(true);
    api.get('/api/users/preferences/me')
      .then(async ({ data }) => {
        if (!active) return;
        const serverAppearance = data?.appearance || {};
        const next = { ...DEFAULT_APPEARANCE, ...serverAppearance, ...(pending || {}) };
        setAppearance(next);
        if (pending) {
          await api.patch('/api/users/preferences/me', { appearance: next });
          localStorage.removeItem(cacheKey);
        }
        setSaveError('');
      })
      .catch(() => {
        if (active) {
          setAppearance({
            ...DEFAULT_APPEARANCE,
            ...(user.preferences?.appearance || {}),
            ...(pending || {}),
          });
          setSaveError('Changes are saved on this device and will sync when the server is available.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [cacheKey, readPendingAppearance, user?._id]);

  const updateAppearance = useCallback((updates, { persist = true } = {}) => {
    const cleaned = Object.fromEntries(Object.entries(updates).filter(([key, value]) => (
      !COLOR_KEYS.has(key) || validHex(value)
    )));
    const next = { ...appearanceRef.current, ...cleaned };
    appearanceRef.current = next;
    setAppearance(next);
    if (!persist || !user || !cacheKey) return;

    localStorage.setItem(cacheKey, JSON.stringify(next));
    setLoading(true);
    setSaveError('');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await api.patch('/api/users/preferences/me', { appearance: appearanceRef.current });
        localStorage.removeItem(cacheKey);
        setSaveError('');
      } catch {
        setSaveError('Changes are saved on this device and will sync when the server is available.');
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [cacheKey, user]);

  const resetAppearance = useCallback(async () => {
    setAppearance(DEFAULT_APPEARANCE);
    appearanceRef.current = DEFAULT_APPEARANCE;
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(DEFAULT_APPEARANCE));
    if (user) {
      setLoading(true);
      try {
        await api.patch('/api/users/preferences/me', { appearance: DEFAULT_APPEARANCE });
        if (cacheKey) localStorage.removeItem(cacheKey);
        setSaveError('');
      } catch {
        setSaveError('Defaults are applied on this device and will sync when the server is available.');
        throw new Error('Unable to sync appearance defaults');
      } finally {
        setLoading(false);
      }
    }
  }, [cacheKey, user]);

  const value = useMemo(() => ({
    appearance, updateAppearance, resetAppearance, loading, saveError,
  }), [appearance, updateAppearance, resetAppearance, loading, saveError]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
