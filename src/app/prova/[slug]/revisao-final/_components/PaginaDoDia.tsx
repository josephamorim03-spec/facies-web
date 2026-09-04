import {
  AREA_BG_CLASS,
  AREA_BORDER_CLASS,
  AREA_FULL_LABELS,
  type DisplayArea,
} from "@/lib/areaIdentity";
import type { PaginaEducativa, TemaRevisao } from "@/lib/revisao";
import { MedidaDaCobranca } from "./MedidaDaCobranca";

/**
 * Um dia do ebook: uma página de revisão de véspera sobre um assunto.
 *
 * ## A ordem dos blocos é pedagógica, não estética
 *
 * Essencial → como a prova cobra → onde se erra → a estrutura → o que decorar →
 * o checklist. Ela sobe do que cabe em trinta segundos para o que só serve com
 * tempo, porque o leitor da última semana costuma parar no meio — e o que ele
 * leva embora tem de ser o começo, não o que sobrou.
 *
 * O checklist fica por último de propósito: é o bloco que sobrevive à leitura
 * apressada, e é o que ele vai reler no dia da prova.
 *
 * ## Cinco blocos, e não treze
 *
 * A versão anterior deste formato tinha treze. Três diziam a mesma coisa: no
 * piloto, "CEA é seguimento, não rastreamento" aparecia nos conceitos, nas
 * armadilhas E nos quicktips. Cortar não foi perda de conteúdo; foi tirar
 * repetição que fazia a página parecer densa sem ensinar mais nada.
 *
 * ## O aviso de não revisado é do DADO, não da intenção
 *
 * `revisado: false` vem do artefato, carimbado por quem gerou. A página não tem
 * como publicar conteúdo médico não revisado sem o aviso, porque o aviso lê o
 * mesmo campo que a inclusão leu.
 */
