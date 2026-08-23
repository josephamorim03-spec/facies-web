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
        // Filete decorativo. Separado de `edge` porque `edge` desenha limite de
        // componente e responde a 3:1 do WCAG 1.4.11; este nao identifica nada
        // e por isso pode ser a linha delicada da marca.
        rule: "var(--color-rule)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        primary: "var(--color-primary)",
        primaryInk: "var(--color-primary-ink)",
        // Só o acento da wordmark. Separado de `primary` porque tem outro
        // trabalho: `primary` precisa de contraste contra o FUNDO (é botão);
        // este precisa de contraste contra a TINTA ao lado (é uma letra no meio
        // de uma palavra). Reusar o primary dava 1,88:1 e o acento sumia.
        marca: "var(--color-marca)",
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
      // `sans` aponta para a SANS HUMANISTA. `body` já faz `@apply font-sans`,
      // então todo o chrome (menus, rótulos, botões, status bar) muda nesta
      // única linha, sem editar componente nenhum.
      //
      // Antes isto apontava para a mono, de propósito — era a decisão central do
      // KROS/DOS e o mecanismo exato pelo qual a interface lia como terminal de
      // dev em vez de instrumento clínico. A mono continua disponível como
      // `font-mono`, agora restrita ao que ela sempre deveria vestir: número,
      // tempo e percentual.
      //
      // A prosa NÃO segue junto: `.paper-reading` declara `--font-serif`
      // explicitamente.
      // Escala MICRO, abaixo de `text-xs`. Existia como 178 `text-[Npx]` avulsos
      // em quatro degraus — uma escala paralela, sem nome e sem contrato, no
      // rótulo do chrome (eyebrow, status bar, tag de área, legenda de gráfico).
      // Nomear é o que permite auditá-la e mudá-la num lugar só.
      // Um degrau so abaixo de `text-xs`, e ele e' o piso.
      //
      // Eram quatro (11/10/9/8), que nunca foram uma escala — foram quatro
      // valores que apareceram um de cada vez. A Facies comeca em 11px
      // (`--t0`, rotulo mono) e nao desce: abaixo disso o rotulo deixa de ser
      // legivel em celular, que e' onde este produto e' usado.
      fontSize: {
        micro: ["11px", { lineHeight: "1.35" }],
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "\"Segoe UI\"",
          "sans-serif",
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
