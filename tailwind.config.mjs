/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Monaspace Neon", "SFMono-Regular", "ui-monospace", "monospace"],
      },
      colors: {
        axon: {
          bg: "#07090f",
          panel: "#0d111a",
          border: "#1d2432",
          text: "#e4e9f2",
          muted: "#8994a8",
          cyan: "#76cce0",
          green: "#9ed072",
          pink: "#fc5d7c",
        },
      },
    },
  },
  plugins: [],
};
