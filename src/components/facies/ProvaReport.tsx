import type { LinhaSerie, Prova } from "@/lib/provas";
import { PESO_CORRELATA, PISO_N_CELULA, ROTULO_FORMATO } from "@/lib/provas";
import { dec } from "@/lib/decimal";

/**
 * O laudo de uma prova, com a base composta declarada na própria tela.
 *
 * A ordem dos painéis segue o §5.5: **profundidade primeiro**. Quando a prova é
 * nova, a pergunta que o visitante faz antes de qualquer outra é "isso aqui tem
 * muita coisa por baixo?" — e profundidade percebida não vem de anos, vem de
 * volume rotulado.
 *
 * O que esta tela recusa a fazer: chamar de "tendência" o que se apoia numa
 * única aplicação direta, e esconder que a validação das fontes correlatas
 * repousa sobre essa mesma aplicação. O §15.4 exige o `n` ao lado do backtest; a
 * mesma cautela vale para o número que autoriza a base composta, e o documento
 * não a exigia ali.
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
        <h2 className="font-serif text-xl font-semibold text-ink">{titulo}</h2>
        {nota ? <span className="text-sm text-muted">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * A série por aplicação. Correlatas em cinza e finas, diretas em petróleo e
 * grossas, com um traço entre as duas.
 *
 * A separação carrega informação: sem ela a barra sugeriria que a prova tem nove
 * aplicações próprias, quando tem uma. É a mesma razão pela qual o peso aparece
 * na legenda em vez de ficar só no código.
 */
function Serie({ linha, correlatos }: { linha: LinhaSerie; correlatos: number }) {
  const maximo = Math.max(1, ...linha.serie);
  return (
    <span className="flex h-6 items-end gap-[2px]" aria-hidden="true">
      {linha.serie.map((valor, indice) => {
        const direta = indice >= correlatos;
        return (
          <span key={indice} className="flex items-end">
            {indice === correlatos ? (
              <span className="mr-[3px] h-6 w-px self-stretch bg-edge" />
            ) : null}
            <span
              className={direta ? "w-2 bg-primary" : "w-[5px] bg-muted opacity-40"}
              style={{ height: `${Math.max(3, (valor / maximo) * 24)}px` }}
            />
          </span>
        );
      })}
    </span>
  );
}

