import type { Config } from 'tailwindcss'

/**
 * Product / command-palette direction.
 *
 * Palette: true neutral grays with a faint cool cast (not pure #000/#fff),
 * crisp hairlines, one electric accent. The scale is built so adjacent steps
 * are perceptually even — surfaces stack from canvas (`bg`) up through raised
 * panels (`panel`, `raised`) with hairline borders in between. This is the
 * Linear / Raycast / Vercel material: dense, calm, fast.
 *
 * Colors are authored as CSS custom properties (assets/css/main.css) so the
 * exact same values drive both Tailwind and hand-written CSS, and a single
 * source of truth governs the whole UI.
 */
export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './composables/**/*.ts',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces — canvas up to the highest-elevation overlay.
        bg: 'var(--bg)',
        'bg-subtle': 'var(--bg-subtle)',
        panel: 'var(--panel)',
        raised: 'var(--raised)',
        overlay: 'var(--overlay)',

        // Hairlines + structure.
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',

        // Ink — text from primary down to faint.
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        'fg-subtle': 'var(--fg-subtle)',
        'fg-faint': 'var(--fg-faint)',

        // One electric accent + its support roles.
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-fg': 'var(--accent-fg)',
        'accent-bg': 'var(--accent-bg)',

        // Status hues, used sparingly.
        positive: 'var(--positive)',
        warn: 'var(--warn)',
      },
      fontFamily: {
        sans: [
          'InterVariable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        // Tuned product scale (ratio ~1.25), tighter than browser defaults.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        // Soft, layered elevation — no harsh single drop shadow.
        panel: '0 1px 2px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.22)',
        palette:
          '0 0 0 1px var(--line-strong), 0 12px 32px -8px rgba(0,0,0,0.55), 0 24px 64px -16px rgba(0,0,0,0.45)',
        focus: '0 0 0 1px var(--accent), 0 0 0 4px var(--accent-bg)',
      },
      transitionTimingFunction: {
        // One house curve, page-wide (L1 invariant 3).
        house: 'cubic-bezier(0.16, 1, 0.3, 1)',
        // A controlled, non-cartoon spring for the palette open.
        spring: 'cubic-bezier(0.22, 1.18, 0.36, 1)',
      },
      keyframes: {
        'palette-in': {
          from: { opacity: '0', transform: 'translateY(-6px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'palette-in': 'palette-in 0.26s cubic-bezier(0.22, 1.18, 0.36, 1)',
        'overlay-in': 'overlay-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
