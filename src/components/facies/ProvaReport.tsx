import type { Prova } from "@/lib/provas";
import { dec } from "@/lib/decimal";
import { BarrasArea } from "./BarrasArea";
import { MapaDaProva, type LinhaDoMapa } from "./MapaDaProva";
import { CabecalhoLaudo, PainelLaudo } from "./PainelLaudo";

/**
 * O laudo de uma prova, com a base composta declarada na própria tela.
 *
 * ## A ordem mudou: LEITURA primeiro, método depois
 *
 * Ela seguia o §5.5 — "profundidade primeiro", porque a prova é nova e o
 * visitante quer saber se há coisa por baixo. O raciocínio vale, mas produzia um
 * efeito que ninguém queria: esta página abria com metodologia enquanto a página
 * de banca abria com a leitura, e quem clicava em "Ver a fácies completa" caía em
 * telas de estrutura diferente conforme tivesse escolhido o ENAMED ou uma
 * institucional.
 *
 * Agora as duas abrem igual — o que mais cai, depois a distribuição por área — e
 * o que é exclusivo da prova (de onde vem a base, e o que autoriza usar provas
 * parecidas) vem depois, como nota de método.
 *
 * ## O PAINEL 01 VIROU MAPA, e era a última divergência de forma
 *
 * Ele era uma lista numerada com as barrinhas da série em cada linha. A banca já
 * mostrava o mesmo dado como mosaico, e a diferença não era de dado — era de
 * componente. Resultado: as duas páginas mais importantes do funil respondiam a
 * mesma pergunta com duas formas visuais, e quem chegava por "ver a fácies
 * completa" não reconhecia a tela.
 *
 * O que a lista fazia melhor não se perdeu, mudou de lugar: as barrinhas da
 * série e a divisão direta/correlatas agora aparecem na leitura ABAIXO do mapa,
 * no clique — que é onde a banca já mostra posição e contagem.
 *
 * ⚠️ `preOrdenado` é obrigatório aqui. `mais_cai.linhas` vem ordenado por
 * `score`, que pesa MAIS o que caiu na própria aplicação direta; o mapa ordena
 * por contagem quando ninguém diz o contrário, e isso apagaria em silêncio a
 * única coisa que a série composta acrescenta.
 *
 * ⚠️ O mapa do ENAMED nasce SEM COR POR ÁREA: `provas.json` não emite `area` por
 * assunto (só `facies.json` emite). Não é bug de render — é campo que o gerador
 * do kbank ainda não produz deste lado. Ver `LinhaDoMapa.area`.
 *
 * O que esta tela recusa a fazer: chamar de "tendência" o que se apoia numa
 * única aplicação direta, e esconder que a validação das fontes correlatas
 * repousa sobre essa mesma aplicação. O §15.4 exige o `n` ao lado do backtest; a
 * mesma cautela vale para o número que autoriza a base composta.
 */

