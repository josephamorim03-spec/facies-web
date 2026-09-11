import type { Banca } from "@/lib/facies";
import { janela, nomeCurto } from "@/lib/facies";
import { BarrasArea } from "./BarrasArea";
import { ComoCobra, notaComoCobra } from "./ComoCobra";
import { MapaDaProva, type DominioDoAluno } from "./MapaDaProva";
import { CabecalhoLaudo, PainelLaudo } from "./PainelLaudo";
import { PrevisaoDaForma } from "./PrevisaoDaForma";
import { linhaBase, notaDaClassificacao } from "./linhaDaBase";

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

export function FaciesReport({
  banca,
  limiteAssuntos,
  dominio = null,
  pisoDeObservacao = 5,
  comparacao = null,
}: {
  banca: Banca;
  /** A home passa 8; a pagina da banca nao passa, e mostra os 15. E o que faz
   *  "Ver a facies completa" entregar alguma coisa. */
  limiteAssuntos?: number;
  /**
   * O EIXO DO ALUNO: a mesma grade, com a tinta vindo do que ele já mediu.
   *
   * Sem `dominio` a tinta é incidência ("o que a banca cobra"); com ele é o que
   * FALTA. As duas leituras significam ATENÇÃO de propósito — está registrado no
   * `MapaDaProva` —, então a codificação não inverte quando o dado chega.
   *
   * Passando-o, o painel 01 ganha a tarja "tamanho é incidência · preenchimento
   * é você" e a nota de cobertura ("N de M assuntos têm resposta sua"), que é o
   * que impede uma grade meio no piso de parecer "vou mal em metade da prova".
   *
   * ⚠️ HOJE NINGUÉM PASSA. Os três chamadores montam `<FaciesReport banca=…/>` e
   * nada mais: o `/mapa` voltou a ter abas e serve o eixo do aluno pelo mapa
   * navegável, não por aqui. A capacidade fica porque funciona e é barata; não
   * confunda "existe" com "está na tela" — é o erro que este repositório já
   * catalogou como "constante existe ≠ caminho executa".
   *
   * ⚠️ OPT-IN também por segurança: este componente serve a pública
   * `/prova/[slug]`, onde não existe aluno.
   */
  dominio?: DominioDoAluno | null;
  /** Do contrato (`CompetencyMasteryOut.observation_floor`), nunca um literal. */
  pisoDeObservacao?: number;
  /*
   * Havia aqui um `filtroPorArea?: boolean`. Ele saiu, e não é perda:
   * `MapaDaProva` deixou de aceitá-lo quando o filtro por área virou
   * `onSelecionar`/`onAreaMudou` no mapa novo, então repassá-lo quebrava o
   * build e declará-lo sem repassar era pior — uma prop que não faz nada, com
   * um comentário dizendo que não faz nada.
   *
   * Sair não custou comportamento: NENHUM dos três chamadores o passava
   * (`MapaClientPage`, `prova/[slug]/page`, `FaciesPicker`), então ele sempre
   * valeu `false`. Quem quiser o filtro de volta liga os dois callbacks acima —
   * não é ressuscitar este sinalizador.
   */
  /**
   * A comparacao com outra prova, como painel 05.
   *
   * ⚠️ Chega como NO' PRONTO, e nao como dado. `EixoComparar` tem `useState` e
   * `useQuery`, e este arquivo nao tem `"use client"` — ele e' server component
   * no `/prova/[slug]`. Recebendo o no' montado, quem decide o ambiente e' quem
   * chama: sob o `MapaClientPage` tudo ja' e' cliente, e na pagina publica isto
   * chega `null`.
   *
   * ⚠️ HOJE NINGUÉM PASSA, pelo mesmo motivo do `dominio`: o `/mapa` voltou a
   * ter aba "Comparar" própria, e ela monta o `EixoComparar` direto. Quando o
   * painel 05 chegou a existir, ele ficava abaixo de quatro painéis e perdia
   * descoberta — a âncora `#comparar` foi a compensação, e continua aqui para
   * quem religar isto não ter de redescobrir o problema.
   */
  comparacao?: React.ReactNode;
}) {
  // "Com dado" quer dizer COM RESPOSTA: `nao_avaliado` continua no mapa, mas
  // nao conta como medida. Sem nenhuma, o `dominio` nao desce para a grade —
  // uma grade inteira de celulas tracejadas parece defeito, e nao ausencia.
  const assuntos = banca.mais_cai.linhas;
  const comDado = dominio
    ? assuntos.filter((linha) => {
        const meu = dominio.get(linha.rotulo);
        return !!meu && meu.certeza !== "nao_avaliado";
      }).length
    : 0;
  const dominioVivo = comDado > 0 ? dominio : null;

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

      {/* AS DECISOES DO GERADOR VIRARAM UM "?", e nao sumiram.

          Elas precisam existir: sem elas o numero da base muda de tamanho sem
          explicacao -- a SES-DF cai de 2.987 para 596 quando o seletivo de
          especialidade sai da conta -- e o leitor que faz a conta por edicao
          encontra um numero que nao e 100 e nao tem como saber por que.

          Mas como paragrafo fixo elas ocupavam a linha inteira logo abaixo do
          cabecalho, em toda banca, para uma duvida que a maioria nao tem. Como
          `<details>` ficam a um toque de quem tem, e fora do caminho de quem
          nao tem.

          `<details>` e nao popover: esta e uma pagina de server component, e o
          elemento nativo abre sem JavaScript, funciona com teclado e e' lido
          corretamente por leitor de tela sem nenhum `aria-*` escrito a mao. */}
      <details className="group border-b border-rule px-5 py-2 sm:px-6">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted transition hover:text-ink [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-control border border-edge font-mono text-micro leading-none"
          >
            ?
          </span>
          <span>De onde vem este número</span>
        </summary>
        <div className="mt-2 max-w-[68ch] space-y-1 text-xs text-muted">
          <p>
            Só o <span className="text-ink">acesso direto</span>. Os seletivos com
            pré-requisito (R+ de Clínica, Cirurgia, Pediatria e afins) são provas
            diferentes, com conteúdo diferente, e somá-los descreveria uma prova que
            ninguém faz.
          </p>
          <p>
            As <span className="text-ink">anuladas contam aqui</span> — elas foram
            cobradas na prova, e a leitura mede o que a prova cobrou. Na hora de
            treinar elas ficam de fora.
          </p>
          <p>
            Por isso o total dividido pelos anos raramente dá um número redondo: as
            edições variam de tamanho, e nem toda prova de todo ano foi publicada.
          </p>
        </div>
      </details>

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
          /**
           * ⚠️ O DENOMINADOR VAI POR EXTENSO, e isto é correção de um defeito
           * que o operador encontrou lendo a tela.
           *
           * A nota dizia "553 questões classificadas · 99% da base", logo abaixo
           * de um cabeçalho que diz "593 questões". Quem faz a conta obtém
           * 553/593 = 93%, não 99% — porque `cobertura` é medida contra as
           * VÁLIDAS, não contra o total. Conferido nas 138 bancas do dataset:
           * `cobertura === base / (questoes_total - questoes_anuladas)`, sem
           * exceção.
           *
           * A palavra "base" carregava essa troca em silêncio. Agora os dois
           * números aparecem e a conta fecha na tela: 553 + 4 = 557 válidas, e
           * 557 + 36 anuladas = 593. É a mesma regra que a `FolhaDoAssunto`
           * impõe — percentual sem denominador visível é afirmação sem sujeito.
           */
          nota={notaDaClassificacao(banca)}
        >
          {/* MAPA, e nao a lista numerada.
              Os dois mostram `mais_cai`, mas a lista pedia leitura linha a
              linha para responder "o que pesa mais aqui" — e a resposta e
              justamente a forma. No mapa a prova inteira cabe num olhar, e o
              bloco vira a peca que circula em print. A ordem nao se perde: ela
              e o tamanho, e a posicao exata aparece no clique. */}
          {assuntos.length > 0 ? (
            <>
              {/* A regra do `12b`, e só quando ela vale: sem domínio a tinta é
                  incidência, e anunciar "preenchimento é você" seria falso. */}
              {dominioVivo ? (
                <p className="paper-eyebrow mb-2">
                  tamanho é incidência · preenchimento é você
                </p>
              ) : null}
              <MapaDaProva
                linhas={assuntos}
                limite={limiteAssuntos}
                dominio={dominioVivo}
                pisoDeObservacao={pisoDeObservacao}
              />
              {/* A COBERTURA VAI NA TELA. O aluno tem domínio medido em alguns
                  subtemas e em outros não, e uma grade onde metade das células
                  está no piso por falta de dado parece uma grade onde ele vai
                  mal em metade da prova. Esta frase separa as duas leituras. */}
              {dominioVivo ? (
                <p className="mt-3 text-nota text-muted">
                  Quanto mais escuro, mais falta. {comDado} de {assuntos.length}{" "}
                  assuntos têm resposta sua; a partir de {pisoDeObservacao}{" "}
                  respostas o assunto deixa de ser estimado e passa a ser medido.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">
              Base insuficiente para listar assuntos nesta banca.
            </p>
          )}
          {banca.mais_cai.cobertura < 60 ? (
            <p className="mt-3 text-sm text-muted">
              {/* Mesmo cuidado da nota acima: a porcentagem é sobre as válidas,
                  e dizer só "desta banca" convida a dividir pelo total. */}
              A classificação por assunto cobre {banca.mais_cai.cobertura.toFixed(0)}% das
              questões não anuladas desta
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
          nota={notaComoCobra(banca)}
        >
          <ComoCobra banca={banca} />
        </PainelLaudo>

        {/* 04 — a previsao de FORMA.
            Vem por ULTIMO de proposito: os paineis 01-03 descrevem o que a banca
            JA' cobrou (leitura do acervo), e este e' o unico que afirma algo
            sobre a prova que ainda nao existe. Misturar as duas coisas na mesma
            altura da pagina apagaria a diferenca entre medir e prever.

            Das cinco saidas testadas fora de amostra, foi a unica aprovada
            (3,5 pp de erro medio). Banca com menos de 3 edicoes cai no ramo que
            declara o motivo, em vez de sumir. */}
        <PrevisaoDaForma numero="04" institutionKey={banca.institution_key} />

        {/* 05 — comparar com outra prova. Era a terceira aba.
            Vem DEPOIS da previsão porque os painéis 01-04 são todos sobre ESTA
            banca, e este é o único que traz uma segunda. A âncora existe porque
            fundir as abas custou descoberta: como aba ela estava no topo, aqui
            está abaixo de quatro painéis, e `/mapa#comparar` é o que devolve o
            acesso direto que a aba dava. */}
        {comparacao ? (
          <PainelLaudo
            numero="05"
            titulo="Comparar com outra prova"
            nota="duas provas com o mesmo edital cobram diferente"
          >
            <div id="comparar" className="scroll-mt-24">
              {comparacao}
            </div>
          </PainelLaudo>
        ) : null}
      </div>
    </div>
  );
}
