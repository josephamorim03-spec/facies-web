import type { Banca } from "@/lib/facies";
import { janela, nomeCurto } from "@/lib/facies";
import { BarrasArea } from "./BarrasArea";
import { ComoCobra } from "./ComoCobra";
import { MapaDaProva } from "./MapaDaProva";
import { CabecalhoLaudo, PainelLaudo } from "./PainelLaudo";

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

/**
 * A linha "Base" — N de M, nunca um número sem denominador.
 *
 * `questoes_total` já conta as anuladas (migration 118), então é o número que
 * bate com a prova, e é ele que a linha mostra quando não há denominador.
 *
 * ⚠️ O PAR COMPARÁVEL É `cobertas` × `declaradas`, nunca `questoes_total` ×
 * `declaradas`. `declaradas` soma só as edições que TÊM denominador, enquanto
 * `questoes_total` conta o acervo inteiro — comparar os dois é comparar
 * conjuntos diferentes, e fazia 65 das 86 bancas caírem no ramo "sem
 * denominador" e perderem a linha em silêncio. Com o par certo, sobram 14.
 *
 * `estimado` é conservador: basta UMA edição vir da moda para o total ser
 * estimativa, e aí a tela diz "estimadas", nunca "declaradas".
 */
function linhaBase(banca: Banca): string {
  const totalTxt = banca.questoes_total.toLocaleString("pt-BR");
  const den = banca.denominador;
  if (!den || den.declaradas == null || den.cobertas == null) {
    return `${totalTxt} questões`;
  }
  const { cobertas, declaradas } = den;
  const declaradasTxt = declaradas.toLocaleString("pt-BR");
  const rotulo = den.estimado ? " estimadas" : " declaradas";

  // SOBRA: temos MAIS do que a prova declarou. É anomalia — ou a moda errou, ou
  // há questão atribuída a uma edição que não a teve. Some da tela era o pior
  // desfecho: some justamente o caso que pede investigação.
  if (cobertas > declaradas) {
    return `${cobertas.toLocaleString("pt-BR")} questões · ${declaradasTxt}${rotulo} nas edições medidas`;
  }
  if (cobertas === declaradas) {
    // "Completa" só vale para a fase que medimos. A UNICAMP fecha as 80
    // objetivas E aplica uma fase dissertativa inteira que a leitura não cobre —
    // dizer "cobertura completa" sem nomeá-la seria a afirmação mais cara desta
    // linha.
    if (den.fase_nao_coberta) {
      return `${totalTxt} questões · fase objetiva completa; a ${den.fase_nao_coberta} não entra nesta leitura`;
    }
    return `${totalTxt} questões · cobertura completa das ${den.edicoes_declaradas} edições medidas`;
  }
  return `${cobertas.toLocaleString("pt-BR")} de ${declaradasTxt} questões${rotulo}`;
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
      <CabecalhoLaudo
        campos={[
          { rotulo: "Banca", valor: nomeCurto(banca) },
          { rotulo: "Janela", valor: janela(banca), mono: true },
          { rotulo: "Base", valor: linhaBase(banca), mono: true },
        ]}
      />

      {/* As DUAS decisoes do gerador, ditas em voz alta — sem elas o numero
          da base muda de tamanho sem explicacao (a SES-DF cai de 2.987 para 596
          quando o seletivo de especialidade sai da conta). */}
      <p className="border-b border-rule px-5 py-2 text-xs text-muted sm:px-6">
        Base de acesso direto, sem os seletivos com pré-requisito. As questões
        anuladas contam na base, mas não entram na prática.
      </p>

      {/* A BANCA MUDOU DE TAMANHO, e a leitura abaixo é de antes da mudança.

          Sem esta linha o aluno da UERN treina o ritmo de uma prova de 90
          questões para uma prova que passou a ter 100 — e nada na tela diria
          por quê. É a única afirmação desta página sobre uma REGRA da banca, e
          não sobre o que ela cobrou, então ela só existe com fonte: o gerador
          não emite `mudanca` quando o valor novo veio da moda das edições. */}
      {banca.mudanca ? (
        <p className="border-b border-rule px-5 py-2 text-xs text-ink sm:px-6">
          <b className="font-semibold">
            A partir de {banca.mudanca.vigente_de} esta prova passou a ter{" "}
            {banca.mudanca.para} questões
          </b>{" "}
          — antes eram {banca.mudanca.de}. A leitura abaixo é das edições
          anteriores.{" "}
          {banca.mudanca.fonte ? (
            <a
              href={banca.mudanca.fonte}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="underline underline-offset-4"
            >
              De onde tiramos isso
            </a>
          ) : null}
        </p>
      ) : null}

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
        <PainelLaudo
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
        </PainelLaudo>

        {/* ── PAINEL 02 — a área contra a média do acervo ───────────────── */}
        <PainelLaudo
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
          nota="a forma desta prova · assunto a assunto no painel 01"
        >
          {/* Barra com a marca da média nacional — ver BarrasArea.tsx para o
              porquê de a comparação não ficar atrás de um clique. */}
          <BarrasArea linhas={banca.areas.linhas} />
        </PainelLaudo>
        {/* ── PAINEL 03 — como a banca monta a questão, quando isso distingue */}
        <PainelLaudo
          numero="03"
          titulo="Como esta banca cobra"
          nota="exato · sem estimativa"
        >
          <ComoCobra banca={banca} />
        </PainelLaudo>

      </div>
    </div>
  );
}
