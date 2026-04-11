/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0d1117",
          secondary: "#161b22",
          card: "#1c2230",
        },
        accent: {
          DEFAULT: "#f0b429",
          light: "#fcd34d",
          dark: "#c88c00",
        },
        // keep these for backward-compat with admin
        gold: { DEFAULT: "#f0b429", light: "#fcd34d", dark: "#c88c00" },
        amber: "#f59e0b",
        emerald: "#22c55e",
        wizard: {
          purple: "#7c3aed",
          "purple-light": "#a78bfa",
          "purple-dark": "#5b21b6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Barlow Condensed", "sans-serif"],
        brand: ["Barlow Condensed", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.45s ease forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      boxShadow: {
        card: "0 2px 16px rgba(0,0,0,0.35)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.5)",
        accent: "0 4px 20px rgba(240,180,41,0.3)",
      },
    },
  },
  plugins: [],
};
