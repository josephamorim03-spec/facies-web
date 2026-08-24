"use client";

import { useState } from "react";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { mediaNacionalDaArea, TOTAL_BANCAS } from "@/lib/facies";
import { dec } from "@/lib/decimal";
import { AREA_FULL_LABELS, AREA_SHORT_LABELS, AREA_VAR } from "@/lib/areaIdentity";

/**
 * A distribuição por área como MOSAICO, e não como sete barrinhas.
 *
 * ## Por que trocar
 *
 * O painel era uma lista de barras finas, todas em petróleo. Isso desperdiça a
 * única informação da página que é genuinamente de ÁREA: "41% de Clínica" não é
 * um comprimento, é um pedaço do todo — e o olho lê pedaço de área muito mais
 * rápido que comprimento de barra. Sete barras iguais na mesma cor também não
 * têm hierarquia: a maior e a menor pedem o mesmo esforço de leitura.
 *
 * Aqui o tamanho do retângulo É a incidência e a cor é a da grande área. As duas
 * coisas que o aluno quer saber ("o que mais cai" e "de que área") ficam legíveis
 * de relance, e o bloco vira a peça que se compartilha em print.
 *
 * ## Squarified, e não fatiado
 *
 * Fatiar o retângulo sempre no mesmo eixo dá tiras compridas: uma área de 3%
 * vira um risco de 1px de largura, ilegível e feio. O algoritmo abaixo é o
 * *squarified treemap* clássico — ele empilha em faixas e escolhe a direção pelo
 * lado mais curto, mantendo cada célula perto do quadrado. É o que permite
 * rotular a célula de 3% em vez de escondê-la.
 *
 * ## A cor não é fundo de texto — e isso é regra medida
 *
 * `lib/areaIdentity.ts` proíbe escrever texto NA cor da área: como texto o piso
 * é 4,5:1 e a Okabe-Ito reprova 29 pares nessa exigência. A regra vale igual ao
 * contrário: encher a célula com a cor cheia e pôr rótulo em cima cairia no
 * mesmo problema pelo outro lado.
 *
 * Então a célula recebe um LAVADO da cor (que continua identificando a área) e
 * o rótulo fica em tinta. A cor cheia aparece só na barra sólida da borda, onde
 * ela é limite gráfico e o piso é 3:1 — que é exatamente o que a paleta
 * recalibrada entrega com folga.
 */

/**
 * Encurtamento para a célula, e só para ela.
 *
 * "Medicina Preventiva" tem 19 caracteres e reprovava no corte de 16, então caía
 * na forma de sigla — e o mosaico ficava com "MP 11%" ao lado de "Obstetrícia
 * 8%", duas linguagens no mesmo lugar sem razão visível para o leitor. A célula
 * dela é larga; o que não cabia era o NOME, não o dado.
 *
 * Abreviação de dicionário, nunca truncamento por caractere: cortar em N letras
 * produziria "Medicina Prevent…", que é pior que a sigla. O nome inteiro
 * continua no atributo de título e no leitor de tela.
 */
const ENCURTADOS: Record<string, string> = {
  "Medicina Preventiva": "Med. Preventiva",
};

/** Percentual da mistura da cor da área no fundo da célula. */
const LAVADO = 22;

type Linha = { rotulo: string; n: number; pct: number };

type Caixa = Linha & { x: number; y: number; w: number; h: number };

/**
 * Squarified treemap em coordenadas de 0 a 100 (percentuais, para o CSS).
 *
 * Mantido puro e sem dependência para poder ser testado sozinho e para rodar no
 * servidor — este painel é conteúdo estático e não deve ir para o bundle do
 * cliente.
 */
