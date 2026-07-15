/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0D1117',
          secondary: '#161B22',
          card: '#1C2128',
        },
        border: {
          DEFAULT: '#30363D',
        },
        accent: {
          green: '#16A34A',
          blue: '#0663C1',
          amber: '#D97F06',
          red: '#DC2626',
          purple: '#7C3AED',
        },
        text: {
          primary: '#E6EDF3',
          secondary: '#8B949E',
          muted: '#484F58',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
