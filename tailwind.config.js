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
          ob: "var(--area-ob)",
        },
      },
      // `sans` aponta para a MONO de propósito. `body` já faz `@apply font-sans`,
      // então todo o chrome (menus, rótulos, números, botões, status bar) vira
      // mono nesta única linha, sem editar componente nenhum.
      //
      // A prosa NÃO segue junto: `.paper-reading` declara `--font-serif`
      // explicitamente. Bloco de texto clínico que dependa do sans padrão vira
      // mono silenciosamente — é a varredura por tela da fase de telas.
      fontFamily: {
        sans: [
          "var(--font-mono)",
          "ui-monospace",
          "\"Cascadia Mono\"",
          "Consolas",
          "monospace",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "\"Cascadia Mono\"",
          "Consolas",
          "monospace",
        ],
        serif: ["var(--font-serif)", "Georgia", "\"Times New Roman\"", "serif"],
      },
      // Escala de raio e elevação ligada aos tokens (globals.css) — use estas
      // (rounded-control/surface/hero, shadow-soft/overlay) em vez de rounded-sm/md
      // e shadow-sm/md avulsos, para manter a identidade única.
      // No KROS/DOS os três raios valem 0: não existe canto arredondado.
      borderRadius: {
        control: "var(--radius-control)",
        surface: "var(--radius-surface)",
        hero: "var(--radius-hero)",
      },
      boxShadow: {
        soft: "var(--soft-shadow)",
        overlay: "var(--overlay-shadow)",
      },
    },
  },
  plugins: [],
};
