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
          bg: "#0a0c10",
          "bg-light": "#ffffff",
          panel: "#0f1117",
          "panel-light": "#f5f5f5",
          border: "#1e2433",
          "border-light": "#e5e5e5",
          text: "#eef2ff",
          "text-light": "#171717",
          muted: "#8b95b0",
          "muted-light": "#737373",
          hover: "#1a1f2a",
          "hover-light": "#eaeaea",
          cyan: "#3b82f6",
          green: "#10b981",
          pink: "#ec4899",
        },
      },
    },
  },
  plugins: [],
};
