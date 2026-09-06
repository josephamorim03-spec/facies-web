"use client";

/**
 * "Baixar em PDF" — a saída ebook da Revisão Final (V1).
 *
 * ## Por que `window.print()` e não um gerador de PDF
 *
 * A decisão (D9 da spec) foi V1 sem dependência nova: a página JÁ é o ebook, e o
 * navegador a transforma em PDF ("Imprimir → Salvar como PDF") sem nenhuma lib
 * de render no caminho. Um PDF gerado em servidor (weasyprint/reportlab) daria
 * mais controle, mas adiciona dependência que a regra do repo exige autorizar — e
 * coloca render de PDF no request path. O V2 fica para depois do ciclo.
 *
 * O botão some na impressão (`print:hidden`): ele é ação, não conteúdo.
 */
export function BotaoImprimirPdf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="paper-control inline-flex min-h-11 items-center rounded-control border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-surfaceMuted print:hidden"
    >
      Baixar em PDF
    </button>
  );
}
