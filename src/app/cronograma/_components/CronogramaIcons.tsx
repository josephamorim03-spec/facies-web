/**
 * Icones do cronograma — reexportacao de `pixelarticons`, nao desenho proprio.
 *
 * Este arquivo era dezesseis SVGs escritos a mao que COPIAVAM o lucide: traco
 * de 2px com ponta arredondada, curvas de Bezier, circulos suaves. Redesenha-los
 * um a um seria refazer o mesmo erro com outro gosto; a biblioteca ja resolve o
 * problema no grid de 24x24 sem antisserrilhado.
 *
 * Os nomes locais ficam: oito arquivos consomem `IconCalendar`, `IconEye` e
 * companhia, e trocar a chamada em todos eles seria ruido num commit que e sobre
 * o DESENHO. O apelido documenta o par (nome local -> nome da biblioteca).
 *
 * As duas excecoes ficam no fim do arquivo: `IconMonthGrid` e `IconWeekRow` nao
 * sao icones de conceito, sao MAQUETES das duas visualizacoes do calendario, e
 * nenhuma biblioteca tem esse par. Eles ja eram retangulos — so perderam o raio.
 */
export {
  Calendar as IconCalendar,
  ListBox as IconList,
  Eye as IconEye,
  Plus as IconPlus,
  Reload as IconRefresh,
  // Nao ha estetoscopio no acervo. `Heart` e o simbolo clinico que existe, e o
  // sitio de uso e sempre rotulado em texto ao lado.
  Heart as IconStethoscope,
  Check as IconCheck,
  WarningDiamond as IconCritical,
  Pencil as IconPencil,
  Menu as IconMenu,
  Search as IconSearch,
  // Nao ha "prancheta com visto"; `ClipboardNote` e a prancheta que existe.
  ClipboardNote as IconClipboardCheck,
  Card as IconCards,
  Close as IconX,
} from "pixelarticons/react";

/** Maquete da visao de mes: a grade 3x3 de dias. */
export function IconMonthGrid({ className }: { className?: string }) {
  const positions = [3, 10, 17];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {positions.flatMap((y) =>
        positions.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" />),
      )}
    </svg>
  );
}

/** Maquete da visao de semana: a fileira unica de dias. */
export function IconWeekRow({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {[2, 7.5, 13, 18.5].map((x) => (
        <rect key={x} x={x} y="10" width="3.5" height="4" />
      ))}
    </svg>
  );
}
