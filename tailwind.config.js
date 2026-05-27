/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        edge: "var(--color-edge)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        area: {
          go: "#f472b6",
          ped: "#2293cf",
          cg: "#ef4444",
          cm: "#2fc767",
          mp: "#f59e0b",
          ou: "#AEAEA8",
        },
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