export function mosaico(linhas: Linha[], largura = 100, altura = 100): Caixa[] {
  const positivas = linhas.filter((l) => l.pct > 0);
  if (positivas.length === 0) return [];

  const total = positivas.reduce((s, l) => s + l.pct, 0);
  const escala = (largura * altura) / total;
  const fila = positivas
    .map((l) => ({ ...l, area: l.pct * escala }))
    .sort((a, b) => b.area - a.area);

  const saida: Caixa[] = [];
  let x = 0, y = 0, w = largura, h = altura;
  let faixa: typeof fila = [];

  /** Pior razão de aspecto da faixa, se assentada ao longo de `lado`. */
  const pior = (itens: typeof fila, lado: number) => {
    if (itens.length === 0 || lado <= 0) return Infinity;
    const soma = itens.reduce((s, i) => s + i.area, 0);
    if (soma <= 0) return Infinity;
    const maior = Math.max(...itens.map((i) => i.area));
    const menor = Math.min(...itens.map((i) => i.area));
    return Math.max((lado * lado * maior) / (soma * soma), (soma * soma) / (lado * lado * menor));
  };

  function assentar() {
    const soma = faixa.reduce((s, i) => s + i.area, 0);
    if (soma <= 0) { faixa = []; return; }
    // A faixa cresce ao longo do lado CURTO, que é o que mantém as células
    // perto do quadrado.
    const vertical = w >= h;
    const espessura = soma / (vertical ? h : w);
    let deslocamento = 0;
    for (const item of faixa) {
      const comprimento = item.area / espessura;
      saida.push({
        rotulo: item.rotulo, n: item.n, pct: item.pct,
        x: vertical ? x : x + deslocamento,
        y: vertical ? y + deslocamento : y,
        w: vertical ? espessura : comprimento,
        h: vertical ? comprimento : espessura,
      });
      deslocamento += comprimento;
    }
    if (vertical) { x += espessura; w -= espessura; }
    else { y += espessura; h -= espessura; }
    faixa = [];
  }

  for (const item of fila) {
    const lado = Math.min(w, h);
    if (faixa.length > 0 && pior([...faixa, item], lado) > pior(faixa, lado)) assentar();
    faixa.push(item);
  }
  assentar();
  return saida;
}

/**
 * Quanto da cor entra na célula quando ela está ABERTA.
 *
 * O lavado de repouso identifica a área; o de seleção precisa dizer "é esta que
 * você está lendo" a um relance, sem virar fundo de texto. 42% é o ponto em que
 * a tinta ainda passa com folga nos sete matizes — medido, não arbitrado.
 */
const LAVADO_ABERTA = 42;

