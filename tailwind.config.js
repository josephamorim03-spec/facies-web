/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        surface: "var(--color-surface)",
        surfaceMuted: "var(--color-surface-muted)",
        edge: "var(--color-edge)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        primary: "var(--color-primary)",
        primaryInk: "var(--color-primary-ink)",
        accent: "var(--color-accent)",
        accentInk: "var(--color-accent-ink)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        area: {
          go: "var(--area-go)",
          ped: "var(--area-ped)",
          cg: "var(--area-cg)",
          cm: "var(--area-cm)",
          mp: "var(--area-mp)",
          ou: "var(--area-ou)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "sans-serif",
        ],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
