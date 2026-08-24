import type { Banca } from "@/lib/facies";
import { janela, PISO_N_CELULA } from "@/lib/facies";
import { MosaicoAreas } from "./MosaicoAreas";

/**
 * A Fácies da prova, em DOIS painéis — eram quatro.
 *
 * ## Por que os dois que saíram saíram
 *
 * "Como as questões são feitas" (01) e "Leitura" (04) foram removidos. O
 * primeiro listava formatos em que a banca se afasta da média nacional, e para
 * a maioria das bancas a resposta era "segue o padrão" — verdadeiro, e sem
 * nenhuma consequência sobre o que estudar. O segundo era prosa gerada sobre os
 * mesmos números que os painéis restantes já mostram.
 *
 * O custo não era só espaço: o 01 empurrava o mosaico, que é a peça que se
 * compartilha, para a terceira dobra da página.
 *
 * ## O que sobra, e por que nesta ordem
 *
 * `measure_raio_x_readiness.py` mediu a sobreposição do top-15 entre pares de
 * bancas (Jaccard):
 *
 *     especialidade ... 1,00  -> todas as bancas têm o MESMO top-7
 *     tema ............ 0,67
 *     subtema ......... 0,20  -> aqui mora a fácies
 *
 * Por isso "o que mais cai" (subtema) vem primeiro: é o único painel que mostra
 * uma tela diferente para cada banca. A distribuição por área vem depois e é
 * declarada como CONTEXTO na própria nota — ela não discrimina, mas é a peça
 * que o olho lê de relance e a que circula em print.
 */

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="paper-eyebrow">
      {children}
    </span>
  );
}

function Painel({
  numero,
  titulo,
  nota,
  children,
}: {
  numero: string;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Rotulo>{numero}</Rotulo>
        <h3 className="font-serif text-xl/snug font-semibold text-ink lg:text-2xl/snug">{titulo}</h3>
        {nota ? <span className="text-sm text-muted lg:text-base">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}


export function FaciesReport({ banca }: { banca: Banca }) {

  return (
    <div className="rounded-surface border border-edge bg-surface">
      {/* Cabeçalho de laudo: toda leitura declara a base de onde saiu. */}
      <header className="flex flex-wrap gap-x-8 gap-y-3 border-b border-rule px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <Rotulo>Banca</Rotulo>
          <b className="text-sm font-semibold text-ink lg:text-base">{banca.nome}</b>
        </div>
        <div className="flex flex-col gap-0.5">
          <Rotulo>Janela</Rotulo>
          <b className="font-mono text-sm text-ink">{janela(banca)}</b>
        </div>
        <div className="flex flex-col gap-0.5">
          <Rotulo>Base</Rotulo>
          <b className="font-mono text-sm text-ink">
            {banca.total.toLocaleString("pt-BR")} questões
          </b>
        </div>
        {banca.uf ? (
          <div className="flex flex-col gap-0.5">
            <Rotulo>UF</Rotulo>
            <b className="font-mono text-sm text-ink">{banca.uf}</b>
          </div>
        ) : null}
      </header>

      <div className="px-5 sm:px-6">
        {/* O PAINEL "COMO AS QUESTÕES SÃO FEITAS" SAIU, e o "LEITURA" tambem.

            Os dois eram os painéis 01 e 04. O primeiro listava formatos em que
            a banca se afasta da média nacional; na prática ele dizia, para a
            maioria das bancas, que ela segue o padrão — informação verdadeira e
            sem consequência nenhuma para quem estuda. O segundo era prosa
            gerada sobre os mesmos números que os outros painéis já mostram.

            Nenhum dos dois mudava o que o aluno faria a seguir, e ocupavam as
            duas posições mais caras da página: o 01 empurrava o mosaico — que é
            a peça que se compartilha — para a terceira dobra.

            O que sobrou são os dois painéis que respondem perguntas de decisão:
            O QUE cai e DE QUE ÁREA. A leitura de formato continua existindo em
            `formatosDistintivos` e na página da banca, para quem for atrás. */}
        {/* ── PAINEL 2 — a fácies propriamente dita ─────────────────────── */}
        <Painel
          numero="01"
          titulo="O que mais cai"
          nota={`${banca.mais_cai.base.toLocaleString("pt-BR")} questões classificadas · ${banca.mais_cai.cobertura.toFixed(0)}% da base`}
        >
          {banca.mais_cai.linhas.length > 0 ? (
            <ol className="grid gap-0">
              {banca.mais_cai.linhas.map((linha, indice) => (
                <li
                  key={linha.rotulo}
                  className="flex items-baseline gap-3 border-b border-rule py-2 last:border-b-0"
                >
                  <span className="w-7 shrink-0 font-mono text-sm text-muted">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-base/snug text-ink lg:text-lg/snug">{linha.rotulo}</span>
                  {/* Sem `n`, sem número. É a invariante do §14.2.3. */}
                  {linha.exibivel ? (
                    <span className="font-mono text-base tabular-nums text-ink lg:text-lg">{linha.n}</span>
                  ) : (
                    <span className="text-sm text-muted">
                      menos de {PISO_N_CELULA}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">
              Base insuficiente para listar assuntos nesta banca.
            </p>
          )}
          {banca.mais_cai.cobertura < 60 ? (
            <p className="mt-3 text-sm text-muted">
              A classificação por assunto cobre {banca.mais_cai.cobertura.toFixed(0)}% desta
              banca. A lista descreve essa parte, não a prova inteira.
            </p>
          ) : null}
        </Painel>

        {/* ── PAINEL 3 — contexto. Não discrimina (Jaccard 1,00). ───────── */}
        <Painel
          numero="02"
          titulo="Distribuição por área"
          nota="contexto · quase igual em todas as bancas"
        >
          {/* Mosaico, e não sete barras.
              A incidência por área é a única coisa desta página que é
              genuinamente uma PARTE DO TODO, e o olho lê área muito mais rápido
              que comprimento de barra. De quebra, é o painel que dá cor à
              página: as sete grandes áreas já têm paleta própria, e ela estava
              sendo desperdiçada num painel inteiro em petróleo. */}
          <MosaicoAreas linhas={banca.areas.linhas} />
        </Painel>
      </div>
    </div>
  );
}
