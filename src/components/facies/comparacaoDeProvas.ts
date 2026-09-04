// ⚠️ RELATIVO E COM `.ts`, e não o alias `@/`. Este módulo é importado pelo
// runner (`node --test --experimental-strip-types`), que não lê os `paths` do
// tsconfig — com `@/lib/...` o teste morre em `ERR_MODULE_NOT_FOUND` antes de
// rodar. É a mesma forma que `src/lib/areaDisplay.ts` já usa.
//
// `Banca` entra como `import type`: o stripping apaga a linha inteira, então o
// `facies.json` de 1 MB que `facies.ts` importa nunca é resolvido aqui.
import { resolveDisplayArea } from "../../lib/areaDisplay.ts";
import {
  AREA_LANDING_LABELS,
  type DisplayArea,
  fundirObstetriciaEmGo,
} from "../../lib/areaIdentity.ts";
import type { Banca } from "../../lib/facies.ts";

/**
 * A CONTA da comparação, separada da tela que a desenha.
 *
 * ## Por que este arquivo existe
 *
 * `CompararProvas.tsx` tem JSX, e o runner de testes desta base é
 * `node --test --experimental-strip-types`, que apaga tipos de `.ts` mas não
 * compreende JSX. Um `.tsx` é, na prática, intestável aqui.
 *
 * Isso já custou caro nesta sessão por outro caminho: a seção das nove medidas
 * misturava dado e vista no mesmo componente, e uma constante acabou
 * serializada dentro da página, em 40px, passando por typecheck, lint, 138
 * testes e build. O corte dado/vista não é preferência de estilo — é o que
 * torna a regra verificável.
 *
 * Então tudo que decide alguma coisa mora aqui, e o `.tsx` só desenha.
 */

/**
 * O limiar do artboard `B1`: "a diferença aparece em âmbar e só onde passa de 3
 * pontos".
 *
 * "Passa de" é ESTRITO — 3 pontos exatos não aparecem. A diferença entre `>` e
 * `>=` decide se uma prova com 3,0 pontos a mais de cirurgia vira uma linha na
 * tela, e o desenho escolheu a mais silenciosa das duas.
 */
export const LIMIAR_EM_PONTOS = 3;

/**
 * O SINAL DE MENOS é U+2212, não hífen.
 *
 * O artboard escreve `−6`, e a diferença não é preciosismo: o hífen é mais
 * curto e mais alto que o sinal de menos, então numa coluna de números em mono
 * `+7` e `-6` desalinham visivelmente. Em `tabular-nums` o U+2212 tem a mesma
 * largura do `+`, e a coluna fecha.
 *
 * ## ⚠️ A DECIMAL APARECE SÓ NO LIMIAR, e é correção de um defeito medido
 *
 * O filtro é estrito sobre o valor BRUTO (`> 3`), mas o inteiro arredonda: um
 * delta de 3,4 passava e era desenhado como `+3` — logo acima da legenda que
 * `CompararProvas.tsx` imprime para o aluno, "só aparece o que passa de 3
 * pontos percentuais". A tela contradizia a própria regra escrita abaixo dela,
 * e não em teoria: **2.628 dos 9.453 pares de bancas** produziam ao menos uma
 * linha assim (27,8%, contado sobre as 138 do `facies.json`).
 *
 * Duas saídas descartadas, e o porquê:
 *
 * - **filtrar pelo arredondado** (`Math.round(d) > 3`) esconderia as
 *   diferenças de 3,0 a 3,4, que passam do limiar que o artboard mandou usar;
 * - **decimal em todas as linhas** escreveria `+7,0`, que nenhum artboard
 *   escreve e que estraga a coluna que o U+2212 existe para alinhar.
 *
 * A decimal entra onde — e só onde — o inteiro mentiria.
 */
export function formatarDelta(valor: number): string {
  const arredondado = Math.round(valor);
  const noLimiar = Math.abs(arredondado) === LIMIAR_EM_PONTOS;
  const magnitude = noLimiar
    ? Math.abs(valor).toFixed(1).replace(".", ",")
    : String(Math.abs(arredondado));
  // O sinal vem do ARREDONDADO, e não do bruto: `Math.round(-0.4)` é `-0`, e
  // `-0 >= 0` é verdadeiro. É isso que mantém o "+0" que o teste guarda contra
  // um "−0" — zero não chega à tela, mas o formatador é exportado.
  return arredondado >= 0 ? `+${magnitude}` : `−${magnitude}`;
}

