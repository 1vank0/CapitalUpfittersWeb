// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-black': '#0A0A0B',
        'gunmetal': '#18181B',
        'machined-silver': '#E4E4E7',
        'safety-orange': '#F97316',
        'fleet-blue': '#334155',
      },
      fontFamily: {
        'display': ['Archivo', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'industrial': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'industrial': '0.25rem',
      },
    },
  },
  plugins: [],
}

export default config
