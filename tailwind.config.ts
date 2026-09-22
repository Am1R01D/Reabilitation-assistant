import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#f0f9f8',
          100: '#d9f0ed',
          200: '#b3e1db',
          300: '#7ec9bf',
          400: '#4aaba0',
          500: '#2d9186',
          600: '#22756c',
          700: '#1e5e58',
          800: '#1c4c48',
          900: '#1a403d',
        },
        clinical: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
