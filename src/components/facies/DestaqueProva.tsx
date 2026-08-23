import { LinkDestaque } from "./LinkDestaque";
import type { Prova } from "@/lib/provas";
import { Contagem } from "./Contagem";
import { dec } from "@/lib/decimal";

/**
 * O ENAMED em destaque na home.
 *
 * Por que ele vem antes do seletor de instituições: depois da convergência
 * regulatória, a prova de entrada da maioria dos candidatos é **uma só**. Uma
 * home que abre com uma lista de 141 bancas e não menciona o exame que quase
 * todo mundo vai prestar está organizada pela estrutura do acervo, não pela
 * pergunta de quem chegou.
 *
 * A leitura por instituição continua logo abaixo, porque quem presta USP ou
 * UNIFESP ainda depende dela — vira caso particular, não desaparece.
 *
 * O que este bloco NÃO faz: prometer. Ele mostra profundidade da base e o lift
 * sobre o acaso, que são fatos, e manda para a página onde os dois vêm com o
 * `n` ao lado.
 */
export function DestaqueProva({ prova }: { prova: Prova }) {
  const val = prova.validacao;

  return (
    <section className="rounded-surface border border-edge border-l-2 border-l-primary bg-surface">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-5 py-4 sm:px-6">
        <span className="paper-eyebrow">A prova que quase todo mundo presta</span>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
            {prova.sigla}
          </h2>
          <span className="text-sm text-muted">
            vale para o ENARE e para a 1ª etapa do Revalida
          </span>
        </div>

        {/* A ORDEM aqui é decisão de posicionamento, não de layout.

            Liderava com "2.034 questões rotuladas". O checklist de
            docs/product/positioning.md proíbe liderar com contagem, e a razão é
            precisa: contagem põe o produto no conjunto de comparação "banco de
            questões", onde o piso de mercado é R$29,90 e a assinatura fica cara.
            O conjunto certo é mentoria.

            O lift pode liderar porque não é sobre VOLUME, é sobre ACERTO DE
            PREVISÃO — o top-30 de assuntos acertou 35 das 91 questões da
            aplicação direta, contra 9,7% por acaso. Esse número pertence à
            conversa de mentoria ("isto prevê a sua prova"), não à de acervo.

            As contagens ficam: são a evidência que sustenta a leitura. Só
            deixam de ser a primeira coisa lida. */}
        <div className="mt-5 grid gap-px overflow-hidden rounded-control border border-rule bg-rule sm:grid-cols-3">
          {val.status === "medido" && val.lift ? (
            <div className="bg-paper p-4">
              <div className="font-mono text-2xl leading-tight text-primary">
                {dec(val.lift)}x
              </div>
              <div className="mt-0.5 text-sm text-muted">melhor que o acaso</div>
              {/* O `n` acompanha o número aqui também. Um lift de 4x sem a
                  ressalva de que a base direta é uma edição seria a mesma
                  precisão fabricada que a página inteira recusa. */}
              <div className="mt-2 font-mono text-micro text-muted">
                sobre {val.edicoes_diretas} aplicação direta
              </div>
            </div>
          ) : null}
          <div className="bg-paper p-4">
            <div className="font-mono text-2xl leading-tight text-ink">
              {prova.profundidade.subtemas_mapeados.toLocaleString("pt-BR")}
            </div>
            <div className="mt-0.5 text-sm text-muted">assuntos mapeados</div>
            <div className="mt-2 font-mono text-micro text-muted">
              {prova.formato.alternativas[0]?.n ?? "—"} alternativas por questão
            </div>
          </div>
          <div className="bg-paper p-4">
            <div className="font-mono text-2xl leading-tight text-ink">
              {prova.profundidade.questoes_rotuladas.toLocaleString("pt-BR")}
            </div>
            <div className="mt-0.5 text-sm text-muted">questões rotuladas</div>
            <div className="mt-2 font-mono text-micro text-muted">
              {prova.profundidade.aplicacoes_na_serie} aplicações na série
            </div>
          </div>
        </div>

        <Contagem
          sigla={prova.sigla}
          aplicacao={prova.aplicacao_prevista}
          cadernos={prova.cadernos_previstos}
          aplicacoesDiretas={prova.profundidade.aplicacoes_diretas}
        />

        <LinkDestaque slug={prova.slug} chave={prova.exam_key}>
          Ver a fácies do {prova.sigla}
        </LinkDestaque>
      </div>
    </section>
  );
}
