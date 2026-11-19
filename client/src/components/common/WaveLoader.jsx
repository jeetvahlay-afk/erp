import { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

const SIZES = {
  sm: {
    containerHeight: 'h-6',
    barWidth: 'w-1',
    gap: 'gap-1',
    text: 'text-[11px]',
  },
  md: {
    containerHeight: 'h-10',
    barWidth: 'w-1.5',
    gap: 'gap-1.5',
    text: 'text-xs',
  },
  lg: {
    containerHeight: 'h-14',
    barWidth: 'w-2.5',
    gap: 'gap-2',
    text: 'text-sm',
  },
  xl: {
    containerHeight: 'h-20',
    barWidth: 'w-3.5',
    gap: 'gap-2.5',
    text: 'text-base',
  },
};

const MULTI_COLORS = ['#f59e0b', '#f97316', '#ec4899', '#a855f7', '#3b82f6'];

/**
 * 5-Bar Harmonic Wave Equalizer Loader
 * Fluidly animated sound-wave pill bars matching the user's theme or custom palette.
 */
const WaveLoader = ({
  size = 'md',
  label,
  colors,
  variant = 'theme',
  className = '',
  fullScreen = false,
}) => {
  let themeAppearance = null;
  try {
    const themeContext = useTheme();
    themeAppearance = themeContext?.appearance || null;
  } catch {
    themeAppearance = null;
  }

  const resolvedSize = SIZES[size] || SIZES.md;

  const resolvedColors = useMemo(() => {
    if (Array.isArray(colors) && colors.length >= 5) {
      return colors.slice(0, 5);
    }
    if (variant === 'multi') {
      return MULTI_COLORS;
    }
    if (variant === 'semantic' && themeAppearance) {
      return [
        themeAppearance.warningColor || '#d89016',
        themeAppearance.accentColor || '#8b5cf6',
        themeAppearance.dangerColor || '#dc3f4f',
        themeAppearance.primaryColor || '#5b5bd6',
        themeAppearance.infoColor || '#2583d8',
      ];
    }
    // Default theme colors with CSS variable binding
    return [
      'var(--erp-wave-1, var(--erp-accent, #6d75e8))',
      'var(--erp-wave-2, var(--erp-accent, #6d75e8))',
      'var(--erp-wave-3, var(--erp-primary, #3157c8))',
      'var(--erp-wave-4, var(--erp-primary, #3157c8))',
      'var(--erp-wave-5, var(--erp-primary, #2563eb))',
    ];
  }, [colors, variant, themeAppearance]);

  const bars = [
    { key: 1, type: 'outer', color: resolvedColors[0] },
    { key: 2, type: 'inner', color: resolvedColors[1] },
    { key: 3, type: 'center', color: resolvedColors[2] },
    { key: 4, type: 'inner', color: resolvedColors[3] },
    { key: 5, type: 'outer', color: resolvedColors[4] },
  ];

  const content = (
    <div
      className={`inline-flex flex-col items-center justify-center text-center gap-3 select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center justify-center ${resolvedSize.containerHeight} ${resolvedSize.gap}`}
        aria-hidden="true"
      >
        {bars.map((bar) => {
          let animClass = 'erp-wave-bar-outer';
          if (bar.type === 'inner') animClass = 'erp-wave-bar-inner';
          if (bar.type === 'center') animClass = 'erp-wave-bar-center';

          return (
            <span
              key={bar.key}
              className={`erp-wave-bar ${resolvedSize.barWidth} ${animClass}`}
              style={{ backgroundColor: bar.color }}
            />
          );
        })}
      </div>

      {label && (
        <p className={`font-medium text-center text-slate-500 dark:text-slate-400 tracking-normal ${resolvedSize.text}`}>
          {label}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity">
        {content}
      </div>
    );
  }

  return content;
};

export default WaveLoader;
