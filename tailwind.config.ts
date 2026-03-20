import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1B2B6B',
        accent: '#F5C842',
        secondary: '#6B7280',
        page: '#F8F9FC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.06)',
        'btn': '0 4px 12px rgba(27,43,107,0.3)',
        'accent': '0 4px 12px rgba(245,200,66,0.4)',
        'navbar': '0 2px 8px rgba(0,0,0,0.12)',
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
