"use client";

import { useState } from "react";

import {
  marcasDoAcervo,
  type Chave,
  type DadosDoAcervo,
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
 * questão. A leitura recuou para a linha de apoio."* Trocar de eixo é a
 * demonstração inteira: a mesma medida existe no item e no agregado, e é o
 * agregado que vira a "cara". Sem a troca, a seção só lista nomes de medida —
 * que é exatamente o que ela tinha antes.
 *
 * ⚠️ O AGREGADO AQUI É O ACERVO, e não uma prova. Ele já foi o ENAMED, e nesta
 * seção isso punha o laudo de uma prova específica no meio de uma home cuja
 * tese é que a média não serve para ninguém. Ver `SecaoNoveMedidas`.
 *
 * ⚠️ NEM TODA MEDIDA TEM VALOR PUBLICADO, e isso não é omissão.
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
 * Quando os números eram de uma prova, os subtemas vinham da **série** e o
 * formato da **aplicação direta** — e lado a lado sem o denominador, "291
 * assuntos" e "0% pede a incorreta" liam como contradição.
 *
 * Com o acervo, a base é UMA só ("questões com o formato lido"), e ela continua
 * viajando com cada número — em parte porque o defeito era barato de reintroduzir,
 * e em parte porque é ela que dá a escala da afirmação.
 */

/**
 * A questão de exemplo, com o ponto onde cada marca se ancora.
 *
 * `marca` é `Chave`, e é por isso que uma âncora órfã agora não compila.
 */
const ENUNCIADO: { texto: string; marca?: Chave }[] = [
  {
    // A âncora é `dados`, e não `tamanho`: este trecho é a enumeração de
    // achados clínicos — idade, queixa, tempo. `tamanho` é propriedade do
    // enunciado INTEIRO e não tem onde se ancorar sem mentir sobre o recorte.
    texto: "Mulher de 28 anos procura a unidade básica com atraso menstrual de 8 semanas",
    marca: "dados",
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

/**
 * As alternativas também se ancoram — e precisam.
 *
 * `paralelismo` é a única medida cujo objeto NÃO está no enunciado: ela olha as
 * alternativas entre si. Sem âncora aqui, acender "Paralelismo entre
 * alternativas" não destacaria nada na tela, e a lista voltaria a ser uma lista
 * de nomes — que é o defeito que esta seção inteira existe para corrigir.
 *
 * A e B são o par: as duas abrem prescrevendo o pré-natal e divergem no exame
 * que pedem junto. É textualmente o que a medida mede.
 */
const ALTERNATIVAS: { letra: string; texto: string; marca?: Chave }[] = [
  {
    letra: "A",
    texto: "Solicitar ultrassonografia obstétrica e iniciar o pré-natal na mesma consulta",
    marca: "paralelismo",
  },
  {
    letra: "B",
    texto: "Iniciar o pré-natal, solicitar os exames de rotina e agendar retorno",
    marca: "paralelismo",
  },
  { letra: "C", texto: "Encaminhar ao pré-natal de alto risco para confirmação da idade gestacional" },
  { letra: "D", texto: "Repetir o teste em duas semanas antes de qualquer conduta" },
];

export function QuestaoAnotada({ dados }: { dados: DadosDoAcervo }) {
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
  const [eixo, setEixo] = useState<"acervo" | "questao">("acervo");
  /**
   * A questão começa FECHADA, e a razão é de ordem de leitura.
   *
   * Aberta por padrão, a seção põe um enunciado clínico inteiro entre a
   * manchete ("o que ninguém mede") e a lista que a sustenta. Quem chega
   * lê a questão como se ela fosse o assunto — e ela não é: ela é a PROVA do
   * assunto, e prova se oferece a quem já ouviu a afirmação.
   *
   * Fechada, a seção diz o que mede; aberta sob demanda, mostra medindo.
   */
  const [questaoAberta, setQuestaoAberta] = useState(false);
  // A marca só pode estar acesa se houver ONDE ela acenda. Com a questão
  // fechada, `ativa` é sempre nula — ver o bloco sobre o clique inerte abaixo.
  const ativa = questaoAberta ? (fixada ?? sobre) : null;
  const marcas = marcasDoAcervo(dados);

  const alternar = (chave: Chave) =>
    setFixada((atual) => (atual === chave ? null : chave));

  return (
    <div
      /* A ANIMAÇÃO É DE GRADE, e é o truque que evita JavaScript de altura.
         `grid-rows-[0fr]` → `[1fr]` (e as colunas no desktop) são transicionáveis
         porque os dois lados têm o mesmo número de trilhas — o filho leva
         `overflow-hidden` e a altura resolve sozinha, sem medir nada.
         500ms com `ease-out`: some rápido no fim, que é o que faz um movimento
         parecer discreto em vez de lento.

         `motion-reduce:transition-none` não é enfeite de acessibilidade: quem
         liga "reduzir movimento" no sistema costuma ter razão clínica para
         isso, e esta é uma página de medicina. */
      /* `items-start`: sem ele o item de grade estica até a altura da linha, e
         a linha é a da LISTA — que é mais alta que a questão. A caixa da questão
         saía com meia tela de vazio dentro da própria borda. */
      className={`mt-10 grid items-start overflow-hidden transition-[grid-template-rows,grid-template-columns,gap] duration-500 ease-out motion-reduce:transition-none lg:grid-rows-[auto] ${
        questaoAberta
          ? "gap-8 grid-rows-[1fr_auto] lg:grid-cols-[1.1fr_1fr]"
          : // ⚠️ `gap-0` FECHADO, e não `gap-8`. A trilha da questão colapsa em
            // `0fr`, mas o gap NÃO colapsa com ela: sobravam 32px de nada entre
            // uma coluna de largura zero e a lista, empurrando o bloco inteiro
            // para a direita.
            "gap-0 grid-rows-[0fr_auto] lg:grid-cols-[0fr_1fr]"
      }`}
    >
      {/* ── A questão ────────────────────────────────────────────────── */}
      <figure
        /* `inert`, e NÃO `aria-hidden`. A questão fechada continua no DOM, e
           dentro dela há um botão por marca: `aria-hidden` sobre conteúdo
           focável é violação direta — o leitor de tela some com o elemento e o
           Tab continua parando nele, deixando quem navega por teclado num foco
           invisível. `inert` faz as duas coisas de uma vez. */
        inert={!questaoAberta}
        /* `min-w-0` e `min-h-0` são obrigatórios: sem eles o item de grade
           assume a largura/altura do conteúdo e a trilha `0fr` não fecha. */
        /* ⚠️ `h-0` FECHADO, e é o conserto do espaço morto que dominava a seção.
           A trilha da coluna vale `0fr`, mas isso zera a LARGURA, não a altura:
           o enunciado continua no fluxo, espremido a zero, e um parágrafo com
           largura zero quebra a cada caractere — virava uma caixa de ~1.600px de
           altura. Como a linha do grid é `auto` em `lg`, ela crescia junto, e a
           seção terminava com uma tela e meia de nada abaixo da lista. O
           `overflow-hidden` do pai escondia o conteúdo e não a altura, então
           nada disso aparecia como texto: aparecia como vazio.

           `h-0` no próprio elemento tira a altura da conta do grid. A opacidade
           continua fazendo a transição; o que deixa de existir é a caixa. */
        className={`min-h-0 min-w-0 rounded-surface border border-edge bg-surface transition-opacity duration-500 ease-out motion-reduce:transition-none ${
          questaoAberta
            ? "p-5 opacity-100 sm:p-6"
            : "h-0 overflow-hidden border-0 p-0 opacity-0"
        }`}
      >
        <figcaption className="paper-eyebrow flex flex-wrap items-baseline gap-x-3">
          {/* A ETIQUETA É OBRIGATÓRIA e é do desenho: "escrita por nós".
              Sem ela, um enunciado com marcas de medição em cima lê como
              questão real da prova — e publicar item de banca como se fosse
              nosso é problema de direito autoral, não de estilo. */}
          <span>questão de exemplo · escrita por nós</span>
          {/* A etiqueta citava a sigla da prova em destaque ("ENAMED · formato")
              e a seção deixou de ser sobre uma prova. O que ela precisa dizer é
              o EIXO da leitura, que é o que o seletor ao lado troca. */}
          <span className="text-marcaViva">
            {dados.bancas} bancas · formato
          </span>
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
          {ALTERNATIVAS.map((alternativa) => {
            const acesa = alternativa.marca != null && ativa === alternativa.marca;
            return (
              <li
                key={alternativa.letra}
                className={`flex gap-2 rounded-control px-1 transition ${
                  acesa ? "bg-[color:var(--wash-selecao)]" : ""
                }`}
              >
                <span className="font-mono text-muted">{alternativa.letra}</span>
                <span>{alternativa.texto}</span>
              </li>
            );
          })}
        </ol>
      </figure>

      {/* ── As marcas ────────────────────────────────────────────────── */}
      <div>
        {/* O BOTÃO QUE ABRE, e o eixo que só existe depois dele.
            Fechado, "esta questão" apontaria para uma questão que não está na
            tela — um controle que promete uma comparação impossível de ver. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={questaoAberta}
            onClick={() => {
              const abrindo = !questaoAberta;
              setQuestaoAberta(abrindo);
              // Fechar a questão devolve o eixo ao acervo: os valores "desta
              // questão" sem a questão à vista são sete números sem referente.
              if (!abrindo) {
                setEixo("acervo");
                setFixada(null);
              }
            }}
            className="paper-control inline-flex min-h-11 items-center gap-2 rounded-surface border border-primary bg-primary px-3.5 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04]"
          >
            {/* O sinal gira em vez de trocar de glifo: dois caracteres
                diferentes piscam na troca, um que gira lê como o mesmo objeto
                mudando de estado. */}
            <span
              aria-hidden="true"
              className={`inline-block font-mono transition-transform duration-500 ease-out motion-reduce:transition-none ${
                questaoAberta ? "rotate-45" : ""
              }`}
            >
              +
            </span>
            {questaoAberta ? "esconder a questão" : "ver numa questão"}
          </button>

          {/* O SELETOR DE EIXO é a interação do artboard `4a`: os valores passam
              a mostrar ESTA questão, e a leitura do acervo recua. É a
              demonstração do argumento — a mesma medida existe no item e no
              agregado, e é o agregado que vira a "cara" de cada prova.

              Sem número no rótulo de propósito: "os nove valores" virou falso no
              dia em que a lista passou a ter sete, e ninguém percebeu. */}
          <div
            inert={!questaoAberta}
            className={`flex flex-wrap items-center gap-2 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
              questaoAberta ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <span className="paper-eyebrow mx-1">mostrar</span>
            {(
              [
                ["acervo", "o acervo"],
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
        </div>

        {/* A INSTRUÇÃO É CURTA E EXISTE — e só vale com a questão aberta. Sem
            ela, a ligação entre a lista e o texto marcado só é descoberta por
            acidente, e no celular, onde não há hover para acidentar, não é
            descoberta nunca. */}
        <p className="mt-2 text-sm text-muted">
          {questaoAberta
            ? "Toque numa medida para ver onde ela aparece na questão."
            : `As ${marcas.length} medidas, uma a uma. Abra a questão para ver cada uma no texto.`}
        </p>

        {/* ══ A LISTA ══════════════════════════════════════════════════════
            DUAS COLUNAS COM A QUESTÃO FECHADA, uma com ela aberta.
            Fechada, a coluna da questão vale `0fr` e a lista tem a largura
            inteira — nove itens empilhados num filete estreito deixavam metade
            da tela vazia ao lado e faziam a seção ocupar duas rolagens.
            Aberta, ela divide a linha com a questão e volta a uma coluna, senão
            cada item fica com 20 caracteres por linha.

            ⚠️ `divide-y` NÃO funciona em grade de duas colunas — ele desenha a
            borda entre irmãos no fluxo, e numa grade os irmãos ficam lado a
            lado. A régua passa a ser `border-t` por item. */}
        <ul
          className={`mt-4 border-b border-rule ${
            questaoAberta ? "" : "lg:grid lg:grid-cols-2 lg:gap-x-8"
          }`}
        >
          {marcas.map((marca) => {
            const acesa = ativa === marca.chave;

            /* ══ O CLIQUE SÓ EXISTE QUANDO ELE FAZ ALGUMA COISA ═════════════
               Estas linhas eram `<button>` sempre. Com a questão fechada, o
               clique acendia a própria linha e mais nada — porque o que ele
               deveria destacar (a âncora dentro do enunciado) não está na tela.
               Um controle que responde ao dedo sem produzir efeito visível lê
               como interface quebrada, e o cursor de mão prometia a interação
               antes de ela ser possível.

               Fechada, a lista é conteúdo: `<div>`, sem `aria-pressed`, sem
               foco, sem hover. O único controle é "ver numa questão", logo
               acima — que é exatamente o passo que falta. */
            const conteudo = (
              <>
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
                  ) : marca.noAcervo ? (
                    <>
                      <span className="mt-0.5 block font-mono text-sm text-ink">
                        {marca.noAcervo.valor}
                      </span>
                      {/* O DENOMINADOR NUNCA É OPCIONAL no eixo do acervo. No
                          eixo da questão ele seria ruído — a base é a questão
                          que está ao lado, visível inteira. */}
                      <span className="mt-0.5 block text-sm text-muted">
                        em {marca.noAcervo.base}
                        {marca.noAcervo.regua ? ` · ${marca.noAcervo.regua}` : ""}
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
              </>
            );

            return (
              <li key={marca.chave} className="border-t border-rule">
                {questaoAberta ? (
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
                    {conteudo}
                  </button>
                ) : (
                  <div className="flex w-full gap-3 py-3 text-left">{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