export function PaginaDoDia({
  tema,
  pagina,
}: {
  tema: TemaRevisao;
  pagina: PaginaEducativa;
}) {
  const area = ((pagina.area ?? "OU") as DisplayArea) satisfies DisplayArea;
  // Extraído porque `{pagina.dia}` dentro do JSX faz o guard de copy ler
  // "pagina" como a palavra portuguesa sem acento. O identificador não é copy,
  // mas o detector não tem como saber — e um guard que erra para o lado de
  // avisar é melhor que um que deixa "pagina" chegar à tela.
  const numeroDoDia = pagina.dia;
  const estrutura = pagina.estrutura;

  return (
    <section
      aria-labelledby={`tema-${tema.posicao_previsao}`}
      className="print:break-before-page"
    >
      {/* ── cabeceira do dia ─────────────────────────────────────────────── */}
      <header className={`border-l-4 pl-4 ${AREA_BORDER_CLASS[area]}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm text-muted">dia {numeroDoDia}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className={`h-2 w-2 rounded-full ${AREA_BG_CLASS[area]}`} />
            {AREA_FULL_LABELS[area]}
          </span>
          <span className="text-xs text-muted">
            {tema.posicao_previsao}º assunto mais provável
          </span>
          <span className="font-mono text-xs text-muted">
            {tema.questoes.length} questões
          </span>
          {/* O carimbo é a ÚNICA diferença entre os 42, e ele é informação, não
              hierarquia: a aposta publicada com data e hash congelou 30
              posições, e sem dizer isso os doze últimos se passariam por
              prometidos. */}
          {tema.na_aposta_registrada ? null : (
            <span className="paper-eyebrow rounded-control border border-rule px-1.5 py-0.5">
              fora da aposta
            </span>
          )}
        </div>
        <h3
          id={`tema-${tema.posicao_previsao}`}
          className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
        >
          {pagina.subtema}
        </h3>
      </header>

      {!pagina.revisado ? (
        <p className="mt-4 border border-edge bg-surfaceMuted px-4 py-3 text-sm text-ink">
          <span className="paper-eyebrow">rascunho</span>{" "}
          Este texto foi gerado e ainda <strong>não passou por revisão médica</strong>.
          Ele está visível para revisão, não para estudo definitivo.
        </p>
      ) : null}

      {/* ── 1. o essencial ───────────────────────────────────────────────── */}
      <p className="mt-5 max-w-[62ch] font-serif text-lg/[1.6] text-ink sm:text-xl/[1.6]">
        {pagina.resumo_30s}
      </p>

      {/* ── 2. como a prova cobra, com a contagem embaixo ─────────────────── */}
      <div className="mt-6 paper-surface p-4 sm:p-5">
        <h4 className="paper-eyebrow">como a sua prova cobra este assunto</h4>
        <p className="mt-2 max-w-[62ch] text-base/[1.6] text-ink">
          {pagina.como_a_prova_cobra}
        </p>
        <MedidaDaCobranca evidencia={pagina.evidencia} />
      </div>

      {/* ── 3. onde se erra ──────────────────────────────────────────────── */}
      <div className="mt-6">
        <h4 className="paper-eyebrow">onde se erra</h4>
        <ul className="mt-3 space-y-3">
          {pagina.armadilhas.map((armadilha) => (
            <li
              key={armadilha.erro}
              className="grid gap-1 border-l-2 border-rule pl-4 print:break-inside-avoid"
            >
              {/* O erro em cima e a correção embaixo, e não lado a lado: em
                  coluna dupla o olho lê os dois como equivalentes, e um deles
                  está errado. Aqui a correção é sempre a última coisa lida. */}
              <span className="text-base/[1.55] text-muted line-through decoration-muted/40">
                {armadilha.erro}
              </span>
              <span className="text-base/[1.55] text-ink">{armadilha.certo}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── 4. a estrutura: UMA, tabela ou fluxo ──────────────────────────── */}
      {estrutura?.tipo === "tabela" && estrutura.colunas && estrutura.linhas ? (
        <figure className="mt-6 print:break-inside-avoid">
          <figcaption className="paper-eyebrow">{estrutura.titulo}</figcaption>
          {/* A tabela rola dentro do próprio contêiner: a página nunca rola
              na horizontal, e no papel a largura cabe porque a fonte encolhe. */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm print:min-w-0 print:text-xs">
              <thead>
                <tr>
                  {estrutura.colunas.map((coluna) => (
                    <th
                      key={coluna}
                      scope="col"
                      className="border-b border-edge px-3 py-2 text-left align-bottom font-mono text-xs font-semibold text-muted"
                    >
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estrutura.linhas.map((linha) => (
                  <tr key={linha.join("|")} className="border-b border-rule">
                    {linha.map((celula, indice) => (
                      <td
                        key={celula}
                        className={`px-3 py-2 align-top ${
                          indice === 0 ? "text-muted" : "text-ink"
                        }`}
                      >
                        {celula}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      ) : null}

      {estrutura?.tipo === "fluxograma" && estrutura.passos ? (
        <figure className="mt-6 paper-surface p-4 sm:p-5 print:break-inside-avoid">
          <figcaption className="paper-eyebrow">{estrutura.titulo}</figcaption>
          <ol className="mt-3 space-y-2.5">
            {estrutura.passos.map((passo, indice) => (
              <li key={passo} className="flex gap-3 text-base/[1.55] text-ink">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge font-mono text-xs text-muted"
                >
                  {indice + 1}
                </span>
                <span>{passo}</span>
              </li>
            ))}
          </ol>
        </figure>
      ) : null}

      {/* ── 5. o que decorar ─────────────────────────────────────────────── */}
      {pagina.dispositivo_de_memoria ? (
        <div
          className={`mt-6 border-l-4 bg-surfaceMuted p-4 sm:p-5 ${AREA_BORDER_CLASS[area]} print:break-inside-avoid`}
        >
          <p className="paper-eyebrow">para levar decorado</p>
          <p className="mt-2 font-mono text-lg font-semibold text-ink">
            {pagina.dispositivo_de_memoria.frase}
          </p>
          {/* A decodificação não é opcional: é ela que impede a frase curta de
              virar atalho que ensina errado. */}
          <p className="mt-1.5 max-w-[62ch] text-sm/[1.55] text-muted">
            {pagina.dispositivo_de_memoria.decodifica}
          </p>
        </div>
      ) : null}

      {/* ── 6. o checklist, que é o que sobrevive à leitura apressada ─────── */}
      <div className="mt-6 print:break-inside-avoid">
        <h4 className="paper-eyebrow">checklist da véspera</h4>
        <ul className="mt-3 space-y-2">
          {pagina.checklist_vespera.map((item) => (
            <li key={item} className="flex gap-2.5 text-base/[1.55] text-ink">
              <span aria-hidden className="mt-[0.1em] font-semibold text-muted">
                ▢
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── a ponte para as questões reais ────────────────────────────────── */}
      <div className="mt-6 border-t border-rule pt-4">
        <p className="paper-eyebrow">como já cobrou</p>
        <p className="mt-2 max-w-[62ch] text-base/[1.6] text-ink">
          {pagina.exemplo_de_cobranca.descricao}
        </p>
        {pagina.exemplo_de_cobranca.url_banco ? (
          <p className="mt-2 text-sm text-muted">
            As {tema.questoes.length} questões reais deste assunto estão no banco:{" "}
            {/* A URL é impressa por extenso de propósito. No papel um link não
                clica, e um QR num material médico distribuído por WhatsApp
                ensina justamente a escanear código de origem desconhecida —
                enquanto o endereço escrito mostra para onde vai. */}
            <a
              href={pagina.exemplo_de_cobranca.url_banco}
              className="text-ink underline underline-offset-4"
            >
              facies.app{pagina.exemplo_de_cobranca.url_banco}
            </a>
          </p>
        ) : null}
      </div>

      {/* ── as fontes: o que torna a página conferível ────────────────────── */}
      {pagina.fontes.length > 0 ? (
        <div className="mt-5 print:break-inside-avoid">
          <p className="paper-eyebrow">de onde vêm os dados desta página</p>
          <ul className="mt-2 space-y-1">
            {pagina.fontes.map((fonte) => (
              <li key={fonte.id} className="text-xs/[1.5] text-muted">
                <span className="text-ink">{fonte.orgao}</span> — {fonte.titulo}
                {fonte.ano ? `, ${fonte.ano}` : ""}
                {fonte.url ? (
                  <>
                    {" "}
                    <a
                      href={fonte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      fonte primária
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
