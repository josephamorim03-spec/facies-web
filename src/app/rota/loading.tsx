import { LoadBar } from "@/components/ui/LoadBar";

/**
 * Mesma forma da pagina real. Este arquivo descrevia o layout ANTIGO — linha de
 * base, grade 2x2 de modos, numero grande com barra — e nada disso existe no
 * passo de entrada de hoje. Skeleton que descreve outra tela faz a estrutura
 * trocar quando os dados chegam, que e' o defeito que ele deveria evitar.
 *
 * A forma real: titulo, pergunta de tempo com quatro atalhos, pergunta de
 * energia com tres, e o botao. Nada mais.
 */
export default function KrosLoading() {
  return (
    <div className="border-b border-edge pb-4" aria-label="Carregando o Kros" aria-busy="true">
      <LoadBar label="Lendo sua rotina e seu acervo" className="w-full max-w-xs" />

      <div className="paper-skeleton mt-4 h-7 w-48" />

      <div className="paper-skeleton mt-5 h-4 w-40" />
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="paper-skeleton h-10 w-20" />
        <div className="paper-skeleton h-10 w-20" />
        <div className="paper-skeleton h-10 w-20" />
        <div className="paper-skeleton h-10 w-24" />
      </div>

      <div className="paper-skeleton mt-6 h-4 w-44" />
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="paper-skeleton h-10 w-24" />
        <div className="paper-skeleton h-10 w-24" />
        <div className="paper-skeleton h-10 w-24" />
      </div>

      <div className="paper-skeleton mt-6 h-11 w-44" />
    </div>
  );
}
