/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        abyss: "#0A0A0F",
        surface: "#1A1118",
        "surface-elevated": "#241C22",
        crimson: "#C41A1A",
        "crimson-hover": "#8B1A1A",
        ember: "#E8590C",
        amber: "#F59E0B",
        "forge-teal": "#06B6D4",
        "ash-white": "#F5F0EB",
        "smoke-grey": "#9CA3AF",
        "deep-grey": "#4B5563",
        glass: "rgba(26, 17, 24, 0.7)",
        "glass-border": "rgba(255, 255, 255, 0.05)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["DM Sans", "Geist Sans", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-critical": {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(196, 26, 26, 0.4)" },
          "50%": { boxShadow: "0 0 16px 6px rgba(196, 26, 26, 0.7)" },
        },
        "skeleton-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "pulse-critical": "pulse-critical 2s ease-in-out infinite",
        "skeleton-pulse": "skeleton-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
