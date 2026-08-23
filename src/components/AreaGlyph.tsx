/**
 * O glifo figurativo da área — a quarta fase do `AreaIcon`, e a única em que
 * ilustração se sustenta.
 *
 * As três primeiras fases estão registradas em `AreaIcon.tsx`, e a que morreu
 * por legibilidade morreu por um motivo ESPECÍFICO: as ilustrações não liam a
 * 16px. Essa objeção é sobre tamanho, e some a 44px — que é o único lugar onde
 * este arquivo é usado (o herói de `/hoje`). A sigla continua sendo a verdade em
 * todo o resto do app, e é o `AreaIcon` que decide qual das duas entra.
 *
 * ## Contraste: o glifo é MARCA, e a marca tem piso próprio
 *
 * Desenho na cor da área exige 3:1 (WCAG 1.4.11), e a paleta já passa nesse piso
 * — é o bucket `GRAPHICAL` do `check-contrast-tokens.mjs`. O que continua
 * proibido é a SIGLA na cor da área: como texto o piso vira 4,5:1, e a Okabe-Ito
 * reprovou 29 pares nessa exigência. O raciocínio inteiro está em
 * `lib/areaIdentity.ts`.
 *
 * Por isso o traço recebe a cor e o glifo nunca aparece sozinho: a caixa leva
 * `title` e quem chama leva o rótulo em tinta.
 *
 * ## Traço, não preenchimento
 *
 * Preenchimento chapado a 44px vira mancha e disputa peso com o título ao lado,
 * que é quem carrega a informação. As duas exceções preenchidas são pontos
 * (olhos do bebê, reticências de "Outras"), onde o traço seria um anel vazio.
 */
import type { DisplayArea } from "@/lib/areaIdentity";

/** Traço em unidades do viewBox de 24: a caixa escala, a espessura acompanha. */
const TRACO = 1.6;

const GLIFOS: Record<DisplayArea, React.ReactNode> = {
  // Útero: corpo com fundo abaulado, trompas abrindo para fora e ovários nas
  // pontas. É a forma que a especialidade inteira usa como símbolo.
  GO: (
    <>
      <path d="M7.9 8.6C7.9 7.1 9.7 6.1 12 6.1C14.3 6.1 16.1 7.1 16.1 8.6C16.1 12.2 14.8 15.6 12 18.5C9.2 15.6 7.9 12.2 7.9 8.6Z" />
      <path d="M8.3 7.4C6.6 6 5.4 5.8 4.7 6.8" />
      <path d="M15.7 7.4C17.4 6 18.6 5.8 19.3 6.8" />
      <ellipse cx="3.6" cy="8" rx="1.5" ry="1.25" />
      <ellipse cx="20.4" cy="8" rx="1.5" ry="1.25" />
    </>
  ),
  // Gestante de perfil: OB divide a COR com GO, então precisa divergir na forma,
  // senão as duas ficam indistinguíveis para quem enxerga cor.
  OB: (
    <>
      <circle cx="8.6" cy="4.6" r="2.1" />
      <path d="M8.2 7.6C6.7 10.2 6.5 14.6 7.3 19.6" />
      <path d="M9.4 8C15 8.6 17.4 11.8 16.6 15.2C16 18 12.6 19.7 7.9 19.5" />
    </>
  ),
  PD: (
    <>
      <circle cx="12" cy="12.4" r="7" />
      <path d="M12 5.4C12 3.7 13.3 3 14.2 3.9" />
      <circle cx="9.6" cy="11.2" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="11.2" r="0.95" fill="currentColor" stroke="none" />
      <path d="M9.6 14.9C10.6 16.3 13.4 16.3 14.4 14.9" />
    </>
  ),
  CG: (
    <>
      <path d="M3.6 20.4L10.6 13.4" />
      <path d="M10.6 13.4L16.6 4.6C19 6.1 20 9 19 11.5L13.6 13Z" />
    </>
  ),
  CM: (
    <>
      <path d="M6.2 4.2V9.2C6.2 12.4 8.8 15 12 15C15.2 15 17.8 12.4 17.8 9.2V4.2" />
      <circle cx="6.2" cy="3.2" r="1.2" />
      <circle cx="17.8" cy="3.2" r="1.2" />
      <path d="M12 15V17.2" />
      <circle cx="12" cy="19.4" r="2.2" />
    </>
  ),
  // Coletivo: três pessoas, que é a unidade da medicina preventiva — ela não
  // trata o indivíduo que está na tela, trata a população dele.
  MP: (
    <>
      <circle cx="12" cy="6.4" r="2.3" />
      <path d="M8 18.6C8 14.6 9.8 12.4 12 12.4C14.2 12.4 16 14.6 16 18.6" />
      <circle cx="5.4" cy="9" r="1.9" />
      <path d="M2.2 19C2.2 15.8 3.6 14.2 5.4 14.2" />
      <circle cx="18.6" cy="9" r="1.9" />
      <path d="M21.8 19C21.8 15.8 20.4 14.2 18.6 14.2" />
    </>
  ),
  // "Outras" não é especialidade, é o resto — e reticências é como o resto se
  // escreve. Qualquer desenho aqui inventaria uma identidade que não existe.
  OU: (
    <>
      <circle cx="5.6" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="18.4" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
};

export function AreaGlyph({ area, size }: { area: DisplayArea; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={TRACO}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {GLIFOS[area]}
    </svg>
  );
}
