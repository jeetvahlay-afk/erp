import { useMemo } from 'react';
import {
  Check,
  Monitor,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  PageHeader,
  Panel,
  StatusBadge,
  ToolbarButton,
} from '../components/ui/EnterpriseUI';
import { feedback } from '../lib/feedback';
import WaveLoader from '../components/common/WaveLoader';

const palettes = [
  { name: 'Indigo', primaryColor: '#5b5bd6', accentColor: '#8b5cf6', linkColor: '#4f46e5', sidebarColor: '#13112c' },
  { name: 'Ocean', primaryColor: '#087e8b', accentColor: '#22a6b3', linkColor: '#087e8b', sidebarColor: '#0a1d24' },
  { name: 'Emerald', primaryColor: '#168f64', accentColor: '#22b983', linkColor: '#0f7a54', sidebarColor: '#092119' },
  { name: 'Graphite', primaryColor: '#344054', accentColor: '#667085', linkColor: '#344054', sidebarColor: '#101828' },
  { name: 'Coral', primaryColor: '#e85d3f', accentColor: '#f59e73', linkColor: '#cc4b30', sidebarColor: '#1c100e' },
  { name: 'Royal', primaryColor: '#3157c8', accentColor: '#6d75e8', linkColor: '#3157c8', sidebarColor: '#0d1527' },
];

const colorFields = [
  ['primaryColor', 'Primary'],
  ['secondaryColor', 'Secondary'],
  ['accentColor', 'Accent'],
  ['successColor', 'Success'],
  ['dangerColor', 'Danger'],
  ['warningColor', 'Warning'],
  ['infoColor', 'Info'],
  ['sidebarColor', 'Sidebar'],
  ['navbarColor', 'Navbar'],
  ['backgroundColor', 'Background'],
  ['cardColor', 'Card'],
  ['borderColor', 'Border'],
  ['tableHeaderColor', 'Table header'],
  ['hoverColor', 'Hover'],
  ['linkColor', 'Link'],
  ['iconColor', 'Icon'],
];

