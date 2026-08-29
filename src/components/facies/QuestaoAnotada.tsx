"use client";

import { useState } from "react";

import {
  marcasDaProva,
  type Chave,
  type DadosDaProva,
} from "./medidasDaQuestao";

/**
 * A questão anotada com as marcas — artboards `3b` e `4a`.
 *
 * Só a VISTA mora aqui. As medidas, a ordem e o contrato estão em
 * `medidasDaQuestao.ts`, que não é módulo cliente — e a separação não é
 * estética: `TOTAL_DE_MARCAS` exportado daqui chegava ao painel do servidor
 * como um proxy que se serializa em texto de erro, e foi renderizado em 40px
 * no lugar do número. O arquivo vizinho explica o caso inteiro.
 *
 * ## O que a interação faz, e por que ela é o argumento
 *
 * O `4a` descreve o efeito em uma linha: *"os valores passaram a mostrar ESTA
 * questão. A leitura da prova recuou para a linha de apoio."* Trocar de eixo é
 * a demonstração inteira: a mesma medida existe no item e na prova, e é o
 * agregado que vira a "cara". Sem a troca, a seção só lista nomes de medida —
 * que é exatamente o que ela tinha antes.
 *
 * ⚠️ NEM TODA MEDIDA TEM VALOR DE PROVA, e isso não é omissão.
 *
 * O dataset público traz distribuição de formato, alternativas e subtemas
 * mapeados — e mais nada. Palavras do enunciado, negações, imagem e "o que a
 * questão pede" são medidos no backend (`question_analysis.v5`) e não chegam ao
 * dataset da landing. O device de dizer "medida, ainda não publicada" é do
 * próprio design; aqui ele aparece mais vezes do que lá.
 *
 * O EIXO DA QUESTÃO, esse sim, está completo — e é o que salva a interação. A
 * questão é **escrita por nós** (o desenho diz isso na etiqueta), então contar
 * as palavras, as negações e a ausência de imagem dela é leitura direta do
 * texto, não estimativa.
 *
 * ## Toda medida publicada carrega o próprio denominador
 *
 * Isto não é rigor decorativo: era o defeito que fazia a seção parecer errada.
 * Os subtemas são contados sobre a **série** e o formato sobre a **aplicação
 * direta**. Lado a lado sem o denominador, "291 assuntos" e "0% pede a
 * incorreta" leem como contradição — 291 assuntos e nenhuma questão de um tipo
 * inteiro? São bases diferentes, e dizer qual é cada uma resolve a suspeita sem
 * mudar um único número.
 */

/**
 * A questão de exemplo, com o ponto onde cada marca se ancora.
 *
 * `marca` é `Chave`, e é por isso que uma âncora órfã agora não compila.
 */
const ENUNCIADO: { texto: string; marca?: Chave }[] = [
  {
    texto: "Mulher de 28 anos procura a unidade básica com atraso menstrual de 8 semanas",
    marca: "tamanho",
  },
  { texto: ". Refere náuseas matinais, " },
  { texto: "sem", marca: "negacoes" },
  { texto: " sangramento e " },
  { texto: "sem", marca: "negacoes" },
  {
    texto:
      " dor. Pressão arterial de 118 por 74 mmHg. Teste imunológico de gravidez positivo. Qual é a ",
  },
  { texto: "conduta inicial", marca: "pede" },
  { texto: " " },
  { texto: "mais adequada", marca: "incorreta" },
  { texto: " neste momento?" },
];

const ALTERNATIVAS = [
  { letra: "A", texto: "Solicitar ultrassonografia obstétrica e iniciar o pré-natal na mesma consulta" },
  { letra: "B", texto: "Iniciar o pré-natal, solicitar os exames de rotina e agendar retorno" },
  { letra: "C", texto: "Encaminhar ao pré-natal de alto risco para confirmação da idade gestacional" },
  { letra: "D", texto: "Repetir o teste em duas semanas antes de qualquer conduta" },
];