export type Delta = {
  chave: string;
  valor: number;
  /** O que o número mede, já com a prova nomeada. */
  frase: string;
};

/**
 * O limiar vale sobre o número MOSTRADO, e não sobre o valor cru.
 *
 * Esta função existe por causa de um defeito medido em duas etapas. Primeiro o
 * filtro era `> 3` sobre o cru e a tela arredondava para inteiro: um 3,4 virava
 * `+3`, o número que a legenda de `CompararProvas` diz não existir. A decimal
 * no limiar resolveu a maior parte — mas sobrou a faixa de 3,00 a 3,05, que
 * `toFixed(1)` desenha como `3,0` e o leitor lê como exatamente três. Medido:
 * o par SES PE × FMJ Jundiaí produz `−3,0` em medicina preventiva.
 *
 * Comparar na precisão da tela fecha as duas: só entra a diferença que, no
 * algarismo que o aluno vê, passa de 3. Nada que apareça pode ser lido como
 * "três", e tudo que aparece passa mesmo do limiar — a legenda vira verdade
 * literal em vez de aproximada.
 */
function passaDoLimiar(diferenca: number): boolean {
  return Number(Math.abs(diferenca).toFixed(1)) > LIMIAR_EM_PONTOS;
}

/**
 * O percentual de cada área, na identidade de exibição e com OB dentro de GO.
 *
 * ⚠️ A fusão de OB em GO IMPORTA aqui, e não é herança acidental de
 * `FaixaAreas`. Se uma prova trouxesse GO e OB separados e a outra só GO, as
 * duas faixas teriam contagem de segmentos diferente — e a comparação
 * posicional, que é o argumento inteiro desta tela, quebraria no meio da barra.
 */
export function pesosDeArea(banca: Banca): Map<DisplayArea, number> {
  const unidas = fundirObstetriciaEmGo(
    banca.areas.linhas,
    (rotulo) => resolveDisplayArea(null, rotulo),
    (a, b) => ({ ...a, pct: a.pct + b.pct }),
  );
  const pesos = new Map<DisplayArea, number>();
  for (const linha of unidas) {
    const area = resolveDisplayArea(null, linha.rotulo);
    pesos.set(area, (pesos.get(area) ?? 0) + linha.pct);
  }
  return pesos;
}

/**
 * `pede a incorreta`, em percentual.
 *
 * ⚠️ AUSENTE É ZERO, e isso foi medido antes de virar código. Sete das 138
 * bancas não têm a linha `pede_incorreta` em `formato.distribuicao`, e a dúvida
 * era se ausência significa "nunca ocorreu" ou "não medido" — as duas viram
 * telas diferentes, e a segunda proibiria comparar. A distribuição dessas sete
 * fecha o volume: seis somam 100,0 e a do `Grupo OPTY` soma 100,1 — resíduo do
 * arredondamento das próprias linhas, não volume a mais. Nenhuma delas deixa
 * questão por explicar, logo a ausência é zero ocorrência.
 */
export function percentualQuePedeIncorreta(banca: Banca): number {
  return banca.formato.distribuicao.find((l) => l.codigo === "pede_incorreta")?.pct ?? 0;
}

/**
 * As medidas de FORMA que entram na comparação.
 *
 * São as duas que o dataset tem para as 138 bancas — conferido, não suposto:
 * `vinheta_pct` existe em 138/138 e `pede_incorreta` em 131/138 (as sete
 * ausências são zeros legítimos, acima).
 *
 * ⚠️ O artboard cita uma TERCEIRA, "+48 palavras por enunciado", e ela não
 * está aqui porque **não existe no dataset**. Há `vinheta_pct`, que é a
 * proporção de questões com vinheta longa — outra medida, com outro nome.
 * Contagem de palavras não é produzida em lugar nenhum do gerador.
 *
 * Chamar `vinheta_pct` de "palavras" daria a um número um nome que ele não tem.
 * É o defeito que esta base já pagou caro: afirmação renderizada em página
 * pública a partir de uma constante que ninguém mediu.
 */
