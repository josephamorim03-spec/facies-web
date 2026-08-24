import type { Banca } from "@/lib/facies";
import { janela, nomeCurto, PISO_N_CELULA, TOTAL_BANCAS } from "@/lib/facies";
import { BarrasArea } from "./BarrasArea";
import { ComoCobra } from "./ComoCobra";
import { MapaDaProva } from "./MapaDaProva";

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
 * O custo não era só espaço: o 01 empurrava a distribuição por área, que é a
 * peça que se compartilha, para a terceira dobra da página.
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
 * Por isso "o que mais cai" (subtema) vem primeiro: é onde a fácies é mais
 * fina. A distribuição por área vem depois — e deixou de ser mero contexto
 * quando ganhou a marca da média do acervo: a USP aparece com Cirurgia +9,9 e
 * Pediatria −6,1, que discrimina bastante. O Jaccard 1,00 é sobre a ORDEM do
 * top-7 ser a mesma, não sobre os PESOS coincidirem — duas afirmações
 * diferentes que a nota antiga confundia.
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


export function FaciesReport({
  banca,
  limiteAssuntos,
}: {
  banca: Banca;
  /** A home passa 8; a pagina da banca nao passa, e mostra os 15. E o que faz
   *  "Ver a facies completa" entregar alguma coisa. */
  limiteAssuntos?: number;
}) {

  return (
    <div className="rounded-surface border border-edge bg-surface">
      {/* Cabeçalho de laudo: toda leitura declara a base de onde saiu.

          ⚠️ O NOME AQUI É O CURTO, e a UF saiu. O cabeçalho repetia o rótulo do
          edital por extenso — que a página já mostra como legenda sob o título —
          e ainda somava um campo "UF: SP" ao lado. Resultado, na mesma tela:

            titulo   ....  USP-SP
            legenda  ....  SP - Universidade de São Paulo - USP - SP (Hospital…
            Banca    ....  SP - Universidade de São Paulo - USP - SP (Hospital…
            UF       ....  SP

          O estado aparecia três vezes e o nome longo duas. Fica UMA de cada: o
          nome por extenso na legenda (identidade legal, uma vez) e o curto aqui,
          que é o que a linha de laudo precisa para dizer de quem é a leitura. A
          UF já vive dentro do nome curto quando ela desambigua. */}
      <header className="flex flex-wrap gap-x-8 gap-y-3 border-b border-rule px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <Rotulo>Banca</Rotulo>
          <b className="text-sm font-semibold text-ink lg:text-base">{nomeCurto(banca)}</b>
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
      </header>

      <div className="px-5 sm:px-6">
        {/* O PAINEL "COMO AS QUESTÕES SÃO FEITAS" SAIU, e o "LEITURA" tambem.

            Os dois eram os painéis 01 e 04. O primeiro listava formatos em que
            a banca se afasta da média nacional; na prática ele dizia, para a
            maioria das bancas, que ela segue o padrão — informação verdadeira e
            sem consequência nenhuma para quem estuda. O segundo era prosa
            gerada sobre os mesmos números que os outros painéis já mostram.

            Nenhum dos dois mudava o que o aluno faria a seguir, e ocupavam as
            duas posições mais caras da página: o 01 empurrava a distribuição
            por área — a peça que se compartilha — para a terceira dobra.

            O que sobrou são os dois painéis que respondem perguntas de decisão:
            O QUE cai e DE QUE ÁREA. A leitura de formato continua existindo em
            `formatosDistintivos` e na página da banca, para quem for atrás. */}
        {/* ── PAINEL 01 — a fácies propriamente dita ────────────────────── */}
        <Painel
          numero="01"
          titulo="O que mais cai"
          nota={`${banca.mais_cai.base.toLocaleString("pt-BR")} questões classificadas · ${banca.mais_cai.cobertura.toFixed(0)}% da base`}
        >
          {/* MAPA, e nao a lista numerada.
              Os dois mostram `mais_cai`, mas a lista pedia leitura linha a
              linha para responder "o que pesa mais aqui" — e a resposta e
              justamente a forma. No mapa a prova inteira cabe num olhar, e o
              bloco vira a peca que circula em print. A ordem nao se perde: ela
              e o tamanho, e a posicao exata aparece no clique. */}
          {banca.mais_cai.linhas.length > 0 ? (
            <MapaDaProva linhas={banca.mais_cai.linhas} limite={limiteAssuntos} />
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

        {/* ── PAINEL 02 — a área contra a média do acervo ───────────────── */}
        <Painel
          numero="02"
          titulo="Distribuição por área"
          // A NOTA ANTERIOR ficou FALSA quando a barra ganhou a média.
          //
          // Ela dizia "contexto · quase igual em todas as bancas", herdado da
          // medição de Jaccard 1,00 — que é sobre a ORDEM do top-7 de
          // especialidades ser a mesma, e não sobre os PESOS coincidirem. Com o
          // risco da média na tela, a própria USP desmente a frase: Cirurgia
          // +9,9 e Pediatria −6,1. Manter a nota seria a página contradizendo o
          // gráfico que ela acabou de desenhar.
          nota={`peso de cada área contra a média das ${TOTAL_BANCAS} bancas`}
        >
          {/* Barra com a marca da média nacional — ver BarrasArea.tsx para o
              porquê de a comparação não ficar atrás de um clique. */}
          <BarrasArea linhas={banca.areas.linhas} />
        </Painel>
        {/* ── PAINEL 03 — como a banca monta a questão, quando isso distingue */}
        <Painel
          numero="03"
          titulo="Como esta banca cobra"
          nota="exato · sem estimativa"
        >
          <ComoCobra banca={banca} />
        </Painel>

      </div>
    </div>
  );
}
