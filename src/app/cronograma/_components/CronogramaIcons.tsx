/**
 * Icones do cronograma — reexportacao de `lucide-react`, nao desenho proprio.
 *
 * Este arquivo ja foi dezesseis SVGs escritos a mao, depois virou pixel art, e
 * agora e' traco de 1.5px. O que nao muda e' a regra: uma fonte so. Desenho
 * proprio ao lado de importado garante que os dois divirjam na proxima mexida.
 *
 * Os nomes locais ficam: oito arquivos consomem `IconCalendar`, `IconEye` e
 * companhia, e trocar a chamada em todos eles seria ruido num commit que e sobre
 * o DESENHO. O apelido documenta o par (nome local -> nome da biblioteca).
 *
 * As duas excecoes ficam no fim do arquivo: `IconMonthGrid` e `IconWeekRow` nao
 * sao icones de conceito, sao MAQUETES das duas visualizacoes do calendario, e
 * nenhuma biblioteca tem esse par.
 */
export {
  Calendar as IconCalendar,
  List as IconList,
  Eye as IconEye,
  Plus as IconPlus,
  RotateCw as IconRefresh,
  // Estetoscopio de verdade. O acervo anterior nao tinha, e o contorno era
  // `Heart` — num produto de medicina, o simbolo generico onde cabia o objeto.
  Stethoscope as IconStethoscope,
  Check as IconCheck,
  TriangleAlert as IconCritical,
  Pencil as IconPencil,
  Menu as IconMenu,
  Search as IconSearch,
  // Prancheta COM visto. O visto era o ponto do icone e faltava no acervo
  // anterior.
  ClipboardCheck as IconClipboardCheck,
  // Pilha de cards. `Layers` e a metafora certa para baralho; o acervo anterior
  // so tinha `Card`, que desenha UMA carta.
  Layers as IconCards,
  X as IconX,
} from "lucide-react";

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