const FORMAS: { chave: string; de: (b: Banca) => number; nome: string }[] = [
  { chave: "incorreta", de: percentualQuePedeIncorreta, nome: "pede a incorreta" },
  { chave: "vinheta", de: (b) => b.forma_recente.vinheta_pct, nome: "vinheta longa" },
];

/**
 * As diferenças entre duas provas que passam do limiar, da maior para a menor.
 *
 * O sinal é sempre relativo a `b` — "+7 cirurgia na USP" quer dizer que a USP
 * tem 7 pontos a mais que a prova do aluno. É a direção do artboard, e a única
 * que permite ler a lista inteira sem reinterpretar cada linha.
 *
 * ## ⚠️ POR QUE ISTO PARA EM ÁREA, e não desce para ASSUNTO
 *
 * `mais_cai` existe nas 138 bancas e parece o próximo passo óbvio. Não é, e a
 * razão é medida, não estética:
 *
 * - é um **top-15**, não uma distribuição: toda banca tem exatamente 15 linhas;
 * - a cobertura varia de **22,4% a 100%** (mediana 72,7%), enquanto
 *   `areas.cobertura` é 100,0 nas 138. O denominador diverge, e comparar um
 *   top-15 que cobre 22% com um que cobre 100% compara coisas diferentes;
 * - duas provas compartilham a **mediana de 4 assuntos entre 15**, e
 *   **100 dos 9.453 pares não compartilham nenhum**.
 *
 * A Regra 1b sustenta esta tela porque as duas faixas têm as MESMAS posições —
 * "se a ordem mudar com a prova, a largura deixa de ser a única variável e a
 * comparação morre". Em assunto as posições não coincidem, então a comparação
 * posicional não sobrevive à descida de grão. Uma tela de assunto precisaria de
 * outro desenho (interseção explícita, e o aviso de cobertura), e esse desenho
 * não existe em nenhum artboard que este repositório tenha.
 */
/**
 * ⚠️ `nomeDeB` entra por PARAMETRO, e nao por import.
 *
 * A frase precisa nomear a segunda prova, e o nome que cabe na tela e o
 * curto (`nomeCurto`) -- o institucional por extenso ocupa tres linhas e se
 * repete uma vez por diferenca, ate cinco vezes na mesma tela.
 *
 * Importar `nomeCurto` aqui puxaria `lib/facies.ts` e, com ele, o
 * `facies.json` de 1 MB para dentro do runner de teste -- exatamente o que o
 * `import type` do topo deste arquivo existe para evitar. Quem tem o nome
 * pronto e' o componente, que ja importa o helper.
 *
 * Sem o parametro, cai em `b.nome`: nenhum chamador existente muda.
 */
export function calcularDeltas(a: Banca, b: Banca, nomeDeB?: string): Delta[] {
  const nomeB = nomeDeB ?? b.nome;
  const pesosA = pesosDeArea(a);
  const pesosB = pesosDeArea(b);
  const deltas: Delta[] = [];

  // Percorre a UNIÃO das áreas. Iterar só sobre as de `a` perderia uma área que
  // existe em `b` e não em `a` — e uma área que a segunda prova cobra e a
  // primeira não é a diferença mais importante que esta tela pode mostrar.
  for (const area of new Set<DisplayArea>([...pesosA.keys(), ...pesosB.keys()])) {
    // "Outras" não é área da prova: é o resto que a classificação não encaixou.
    // Um delta em cima dele descreve o nosso acervo, não a banca.
    if (area === "OU") continue;
    const diferenca = (pesosB.get(area) ?? 0) - (pesosA.get(area) ?? 0);
    if (!passaDoLimiar(diferenca)) continue;
    deltas.push({
      chave: `area-${area}`,
      valor: diferenca,
      frase: `${AREA_LANDING_LABELS[area]} na ${nomeB}, em pontos percentuais`,
    });
  }

  for (const forma of FORMAS) {
    const diferenca = forma.de(b) - forma.de(a);
    if (!passaDoLimiar(diferenca)) continue;
    deltas.push({
      chave: `forma-${forma.chave}`,
      valor: diferenca,
      frase: `${forma.nome} na ${nomeB}, em pontos percentuais`,
    });
  }

  // Maior diferença primeiro: quem abre a comparação quer saber ONDE as provas
  // mais discordam, não a ordem alfabética das áreas.
  return deltas.sort((x, y) => Math.abs(y.valor) - Math.abs(x.valor));
}