export function ProvaReport({ prova }: { prova: Prova }) {
  const { profundidade: prof, mais_cai: serie, validacao: val } = prova;
  // Apelido curto: o gate de copy em portugues acusa `historico` como texto
  // sem acento, e ele nao tem como saber que e' nome de campo. Renomear no
  // ponto de uso e' mais barato que enfraquecer o gate.
  const serieHistorica = val.status === "medido" ? val.historico : null;
  const correlatos = serie.anos_correlatos.length;

  // O ADAPTADOR: `LinhaSerie` da prova vira `LinhaDoMapa`.
  //
  // `n` é `total_serie` — a contagem CRUA da série, que é um número de questões
  // de verdade. O `score` NÃO entra aqui: ele é um peso, e exibi-lo numa célula
  // ao lado de contagens seria a precisão fabricada que esta página recusa. O
  // score decide a ORDEM (por isso `preOrdenado`), nunca o número na tela.
  const celulas: LinhaDoMapa[] = serie.linhas.map((linha) => ({
    rotulo: linha.rotulo,
    n: linha.total_serie,
    exibivel: linha.exibivel,
    area: null,
    serie: {
      valores: linha.serie,
      correlatos,
      nota: `${linha.diretas} desta prova · ${linha.correlatas} de provas parecidas`,
    },
  }));

  return (
    <div className="rounded-surface border border-edge bg-surface">
      <CabecalhoLaudo
        selo="base composta"
        campos={[
          { rotulo: "Prova", valor: prova.sigla },
          { rotulo: "Série", valor: `${prof.aplicacoes_na_serie} aplicações`, mono: true },
          {
            rotulo: "Base",
            valor: `${prof.questoes_rotuladas.toLocaleString("pt-BR")} questões`,
            mono: true,
          },
        ]}
      />

      <div className="px-5 sm:px-6">
        {/* ── 01 — o que mais cai, pela série composta ─────────────────── */}
        <PainelLaudo
          numero="01"
          titulo="O que mais cai"
          nota={`${serie.universo.toLocaleString("pt-BR")} assuntos na série · as 15 são gratuitas`}
        >
          {celulas.length > 0 ? (
            <MapaDaProva linhas={celulas} preOrdenado />
          ) : (
            <p className="text-sm text-muted">
              Base insuficiente para listar assuntos nesta prova.
            </p>
          )}
          {/* ⚠️ SÓ O QUE O MAPA NÃO DIZ SOZINHO.
              `MapaDaProva` já imprime, na leitura abaixo da grade, o que o
              tamanho significa, que se toca para ver a contagem e o que é um
              bloco tracejado. Eu tinha repetido as três coisas aqui, e a página
              ficou com três parágrafos empilhados dizendo quase o mesmo — que é
              exatamente o entulho que este trabalho existe para tirar.

              O que sobra é o único fato que o mapa NÃO tem como saber: que a
              ordem desta prova é por peso, não por contagem. */}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-[5px] bg-muted opacity-40" />
              provas parecidas · contam menos
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-2 bg-primary" />
              aplicações diretas
            </span>
          </p>
          <p className="mt-2 max-w-[70ch] text-xs text-muted">
            A ordem dá mais peso ao que caiu na própria prova, então um bloco pode ficar
            antes de outro com total maior — as barrinhas do clique mostram de onde veio
            cada uma.
          </p>
        </PainelLaudo>

        {/* ── 02 — a área contra a média do acervo ────────────────────────
            Mesmo componente da página de banca, com a marca da média das bancas
            dentro da barra: "Clínica 37%" não diz se 37% é muito, e sem o
            denominador o painel é decorativo. */}
        <PainelLaudo
          numero="02"
          titulo="Distribuição por área"
          nota="a forma desta prova · assunto a assunto no painel 01"
        >
          <BarrasArea
            linhas={prova.areas.linhas.map((linha) => ({
              rotulo: linha.rotulo,
              n: linha.qtd,
              pct: linha.pct,
            }))}
          />
        </PainelLaudo>

        {/* ── 03 — de onde vem a base (§5.5) ──────────────────────────── */}
        {/* O vocabulário deste painel era todo de dentro de casa — "rotulado",
            "diretas", "correlatas", "aplicações na série". São os nomes dos
            campos do gerador, e nenhum deles é como um estudante fala. O dado é
            o mesmo; muda quem consegue ler. */}
        <PainelLaudo
          numero="03"
          titulo="De onde vem esta leitura"
          nota="o que já foi lido, questão a questão"
        >
          <div className="grid gap-px overflow-hidden rounded-control border border-rule bg-rule sm:grid-cols-3">
            {[
              [
                prof.questoes_rotuladas.toLocaleString("pt-BR"),
                "questões lidas e classificadas",
                `${prof.diretas} do ${prova.sigla} · ${prof.correlatas.toLocaleString("pt-BR")} de provas parecidas`,
              ],
              [
                String(prof.aplicacoes_na_serie),
                "provas analisadas",
                `${prof.aplicacoes_diretas} ${
                  prof.aplicacoes_diretas === 1 ? "é do próprio" : "são do próprio"
                } ${prova.sigla}`,
              ],
              [
                prof.subtemas_mapeados.toLocaleString("pt-BR"),
                "assuntos mapeados",
                `${serie.linhas.length} exibidos aqui`,
              ],
            ].map(([valor, chave, meta]) => (
              <div key={chave} className="bg-paper p-4">
                <div className="font-mono text-2xl leading-tight text-ink">{valor}</div>
                <div className="mt-0.5 text-sm text-muted">{chave}</div>
                <div className="mt-2 font-mono text-micro text-muted">{meta}</div>
              </div>
            ))}
          </div>
        </PainelLaudo>

        {/* O PAINEL DE FORMATO SAIU DAQUI, e o motivo e de DADO, nao de gosto.

            Ele mostrava "X% com 4 alternativas" — ficha tecnica: verdadeira, e
            a pessoa descobre no primeiro minuto de prova. A pagina da banca tem
            o painel equivalente ("Como esta banca cobra"), mas la ele so exibe
            formato que DISTINGUE a banca das outras, por Wilson mais tamanho de
            efeito mais um piso de relevancia.

            Esse painel nao pode existir aqui: `formato.distribuicao` da prova
            tem uma entrada so, `{codigo:"direta"}`, e `formatoDistintivo`
            retorna false para ela por construcao. Nao ha o que comparar — nao
            porque o ENAMED siga o padrao, mas porque a quebra por formato nao
            e emitida para ele. Fingir o painel com a ficha tecnica era
            preencher o buraco com o que sobrava. */}
        {/* ── 04 — a validação, com o n na cara ────────────────────────── */}
        {val.status === "medido" ? (
          <PainelLaudo numero="04" titulo="Por que dá para usar provas parecidas">
            <div className="grid gap-px overflow-hidden rounded-control border border-rule bg-rule sm:grid-cols-3">
              {[
                [`${dec(val.acerto_pct)}%`, "do que a prova cobrou estava no top-30"],
                [`${dec(val.piso_pct)}%`, "é o que uma lista de 30 ao acaso acertaria"],
                [val.lift ? `${dec(val.lift)}x` : "—", "melhor que o acaso"],
              ].map(([valor, chave]) => (
                <div key={chave} className="bg-paper p-4">
                  <div className="font-mono text-2xl leading-tight text-primary">{valor}</div>
                  <div className="mt-1 text-sm text-muted">{chave}</div>
                </div>
              ))}
            </div>
            <p className="paper-reading mt-4 border-l-2 border-accent pl-4 text-sm leading-relaxed text-ink">
              <b>
                Esta conferência foi feita sobre {val.edicoes_diretas} prova do próprio{" "}
                {prova.sigla}, de {val.de} questões.
              </b>{" "}
              Um número bom com base de uma prova só ainda é sorte até prova em contrário, e
              dizemos isso primeiro para que não digam por nós. A regra vale nos dois
              sentidos: se as provas parecidas deixarem de prever bem, elas saem — não se
              ajusta o peso para o número voltar a ser bonito.
            </p>

            {/* O ponto acima é UMA medição. Sem o histórico ao lado, publicá-lo
                é apresentar o melhor caso como se fosse o esperado — e o mínimo
                histórico mostra que houve edição ABAIXO do acaso quando a base
                era pequena. Declarar isso é o que torna o número de capa
                defensável: quem duvida de um ponto medido uma vez tem razão. */}
            {serieHistorica?.status === "medido" ? (
              <div className="mt-4 rounded-control border border-rule bg-surfaceMuted p-4">
                {/* "mediana" e "treinando" saíram, e nenhum dos dois perdeu
                    precisão no caminho.

                    Mediana é o valor do meio: metade das edições ficou acima
                    dele, metade abaixo. Dizer isso por extenso ocupa uma linha e
                    dispensa que o leitor saiba a palavra — e a palavra é o tipo
                    de termo que faz quem não é da área parar de ler, que é
                    exatamente o custo que a página não pode pagar aqui.

                    "Treinando só com o passado" é vocabulário de quem constrói
                    modelo. O que ele quer dizer é que a lista de cada edição foi
                    montada sem olhar a prova que ela ia prever — o que é
                    justamente o ponto, e é mais forte dito assim. */}
                <p className="text-sm text-ink">
                  <b>O mesmo método, testado em {serieHistorica.medicoes} edições anteriores.</b>{" "}
                  Em cada uma, a lista foi montada sem olhar a prova que ela ia prever. Em
                  metade das edições o resultado ficou acima de{" "}
                  <span className="font-mono">{dec(serieHistorica.mediana)}x</span>, e nas{" "}
                  {serieHistorica.recentes} mais recentes ficou entre{" "}
                  <span className="font-mono">
                    {dec(serieHistorica.recentes_minimo)}x e{" "}
                    {dec(serieHistorica.recentes_maximo)}x
                  </span>
                  .
                </p>
                <p className="mt-2 text-sm text-muted">
                  O mínimo já foi{" "}
                  <span className="font-mono">{dec(serieHistorica.minimo)}x</span> — abaixo
                  do acaso — nas edições antigas, quando a base era pequena. O método melhora
                  conforme o acervo cresce, e isso está no número, não na promessa.
                </p>
              </div>
            ) : null}
          </PainelLaudo>
        ) : null}
      </div>
    </div>
  );
}