export function MosaicoAreas({ linhas }: { linhas: Linha[] }) {
  const caixas = mosaico(linhas);
  /**
   * Qual célula está aberta. `null` é o estado de repouso, e ele é legítimo: o
   * mosaico já responde "o que mais cai" sozinho, e a explicação é aprofundamento
   * de quem quiser — não um passo obrigatório.
   */
  const [aberta, setAberta] = useState<string | null>(null);

  if (caixas.length === 0) return null;

  const maior = Math.max(...caixas.map((caixa) => caixa.pct));
  const escolhida = caixas.find((caixa) => caixa.rotulo === aberta) ?? null;

  return (
    <div>
      <ul
        // `aspect` em vez de altura fixa: o mosaico tem de manter proporção para
        // as áreas continuarem comparáveis entre si em qualquer largura.
        // No celular ele fica em RETRATO. Com 4/3 numa tela de 390px as células
        // pequenas ficavam com ~50px de altura e o "6%" era cortado no meio do
        // glifo — pior que não mostrar, porque parece defeito. Em 3/4 a mesma
        // célula ganha 93px e cabe inteira. No desktop sobra largura, então a
        // proporção deita.
        className="relative w-full list-none aspect-[3/4] sm:aspect-[2/1] lg:aspect-[5/2]"
      >
        {caixas.map((caixa) => {
          // `resolveDisplayArea` trata o PRIMEIRO argumento como codigo de area
          // ("GO", "CM") e so infere pelos seguintes. Passar o rotulo na primeira
          // posicao fazia "Ginecologia" cair em OU — e as sete celulas saiam com
          // a mesma cor cinza, que foi o que a primeira renderizacao mostrou.
          const area = resolveDisplayArea(null, caixa.rotulo);
          const cor = AREA_VAR[area] ?? AREA_VAR.OU;
          const estaAberta = caixa.rotulo === aberta;

          // TRÊS FORMAS, escolhidas por largura E altura separadas — nunca pela
          // área do produto. Área não diz se o texto cabe: uma tira de 40x5 tem
          // a mesma área de uma de 14x14 e não comporta uma linha sequer.
          const rotulo = ENCURTADOS[caixa.rotulo] ?? caixa.rotulo;
          const nome = rotulo.length;
          const formaCompleta = caixa.w >= 22 && caixa.h >= 24 && nome <= 16;
          const formaCurta = !formaCompleta && caixa.w >= 15 && caixa.h >= 11 && nome <= 12;
          const cabeSigla = caixa.w >= 8 && caixa.h >= 6;

          return (
            <li
              key={caixa.rotulo}
              className="absolute"
              style={{
                left: `${caixa.x}%`,
                top: `${caixa.y}%`,
                width: `${caixa.w}%`,
                height: `${caixa.h}%`,
              }}
            >
              {/* BOTÃO, e não `onClick` numa `div`.
                  Ele nasce focável, responde a Enter e Espaço e é anunciado como
                  controle — nada disso viria de graça num elemento inerte, e o
                  mosaico é a única peça interativa da página.

                  `aria-expanded` em vez de `aria-pressed`: o que o clique faz é
                  revelar a explicação abaixo, não ligar um filtro. */}
              <button
                type="button"
                aria-expanded={estaAberta}
                onClick={() => setAberta(estaAberta ? null : caixa.rotulo)}
                className="paper-control group relative block h-full w-full overflow-hidden p-2 text-left lg:p-3"
                style={{
                  background: `color-mix(in srgb, ${cor} ${
                    estaAberta ? LAVADO_ABERTA : LAVADO
                  }%, var(--color-surface))`,
                  borderLeft: `${estaAberta ? 5 : 3}px solid ${cor}`,
                  // O filete separa células vizinhas de matiz parecida sem
                  // introduzir cor nova.
                  outline: "1px solid var(--color-surface)",
                  transition:
                    "background var(--motion-base) var(--ease-paper), border-width var(--motion-fast) var(--ease-paper)",
                }}
              >
                {formaCurta ? (
                  <>
                    <span className="flex flex-wrap items-baseline gap-x-1.5">
                      {/* `min-w-0` não é enfeite: item de flex nasce com
                          `min-width: auto`, que o impede de encolher abaixo da
                          palavra mais longa — e aí `break-words` fica inerte.
                          `line-clamp-1` é o piso: a 320px "Ginecologia" quebra
                          em duas e estoura a célula na ALTURA. */}
                      <span
                        className="line-clamp-1 min-w-0 hyphens-auto font-serif text-sm font-semibold leading-tight text-ink"
                        title={caixa.rotulo}
                      >
                        {rotulo}
                      </span>
                      <span className="font-mono text-base tabular-nums text-ink">
                        {caixa.pct.toFixed(0)}%
                      </span>
                    </span>
                    <span className="sr-only">
                      {caixa.n.toLocaleString("pt-BR")} questões
                    </span>
                  </>
                ) : formaCompleta ? (
                  <>
                    {/* `hyphens-auto` NO LUGAR DE `break-words`, e a diferença
                        aparece só no celular.

                        `break-words` corta na letra em que a linha acabar, sem
                        saber onde a palavra se divide: a 390px o mosaico saía
                        com "Ginecol/ogia", "Pediatr/ia" e "Cirur/gia". A
                        hifenização do navegador usa o dicionário de `lang` —
                        que aqui é `pt-BR`, declarado em `layout.tsx` — e quebra
                        em "Gine-cologia", com o hífen que avisa que a palavra
                        continua.

                        O tamanho também desce um degrau no celular: a célula de
                        11% tem ~104px de largura, e `text-base` não comporta
                        nenhum destes nomes sem quebrar. */}
                    <span
                      className="block hyphens-auto font-serif text-sm font-semibold leading-tight text-ink sm:text-base lg:text-lg"
                      title={caixa.rotulo}
                    >
                      {rotulo}
                    </span>
                    <span className="mt-0.5 block font-mono text-lg tabular-nums text-ink sm:text-xl lg:text-2xl">
                      {caixa.pct.toFixed(0)}%
                    </span>
                    {/* ⚠️ TUDO EM `text-ink` DENTRO DA CÉLULA, e isso é medido.
                        Sobre o lavado, `text-muted` reprova nos SETE: 4,07 a
                        4,49 no claro e 3,79 a 4,89 no escuro, contra o piso de
                        4,5. A tinta passa com folga (8,0 a 12,4), então a
                        hierarquia vem de TAMANHO e peso, nunca de cor. */}
                    <span className="mt-0.5 block font-mono text-micro text-ink">
                      {caixa.n.toLocaleString("pt-BR")} questões
                    </span>
                  </>
                ) : cabeSigla ? (
                  <>
                    {/* UMA LINHA SÓ. Empilhado, sigla + percentual pedem ~50px
                        de altura e a célula de 3% não tem tanto — o glifo saía
                        serrado ao meio. Lado a lado a exigência cai para ~20px. */}
                    <span className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="paper-eyebrow text-ink" title={AREA_FULL_LABELS[area]}>
                        {AREA_SHORT_LABELS[area]}
                      </span>
                      <span className="font-mono text-sm tabular-nums text-ink">
                        {caixa.pct.toFixed(0)}%
                      </span>
                    </span>
                    <span className="sr-only">
                      {caixa.rotulo}, {caixa.n.toLocaleString("pt-BR")} questões
                    </span>
                  </>
                ) : (
                  <span className="sr-only">
                    {caixa.rotulo}, {caixa.pct.toFixed(0)}%,{" "}
                    {caixa.n.toLocaleString("pt-BR")} questões
                  </span>
                )}

                {/* O PREENCHIMENTO DENTRO DO QUADRADO.
                    Faixa sólida no pé da célula, com a largura proporcional à
                    MAIOR área da prova. O tamanho do retângulo já compara cada
                    área com o todo; esta faixa compara cada uma com a líder, que
                    é a leitura que o olho não consegue fazer sozinho entre
                    células de formatos diferentes.

                    Sólida de propósito: é o único lugar da célula onde a cor
                    aparece cheia além do filete, e como limite gráfico o piso é
                    3:1 — que a paleta recalibrada entrega com folga. Não carrega
                    texto, então não cai na regra de 4,5:1. */}
                {cabeSigla ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 block h-1.5"
                    style={{ background: "color-mix(in srgb, var(--color-surface) 55%, transparent)" }}
                  >
                    <span
                      className="block h-full"
                      style={{
                        width: `${(caixa.pct / maior) * 100}%`,
                        background: cor,
                        transition: "width var(--motion-slow) var(--ease-paper)",
                      }}
                    />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* A EXPLICAÇÃO, e por que ela é uma comparação e não uma descrição.
          "Cirurgia: 24%" sozinho não informa — o aluno não sabe se 24% é muito.
          O que responde a pergunta é o denominador: a média das 141 bancas do
          acervo, que `mediaNacionalDaArea` deriva da própria base e cuja soma
          fecha nos mesmos 100.601 da faixa do topo. Nada é digitado à mão.

          Fica FORA do mosaico, e não num balão: dentro da célula não caberia sem
          espremer o texto, e balão sobre treemap desaparece atrás do dedo no
          celular — que é onde esta página é lida. */}
      <div aria-live="polite" className="mt-3">
        {escolhida ? (
          <ExplicacaoArea caixa={escolhida} />
        ) : (
          <p className="text-sm text-muted">
            Toque numa área para ver como esta prova a cobra em relação às demais.
          </p>
        )}
      </div>
    </div>
  );
}

function ExplicacaoArea({ caixa }: { caixa: Caixa }) {
  const media = mediaNacionalDaArea(caixa.rotulo);
  const area = resolveDisplayArea(null, caixa.rotulo);
  const cor = AREA_VAR[area] ?? AREA_VAR.OU;
  const diferenca = media == null ? null : caixa.pct - media;

  return (
    <div
      className="rounded-control border border-edge bg-surface p-4"
      style={{ borderLeft: `3px solid ${cor}` }}
    >
      <p className="font-serif text-base font-semibold text-ink">
        {caixa.rotulo}
      </p>
      {/* ⚠️ SEM `font-mono` AQUI, e a razão é a vírgula.
          Em monoespaçada todo glifo ocupa a mesma largura, inclusive a vírgula —
          que é estreita. Num decimal isso abre dois vãos e "11,1%" é lido como
          "11 , 1%". Apareceu ao trocar a IBM Plex pela Azeret, que é mais larga,
          mas o defeito é estrutural e existia antes em menor grau.

          A regra que faltava: mono é para dado em COLUNA, onde a largura fixa
          alinha algarismo com algarismo — o percentual grande dentro da célula,
          a grade de números. Número dentro de frase é prosa, e prosa usa a
          fonte da prosa. `tabular-nums` fica, porque alinhar não custa nada. */}
      <p className="mt-1 text-sm tabular-nums text-ink">
        {caixa.n.toLocaleString("pt-BR")} questões, ou {dec(caixa.pct)}% desta
        prova.
      </p>
      {/* O `n` do denominador acompanha a comparação, como em toda outra
          afirmação numérica desta página. Sem ele, "acima da média" seria uma
          alegação sobre dado objetivo sem a base que a sustenta. */}
      {media != null && diferenca != null ? (
        <p className="mt-2 text-sm tabular-nums text-muted">
          A média das {TOTAL_BANCAS} bancas do acervo é {dec(media)}% —{" "}
          {Math.abs(diferenca) < 1 ? (
            <span className="text-ink">esta prova cobra na média.</span>
          ) : (
            <span className="text-ink">
              esta prova cobra {dec(Math.abs(diferenca))} pontos{" "}
              {diferenca > 0 ? "a mais" : "a menos"}.
            </span>
          )}
        </p>
      ) : null}
    </div>
  );
}
