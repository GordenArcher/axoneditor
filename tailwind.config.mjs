/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ['"Monaspace Neon"', "SF Mono", "Menlo", "monospace"],
      },
      colors: {
        axon: {
          bg: "#050505",
          "bg-light": "#ffffff",
          panel: "#0a0a0b",
          "panel-soft": "#242426",
          "panel-light": "#f5f5f5",
          border: "#1f1f22",
          "border-light": "#e5e5e5",
          text: "#f4f4f5",
          "text-light": "#171717",
          muted: "#8f8f96",
          "muted-light": "#737373",
          hover: "#141416",
          "hover-light": "#eaeaea",
          cyan: "#d4d4d8",
          green: "#b3b3b3",
          pink: "#8f8f8f",
        },
      },
    },
  },
  plugins: [],
};
