import Link from "next/link";

/**
 * A PORTA dos gráficos — e ela é uma porta, não uma gaveta vazia.
 *
 * ## O que estava aqui, e por que saiu
 *
 * Uma gaveta rotulada "Gráficos" que abria para TRÊS espaços reservados,
 * anunciando em tracejado o que ainda ia existir: "acerto ao longo do tempo",
 * "acerto por área", "volume por semana".
 *
 * Os três JÁ EXISTEM, servidos em `/estatisticas/graficos`, e já existiam no
 * dia em que a gaveta foi escrita. O link para eles ficava trinta linhas
 * abaixo dela — uma linha de texto fina, depois de um aviso, no fim de 2,6
 * telas de altura.
 *
 * O resultado é o que se esperaria: quem procurava gráficos abria o objeto
 * chamado "Gráficos" e era informado de que eles ainda não tinham sido
 * desenhados. A porta verdadeira era a coisa mais discreta da tela, e o
 * operador deu com ela por acaso.
 *
 * ⚠️ Ausência anunciada é próximo passo. Ausência anunciada ao lado da coisa
 * PRESENTE é uma tela a contradizer-se — e o preço quem paga é quem procura.
 *
 * ## O que NÃO muda
 *
 * **O lugar.** Continua depois dos sete cartões, porque a ordem é o argumento:
 * a tela responde "quanto eu tiraria" primeiro, e só então oferece o gráfico
 * que sustenta a resposta.
 *
 * **A conta de portas: uma.** O link do rodapé saiu junto — a mesma porta duas
 * vezes não é redundância inofensiva, é o aluno a perguntar-se qual das duas o
 * leva a um sítio diferente.
 *
 * **O peso.** É um `h2` sem classe de tamanho, como os sete cartões: a escala
 * vive em `.tela-app h2` (`globals.css`), e é ela que faz esta porta ler como
 * par deles em vez de nota de rodapé. Ver `scripts/check-escala-viva.mjs`.
 *
 * ## ⚠️ O chevron fica FORA do `h2`, e isso é medida, não arrumação
 *
 * Na primeira versão o `›` vivia dentro do heading e herdava os 22px dele —
 * **22/400**, um passo que nenhuma das 22 artboards contém (elas têm 22/600, o
 * do título). O `spec-do-app.mjs` acusou-o com uma ocorrência, em `/evolucao`.
 *
 * Um `<a>` aceita conteúdo de fluxo, então o heading pode viver dentro do link
 * em vez do contrário. O chevron passa a ser irmão dele, em `text-sm` — 14/400,
 * o degrau mais repetido do desenho.
 */
export function PortaDosGraficos() {
  return (
    <section className="rounded-surface border border-edge bg-surface md:col-span-2">
      <Link
        href="/estatisticas/graficos"
        className="paper-control flex min-h-12 items-center justify-between gap-3 px-4 py-4 text-ink hover:text-primary sm:px-5 sm:py-5"
      >
        <div className="min-w-0">
          <h2 className="font-serif font-semibold">Gráficos</h2>
          {/* Os três nomes que a gaveta reservava — agora a dizer o que há do
              outro lado, e não o que falta. */}
          <p className="paper-eyebrow mt-1">acerto no tempo · por área · volume</p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-sm text-muted">
          ›
        </span>
      </Link>
    </section>
  );
}