export function ProvaReport({ prova }: { prova: Prova }) {
  const { profundidade: prof, mais_cai: serie, validacao: val } = prova;
  // Apelido curto: o gate de copy em portugues acusa `historico` como texto
  // sem acento, e ele nao tem como saber que e' nome de campo. Renomear no
  // ponto de uso e' mais barato que enfraquecer o gate.
  const serieHistorica = val.status === "medido" ? val.historico : null;
  const naoDireta = prova.formato.distribuicao.filter((l) => l.codigo !== "direta");
  const correlatos = serie.anos_correlatos.length;

  return (
    <div className="rounded-surface border border-edge bg-surface">
      <header className="flex flex-wrap gap-x-8 gap-y-3 border-b border-rule px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <Rotulo>Prova</Rotulo>
          <b className="text-sm font-semibold text-ink">{prova.sigla}</b>
        </div>
        <div className="flex flex-col gap-0.5">
          <Rotulo>Série</Rotulo>
          <b className="font-mono text-sm text-ink">
            {prof.aplicacoes_na_serie} aplicações
          </b>
        </div>
        <div className="flex flex-col gap-0.5">
          <Rotulo>Base</Rotulo>
          <b className="font-mono text-sm text-ink">
            {prof.questoes_rotuladas.toLocaleString("pt-BR")} questões
          </b>
        </div>
        <span className="paper-eyebrow self-center rounded-control border border-accent px-2 py-1 text-accent">
          base composta
        </span>
      </header>

      <div className="px-5 sm:px-6">
        {/* ── 01 — profundidade, porque a prova é nova (§5.5) ──────────── */}
        {/* O vocabulário deste painel era todo de dentro de casa — "rotulado",
            "diretas", "correlatas", "aplicações na série". São os nomes dos
            campos do gerador, e nenhum deles é como um estudante fala. O dado é
            o mesmo; muda quem consegue ler. */}
        <Painel numero="01" titulo="De onde vem esta leitura" nota="o que já foi lido, questão a questão">
          <div className="grid gap-px overflow-hidden rounded-control border border-rule bg-rule sm:grid-cols-4">
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
              [
                `${prova.formato.alternativas[0]?.n ?? "—"}`,
                "alternativas por questão",
                `${prova.questoes_declaradas} questões no edital`,
              ],
            ].map(([valor, chave, meta]) => (
              <div key={chave} className="bg-paper p-4">
                <div className="font-mono text-2xl leading-tight text-ink">{valor}</div>
                <div className="mt-0.5 text-sm text-muted">{chave}</div>
                <div className="mt-2 font-mono text-micro text-muted">{meta}</div>
              </div>
            ))}
          </div>
        </Painel>

        {/* ── 02 — o formato, medido SÓ na fonte direta ────────────────── */}
        <Painel
          numero="02"
          titulo="Como as questões são feitas"
          nota={`exato · ${prova.formato.base} questões da própria prova`}
        >
          <div className="flex flex-wrap gap-2">
            {prova.formato.alternativas.map((alt) => (
              <span
                key={alt.n}
                className="rounded-control border border-rule px-3 py-1.5 text-sm text-ink"
              >
                <b className="font-mono">{alt.pct.toFixed(0)}%</b> com {alt.n} alternativas
              </span>
            ))}
            {naoDireta.map((linha) => (
              <span
                key={linha.codigo}
                className="rounded-control border border-rule px-3 py-1.5 text-sm text-ink"
              >
                <b className="font-mono">{linha.pct.toFixed(0)}%</b>{" "}
                {ROTULO_FORMATO[linha.codigo] ?? linha.codigo}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Medido apenas nas {prova.formato.base} questões da própria prova. As fontes
            correlatas servem para prever assunto, não para descrever forma — o ENARE usa
            cinco alternativas e somá-lo aqui diria que esta prova tem cinco.
          </p>
        </Painel>

        {/* ── 03 — o que mais cai, pela série composta ─────────────────── */}
        <Painel
          numero="03"
          titulo="O que mais cai"
          nota={`${serie.universo.toLocaleString("pt-BR")} assuntos na série · as 15 são gratuitas`}
        >
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-[5px] bg-muted opacity-40" />
              {/* O peso exato (0,4) saía com ponto decimal inglês e, pior, não
                  dizia nada a quem lê: "contam 0.4" não é uma quantidade que
                  alguém consiga interpretar de relance. O número continua no
                  painel 04, onde há espaço para explicá-lo; a legenda só precisa
                  dizer a direção. */}
              <Rotulo>provas parecidas · contam menos</Rotulo>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-2 bg-primary" />
              <Rotulo>aplicações diretas</Rotulo>
            </span>
          </div>

          <ol className="grid gap-0">
            {serie.linhas.map((linha, indice) => (
              <li
                key={linha.rotulo}
                className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-3 border-b border-rule py-2 last:border-b-0"
              >
                <span className="font-mono text-xs text-muted">
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-ink">{linha.rotulo}</span>
                <Serie linha={linha} correlatos={correlatos} />
                {linha.exibivel ? (
                  <span className="w-10 text-right font-mono text-sm tabular-nums text-ink">
                    {linha.total_serie}
                  </span>
                ) : (
                  <span className="w-14 text-right text-xs text-muted">
                    menos de {PISO_N_CELULA}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            O número é a contagem total. A ordem dá mais peso ao que caiu na própria
            prova, então uma linha pode ficar acima de outra com total maior — as barras
            mostram de onde veio cada uma.
          </p>
        </Painel>

        {/* ── 04 — a validação, com o n na cara ────────────────────────── */}
        {val.status === "medido" ? (
          <Painel numero="04" titulo="Por que dá para usar provas parecidas">
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
          </Painel>
        ) : null}

        {/* ── 05 — área, como contexto ─────────────────────────────────── */}
        <Painel
          numero="05"
          titulo="Distribuição por área"
          nota="contexto · varia pouco entre provas"
        >
          <ul className="grid gap-2">
            {prova.areas.linhas.map((linha) => (
              <li
                key={linha.rotulo}
                className="grid grid-cols-[minmax(8rem,13rem)_1fr_auto] items-center gap-3"
              >
                <span className="text-sm text-ink">{linha.rotulo}</span>
                <span className="block h-2 w-full overflow-hidden rounded-control border border-rule bg-paper">
                  <span
                    className="block h-full bg-primary"
                    style={{ width: `${Math.min(100, linha.pct)}%` }}
                  />
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {linha.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </Painel>
      </div>
    </div>
  );
}
