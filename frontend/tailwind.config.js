export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#172033',
        },
        brand: {
          50: "#fdf8f6",
          100: "#f2e8e5",
          200: "#eaddd7",
          300: "#e0cec7",
          400: "#d2bab0",
          500: "#c2410c",
          600: "#9a3412",
          700: "#7c2d12",
          800: "#431407",
          900: "#270b04",
          950: "#180602",
        },
        surface: {
          base: "#f8fafc",
          card: "#ffffff",
          elevated: "#ffffff",
          subtle: "#f1f5f9",
          border: "#e2e8f0",
          dark: {
            base: "#0f172a",
            card: "#1e293b",
            elevated: "#334155",
            subtle: "#1e293b",
            border: "#334155",
          }
        },
        action: {
          primary: "#c2410c",
          primaryHover: "#9a3412",
          secondary: "#0284c7",
          secondaryHover: "#0369a1",
          success: "#16a34a",
          successHover: "#15803d",
          warning: "#d97706",
          warningHover: "#b45309",
          danger: "#dc2626",
          dangerHover: "#b91c1c",
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "Monaco", "monospace"],
      },
      transitionDuration: {
        'fast': '140ms',
        'normal': '220ms',
      }
    },
  },
  plugins: [],
};