const RangeField = ({ label, value, min, max, step = 1, suffix = '', onChange }) => (
  <label className="erp-appearance-range">
    <span>
      <strong>{label}</strong>
      <output>
        {value}
        {suffix}
      </output>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

const AppearanceSettings = () => {
  const { appearance, updateAppearance, resetAppearance, loading, saveError } = useTheme();
  const selectedPalette = useMemo(
    () => palettes.find((item) => item.primaryColor?.toLowerCase() === appearance.primaryColor?.toLowerCase())?.name,
    [appearance.primaryColor]
  );

  const reset = async () => {
    const accepted = await feedback.confirm(
      'Reset all appearance and theme customizations to enterprise defaults? Current colors, typography, and layout settings will be replaced.',
      {
        title: 'Reset Theme Defaults',
        confirmLabel: 'Reset to Defaults',
        tone: 'warning',
      }
    );
    if (!accepted) return;
    try {
      await resetAppearance();
      feedback.success('Appearance restored to enterprise defaults.');
    } catch {
      feedback.error('Defaults are applied locally but could not be synced yet.');
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-4.5 w-full max-w-[1920px] mx-auto text-slate-800 dark:text-slate-100 pb-10">
      <PageHeader
        title="Appearance & Theme"
        breadcrumbs={['System & Config', 'Appearance & Theme']}
        actions={
          <>
            <StatusBadge tone={saveError ? 'danger' : loading ? 'warning' : 'success'}>
              {saveError ? 'Saved locally' : loading ? 'Syncing' : 'Saved to profile'}
            </StatusBadge>
            <ToolbarButton icon={RotateCcw} onClick={reset}>
              Reset Defaults
            </ToolbarButton>
          </>
        }
      />

      <div className="erp-appearance-layout">
        <div className="erp-appearance-main space-y-6">
          <Panel title="Theme mode" subtitle="Use a light, dark, or operating-system appearance.">
            <div className="erp-theme-mode-grid">
              {[
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
                ['system', 'System', Monitor],
              ].map(([value, label, Icon]) => (
                <button
                  type="button"
                  key={value}
                  className={appearance.mode === value ? 'active' : ''}
                  onClick={() => updateAppearance({ mode: value })}
                >
                  <span>
                    <Icon size={20} />
                  </span>
                  <strong>{label}</strong>
                  <small>{value === 'system' ? 'Matches this device' : `${label} interface`}</small>
                  {appearance.mode === value && <Check className="check" size={16} />}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Brand palette" subtitle="Choose a curated palette or tune every semantic color.">
            <div className="erp-palette-grid">
              {palettes.map((palette) => (
                <button
                  type="button"
                  key={palette.name}
                  className={selectedPalette === palette.name ? 'active' : ''}
                  onClick={() => updateAppearance(palette)}
                >
                  <span className="erp-palette-swatch">
                    <i style={{ background: palette.primaryColor }} />
                    <i style={{ background: palette.accentColor }} />
                    <i style={{ background: palette.linkColor }} />
                    <i style={{ background: palette.sidebarColor }} title="Sidebar" />
                  </span>
                  <strong>{palette.name}</strong>
                  {selectedPalette === palette.name && <Check size={15} />}
                </button>
              ))}
            </div>
            <div className="erp-color-token-grid">
              {colorFields.map(([key, label]) => (
                <label key={key} className="erp-color-field">
                  <span>{label}</span>
                  <div>
                    <input
                      type="color"
                      value={appearance[key]}
                      onChange={(event) => updateAppearance({ [key]: event.target.value })}
                    />
                    <code>{appearance[key]}</code>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2.5">
                Quick Sidebar Themes
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Dark Navy', color: '#111827' },
                  { label: 'Deep Royal', color: '#0d1527' },
                  { label: 'Deep Indigo', color: '#13112c' },
                  { label: 'Deep Emerald', color: '#092119' },
                  { label: 'Deep Ocean', color: '#0a1d24' },
                  { label: 'Brand Primary', color: appearance.primaryColor },
                  { label: 'Slate 900', color: '#0f172a' },
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => updateAppearance({ sidebarColor: preset.color })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 cursor-pointer transition-all ${
                      appearance.sidebarColor?.toLowerCase() === preset.color?.toLowerCase()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: preset.color }} />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Typography" subtitle="A single scale controls every page, form, table, and modal.">
            <div className="erp-form-grid">
              <div className="erp-field">
                <label>Font family</label>
                <select
                  value={appearance.fontFamily}
                  onChange={(event) => updateAppearance({ fontFamily: event.target.value })}
                >
                  <option>Inter</option>
                  <option>Manrope</option>
                  <option>DM Sans</option>
                  <option>IBM Plex Sans</option>
                  <option>System UI</option>
                </select>
              </div>
              <div className="erp-field">
                <label>Density</label>
                <select
                  value={appearance.density}
                  onChange={(event) => updateAppearance({ density: event.target.value })}
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>
              <RangeField
                label="Base font size"
                value={appearance.fontSize}
                min={12}
                max={18}
                suffix="px"
                onChange={(value) => updateAppearance({ fontSize: value })}
              />
              <RangeField
                label="Heading scale"
                value={appearance.headingScale}
                min={0.85}
                max={1.25}
                step={0.05}
                onChange={(value) => updateAppearance({ headingScale: value })}
              />
              <RangeField
                label="Line height"
                value={appearance.lineHeight}
                min={1.2}
                max={1.8}
                step={0.05}
                onChange={(value) => updateAppearance({ lineHeight: value })}
              />
              <RangeField
                label="Letter spacing"
                value={appearance.letterSpacing}
                min={-0.03}
                max={0.08}
                step={0.01}
                suffix="em"
                onChange={(value) => updateAppearance({ letterSpacing: value })}
              />
            </div>
          </Panel>

          <Panel title="Layout & motion" subtitle="Tune information density without changing individual screens.">
            <div className="erp-appearance-slider-grid">
              <RangeField
                label="Border radius"
                value={appearance.borderRadius}
                min={0}
                max={24}
                suffix="px"
                onChange={(value) => updateAppearance({ borderRadius: value })}
              />
              <RangeField
                label="Sidebar width"
                value={appearance.sidebarWidth}
                min={210}
                max={320}
                suffix="px"
                onChange={(value) => updateAppearance({ sidebarWidth: value })}
              />
              <RangeField
                label="Content width"
                value={appearance.contentWidth}
                min={1100}
                max={1920}
                step={20}
                suffix="px"
                onChange={(value) => updateAppearance({ contentWidth: value })}
              />
              <RangeField
                label="Navbar height"
                value={appearance.navbarHeight}
                min={52}
                max={84}
                suffix="px"
                onChange={(value) => updateAppearance({ navbarHeight: value })}
              />
              <RangeField
                label="Gap scale"
                value={appearance.gapScale}
                min={0.75}
                max={1.5}
                step={0.05}
                onChange={(value) => updateAppearance({ gapScale: value })}
              />
              <RangeField
                label="Animation speed"
                value={appearance.animationSpeed}
                min={0}
                max={2}
                step={0.1}
                onChange={(value) => updateAppearance({ animationSpeed: value })}
              />
              <RangeField
                label="Shadow intensity"
                value={appearance.shadowIntensity}
                min={0}
                max={1.5}
                step={0.1}
                onChange={(value) => updateAppearance({ shadowIntensity: value })}
              />
              <RangeField
                label="Blur intensity"
                value={appearance.blurIntensity}
                min={0}
                max={30}
                suffix="px"
                onChange={(value) => updateAppearance({ blurIntensity: value })}
              />
              <label className="erp-switch-row">
                <span>
                  <strong>Glass effect</strong>
                  <small>Translucent navigation surfaces</small>
                </span>
                <input
                  type="checkbox"
                  checked={appearance.glassEffect}
                  onChange={(event) => updateAppearance({ glassEffect: event.target.checked })}
                />
              </label>
            </div>
          </Panel>
        </div>

        <aside className="erp-appearance-preview">
          <div className="erp-preview-window">
            <header>
              <i />
              <i />
              <i />
              <span>Live preview</span>
            </header>
            <div className="erp-preview-body">
              <nav>
                <div className="erp-preview-logo" />
                <span className="active" />
                <span />
                <span />
                <span />
              </nav>
              <main>
                <div className="erp-preview-title">
                  <div>
                    <strong>Workforce overview</strong>
                    <span />
                  </div>
                  <button type="button">New employee</button>
                </div>
                <div className="erp-preview-metrics">
                  <article>
                    <span />
                    <strong>248</strong>
                    <small>Employees</small>
                  </article>
                  <article>
                    <span />
                    <strong>94%</strong>
                    <small>Attendance</small>
                  </article>
                  <article>
                    <span />
                    <strong>12</strong>
                    <small>On leave</small>
                  </article>
                </div>
                <section>
                  <div className="erp-preview-table-head" />
                  <div />
                  <div />
                  <div />
                </section>
              </main>
            </div>
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs mt-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Theme Loader</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Equalizer Wave</span>
            </div>
            <div className="py-4 flex items-center justify-center bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <WaveLoader label="Loading live data…" size="md" />
            </div>
          </div>
          <p>
            <SlidersHorizontal size={15} /> Changes apply across every authenticated screen and
            follow your account on any device.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default AppearanceSettings;