export function QuestaoAnotada({ dados }: { dados: DadosDaProva }) {
  /**
   * DOIS estados, e não um, porque a demonstração precisa funcionar no dedo.
   *
   * Só `onMouseEnter` deixava a interação central desta seção **inexistente no
   * celular** — que é de onde vem quase todo o tráfego de link compartilhado. E
   * inexistente também para quem navega por teclado.
   *
   * `fixada` é o que o clique/toque prende; `sobre` é o hover passageiro do
   * desktop. O clique vence o hover: quem fixou uma medida quer lê-la sem que
   * ela apague quando o ponteiro escorregar para o lado.
   */
  const [fixada, setFixada] = useState<Chave | null>(null);
  const [sobre, setSobre] = useState<Chave | null>(null);
  const [eixo, setEixo] = useState<"prova" | "questao">("prova");
  const ativa = fixada ?? sobre;
  const marcas = marcasDaProva(dados);

  const alternar = (chave: Chave) =>
    setFixada((atual) => (atual === chave ? null : chave));

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* ── A questão ────────────────────────────────────────────────── */}
      <figure className="rounded-surface border border-edge bg-surface p-5 sm:p-6">
        <figcaption className="paper-eyebrow flex flex-wrap items-baseline gap-x-3">
          {/* A ETIQUETA É OBRIGATÓRIA e é do desenho: "escrita por nós".
              Sem ela, um enunciado com marcas de medição em cima lê como
              questão real da prova — e publicar item de banca como se fosse
              nosso é problema de direito autoral, não de estilo. */}
          <span>questão de exemplo · escrita por nós</span>
          <span className="text-marcaViva">{dados.sigla} · formato</span>
        </figcaption>

        <p className="paper-reading mt-4 text-base">
          {ENUNCIADO.map((parte, indice) => {
            if (!parte.marca) return <span key={indice}>{parte.texto}</span>;
            const chave = parte.marca;
            const marca = marcas.find((item) => item.chave === chave);
            const acesa = ativa === chave;
            return (
              <button
                key={indice}
                type="button"
                aria-pressed={fixada === chave}
                aria-label={`medida ${marca?.n}: ${marca?.nome}`}
                onClick={() => alternar(chave)}
                onMouseEnter={() => setSobre(chave)}
                onMouseLeave={() => setSobre(null)}
                onFocus={() => setSobre(chave)}
                onBlur={() => setSobre(null)}
                /* `inline`, e não o `inline-block` padrão do <button>: a
                   primeira marca cobre uma frase inteira ("Mulher de 28 anos
                   … 8 semanas"), e como inline-block ela vira um bloco
                   indivisível que não quebra linha — a 390px isso estoura a
                   caixa da questão. Com `display: inline` o texto flui e
                   quebra como o resto do enunciado. */
                className="paper-control inline text-left align-baseline"
              >
                <mark
                  className={`rounded-control px-0.5 transition ${
                    acesa ? "bg-primary text-primaryInk" : "bg-[color:var(--wash-selecao)] text-ink"
                  }`}
                >
                  {parte.texto}
                  <span aria-hidden="true" className="ml-1 align-super font-mono text-micro">
                    {marca?.n}
                  </span>
                </mark>
              </button>
            );
          })}
        </p>

        <ol className="mt-4 space-y-1.5 text-base text-ink">
          {ALTERNATIVAS.map((alternativa) => (
            <li key={alternativa.letra} className="flex gap-2">
              <span className="font-mono text-muted">{alternativa.letra}</span>
              <span>{alternativa.texto}</span>
            </li>
          ))}
        </ol>
      </figure>

      {/* ── As marcas ────────────────────────────────────────────────── */}
      <div>
        {/* O SELETOR DE EIXO é a interação do artboard `4a`: os valores passam a
            mostrar ESTA questão, e a leitura da prova recua. É a demonstração
            do argumento — a mesma medida existe no item e no agregado, e é o
            agregado que vira a "cara" da prova.

            Sem número no rótulo de propósito: "os nove valores" virou falso no
            dia em que a lista passou a ter sete, e ninguém percebeu. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="paper-eyebrow mr-1">os valores mostram</span>
          {(
            [
              ["prova", "a prova"],
              ["questao", "esta questão"],
            ] as const
          ).map(([chave, rotulo]) => (
            <button
              key={chave}
              type="button"
              aria-pressed={eixo === chave}
              onClick={() => setEixo(chave)}
              className={`paper-control inline-flex min-h-11 items-center rounded-surface border px-3.5 py-2 text-sm font-medium transition ${
                eixo === chave
                  ? "border-primary bg-primary text-primaryInk"
                  : "border-rule bg-transparent text-ink hover:border-muted"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {/* A INSTRUÇÃO É CURTA E EXISTE. Sem ela, a ligação entre a lista e o
            texto marcado só é descoberta por acidente — e no celular, onde não
            há hover para acidentar, não é descoberta nunca. */}
        <p className="mt-2 text-sm text-muted">
          Toque numa medida para ver onde ela aparece na questão.
        </p>

        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {marcas.map((marca) => {
            const acesa = ativa === marca.chave;
            return (
              <li key={marca.chave}>
                <button
                  type="button"
                  aria-pressed={fixada === marca.chave}
                  onClick={() => alternar(marca.chave)}
                  onMouseEnter={() => setSobre(marca.chave)}
                  onMouseLeave={() => setSobre(null)}
                  onFocus={() => setSobre(marca.chave)}
                  onBlur={() => setSobre(null)}
                  className={`paper-control flex w-full gap-3 py-3 text-left transition ${
                    acesa ? "bg-[color:var(--wash-selecao)]" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-micro text-marcaViva"
                  >
                    {marca.n}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base text-ink">{marca.nome}</span>
                    {eixo === "questao" ? (
                      <span className="mt-0.5 block font-mono text-sm text-ink">
                        {marca.naQuestao}
                      </span>
                    ) : marca.naProva ? (
                      <>
                        <span className="mt-0.5 block font-mono text-sm text-ink">
                          {marca.naProva.valor}
                        </span>
                        {/* O DENOMINADOR NUNCA É OPCIONAL no eixo da prova. No
                            eixo da questão ele seria ruído — a base é a questão
                            que está ao lado, visível inteira. */}
                        <span className="mt-0.5 block text-sm text-muted">
                          em {marca.naProva.base}
                          {marca.naProva.regua ? ` · ${marca.naProva.regua}` : ""}
                        </span>
                      </>
                    ) : (
                      /* O device é do próprio desenho, e é o que impede a seção
                         de fingir: o backend mede, o dataset público ainda não
                         publica. */
                      <span className="mt-0.5 block text-sm text-muted">
                        medida, ainda não publicada
                      </span>
                    )}
                    <span className="mt-1 block text-sm text-muted">{marca.porque}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
