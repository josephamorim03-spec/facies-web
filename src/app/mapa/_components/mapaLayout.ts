// ⚠️ RELATIVO E COM `.ts`, e não o alias `@/`. Este módulo é importado pelo
// runner (`node --test --experimental-strip-types`), que não lê os `paths` do
// tsconfig — com `@/lib/...` o teste morre em `ERR_MODULE_NOT_FOUND` antes de
// rodar. É a mesma forma que `components/facies/comparacaoDeProvas.ts` já usa.
//
// `QuestionBankTopic` entra como `import type`: o stripping apaga a linha
// inteira, então nada do runtime da API é resolvido aqui.
import type { QuestionBankTopic } from "../../../lib/api/domains/question-bank/types.ts";

/**
 * A CONTA do mapa, separada da tela que a desenha.
 *
 * Existe por dois motivos, e o segundo é o que pesou: o runner desta base não
 * compreende JSX, então um `.tsx` é na prática intestável — e as duas versões
 * anteriores do mapa foram reprovadas por defeitos de LAYOUT, que é exatamente
 * a parte que nenhum e2e pega. Layout puro aqui, desenho no `.tsx`.
 */

export type Caixa = { x: number; y: number; w: number; h: number };

export type Indice = {
  porId: Map<string, QuestionBankTopic>;
  /** Pai → filhos, já ordenados. A chave `null` são as raízes. */
  filhosDe: Map<string | null, QuestionBankTopic[]>;
};

/**
 * O peso do nó — `question_count`, e SÓ ele.
 *
 * ⚠️ AQUI MORREU O `pesoDe()` DA v2, que escolhia entre `target_bank_demand_score`
 * e `question_count` POR NÓ. Duas consequências, as duas relatadas como defeito:
 *
 *   · o score é normalizado em [0,1] (`clamp()` em `app/domain/target_relevance.py`),
 *     e era impresso com `Math.round` — 0,42 virava "0" e 0,71 virava "1", na
 *     célula e no `aria-label`. Foi o "1 ou 0 ao lado do tema";
 *   · pior: o score SOME no grão `subtheme` para bancas com menos de 400 questões
 *     recentes, então irmãos eram dimensionados uns por um score [0,1] e outros
 *     por uma contagem de centenas — no mesmo retângulo. O treemap estava errado
 *     por construção.
 *
 * `question_count`, sob `institutions: [chave]`, é a única grandeza que cumpre as
 * três condições de um treemap honesto: está sempre presente, é comparável entre
 * irmãos, e respeita pai ⊇ filho (a consulta é agregada por escopo de subárvore).
 *
 * ⚠️ Mas NÃO É SOMÁVEL: é `COUNT(DISTINCT question_id)` sobre o fecho, e a mesma
 * questão pode estar em dois nós. O tamanho é honesto; "as fatias somam o total"
 * seria falso, e por isso a legenda não diz isso em lugar nenhum.
 */
export function pesoDoNo(no: QuestionBankTopic): number {
  return Math.max(0.0001, no.question_count ?? 0);
}

/** Sem acento e em minúscula, para comparar nome de nó estruturalmente. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * O índice da árvore, com as três regras estruturais num lugar só.
 */
export function construirIndice(nos: QuestionBankTopic[]): Indice {
  const porId = new Map<string, QuestionBankTopic>();
  for (const no of nos) porId.set(no.knowledge_node_id, no);

  const filhosDe = new Map<string | null, QuestionBankTopic[]>();
  for (const no of nos) {
    const pai = no.parent_knowledge_node_id ?? null;
    // ⚠️ Um nó cujo pai NÃO VEIO na resposta é raiz para efeitos de navegação.
    // Sem isto, um `limit` que corte o meio da árvore esconderia ramos inteiros
    // sem dizer — o mapa ficaria menor que o território e ninguém saberia.
    const chave = pai !== null && porId.has(pai) ? pai : null;
    const lista = filhosDe.get(chave) ?? [];
    lista.push(no);
    filhosDe.set(chave, lista);
  }

  // ⚠️ A RAIZ TÉCNICA ÚNICA É DESCARTADA, e a defesa é ESTRUTURAL.
  //
  // Existe um nó "Medicina" no topo da taxonomia que o Banco também descarta
  // (`banco/_components/topicTree.ts`, `isForbiddenStudentRoot`). Se ele vier,
  // engole a árvore inteira e o mapa vira um retângulo só.
  //
  // Defender pelo NOME seria frágil — a taxonomia pode renomeá-lo. O sinal certo
  // é o GRAU DOS FILHOS: uma moldura tem especialidades penduradas nela; um
  // território de verdade tem temas.
  //
  // ⚠️ "raiz única com mais de um filho" NÃO serve, e o teste pegou: uma banca
  // com uma só especialidade e vários temas cairia na regra, e a especialidade
  // dela seria apagada do mapa. O nome fica como rede, para o caso de a
  // taxonomia não tipar o nível de cima.
  const raizes = filhosDe.get(null) ?? [];
  if (raizes.length === 1) {
    const unica = raizes[0];
    const netos = filhosDe.get(unica.knowledge_node_id) ?? [];
    const netosSaoEspecialidade = netos.every((n) => n.node_type === "specialty");
    const pareceMoldura = netosSaoEspecialidade || normalizar(unica.node_name) === "medicina";
    if (netos.length > 0 && pareceMoldura) {
      filhosDe.set(null, netos);
      filhosDe.delete(unica.knowledge_node_id);
      porId.delete(unica.knowledge_node_id);
    }
  }

  // Peso desc, com desempate por nome em pt-BR — sem ele a ordem de dois nós de
  // mesma contagem depende da ordem de chegada da API, e o mapa "pula" entre
  // dois carregamentos iguais.
  for (const lista of filhosDe.values()) {
    lista.sort(
      (a, b) => pesoDoNo(b) - pesoDoNo(a) || a.node_name.localeCompare(b.node_name, "pt-BR"),
    );
  }

  return { porId, filhosDe };
}

/**
 * Treemap por bisseção — corta a lista no ponto que mais aproxima metade do peso
 * e divide o retângulo pelo lado MAIOR.
 *
 * Fatiar sempre pelo lado longo é o que faz as peças tenderem ao quadrado em vez
 * de virarem tiras: numa fatia de 3% do palco, uma tira de 4px não é clicável nem
 * legível, e é o que uma divisão ingênua produz.
 *
 * ⚠️ INVARIANTE DO QUAL O RESTO DEPENDE: as caixas são empurradas em `saida` na
 * ORDEM DE ENTRADA — o prefixo antes do sufixo, e o caso-base empurra uma. Quem
 * chama casa `saida[i]` com `itens[i]`. Está preso em teste (`mapa-layout.test.mjs`).
 */
export function fatiar(
  itens: Array<{ peso: number }>,
  caixa: Caixa,
  saida: Caixa[],
  vao: number,
): void {
  if (itens.length === 0) return;
  if (itens.length === 1) {
    saida.push({
      x: caixa.x + vao / 2,
      y: caixa.y + vao / 2,
      w: Math.max(1, caixa.w - vao),
      h: Math.max(1, caixa.h - vao),
    });
    return;
  }
  const total = itens.reduce((s, i) => s + i.peso, 0) || 1;
  let acumulado = 0;
  let corte = 1;
  let melhor = Infinity;
  for (let i = 1; i < itens.length; i++) {
    acumulado += itens[i - 1].peso;
    const d = Math.abs(acumulado / total - 0.5);
    if (d < melhor) {
      melhor = d;
      corte = i;
    }
  }
  const a = itens.slice(0, corte);
  const b = itens.slice(corte);
  const fracao = a.reduce((s, i) => s + i.peso, 0) / total;
  if (caixa.w >= caixa.h) {
    fatiar(a, { ...caixa, w: caixa.w * fracao }, saida, vao);
    fatiar(
      b,
      { x: caixa.x + caixa.w * fracao, y: caixa.y, w: caixa.w * (1 - fracao), h: caixa.h },
      saida,
      vao,
    );
  } else {
    fatiar(a, { ...caixa, h: caixa.h * fracao }, saida, vao);
    fatiar(
      b,
      { x: caixa.x, y: caixa.y + caixa.h * fracao, w: caixa.w, h: caixa.h * (1 - fracao) },
      saida,
      vao,
    );
  }
}

/**
 * A GARANTIA DE LEGIBILIDADE — e é ela que separa esta versão das duas anteriores.
 *
 * Dados reais têm cauda longa: uma especialidade com 40 temas num palco de 352px
 * de altura dá células de 3px. A v2 tentou resolver isso com rampa de opacidade,
 * que é um pedido de desculpas por um layout que não cabe.
 *
 * Aqui a cauda é DOBRADA: corta-se enquanto a menor peça projetar menos que
 * `areaMinima`, e o resto vira UMA peça ("+ 12 temas") que abre um nível com
 * exatamente esses 12. Nenhuma célula fica abaixo do polegar, em nível nenhum,
 * em aparelho nenhum — e é por isso que o rótulo pôde voltar a viver dentro da
 * célula, em fluxo normal, sem `var(--k)` e sem rampa.
 */
export function dobrarCauda(
  filhos: QuestionBankTopic[],
  caixa: Caixa,
  ladoMinimo: { w: number; h: number },
  maxPecas: number,
  vao: number,
  /** Ver `disporNivel`: na cauda o peso é uniforme, e aí quase nada dobra. */
  pesoUniforme = false,
): { visiveis: QuestionBankTopic[]; desde: number } {
  if (filhos.length === 0) return { visiveis: [], desde: 0 };
  const pesos = filhos.map((no) => (pesoUniforme ? 1 : pesoDoNo(no)));

  /**
   * ⚠️ A CONTA É FEITA NO LAYOUT, e não por área estimada. O gate pegou isto.
   *
   * A primeira versão comparava `(menorPeso / total) * areaDoPalco` com uma área
   * mínima — e área não governa forma. Uma peça com 3.168px² de área satisfaz o
   * piso e ainda pode sair 400×8. Na prática saiu uma célula de **30,7px de
   * largura** no nível raiz, que é exatamente a tira ilegível que este mecanismo
   * existe para impedir.
   *
   * Fatiar de verdade e medir os dois lados custa alguns `fatiar()` a mais num
   * `useMemo` — e é a diferença entre uma garantia e uma esperança.
   */
  const cabe = (k: number): boolean => {
    const itens = pesos.slice(0, k).map((peso) => ({ peso }));
    const daCauda = pesos.slice(k).reduce((s, p) => s + p, 0);
    if (daCauda > 0) itens.push({ peso: daCauda });
    const caixas: Caixa[] = [];
    fatiar(itens, caixa, caixas, vao);
    return caixas.every((c) => c.w >= ladoMinimo.w && c.h >= ladoMinimo.h);
  };

  let k = Math.min(maxPecas, filhos.length);
  while (k > 1 && !cabe(k)) k -= 1;

  // Dobrar UM item só é pior que mostrá-lo: "+ 1 tema" custa o mesmo toque e
  // esconde menos informação que o próprio nome do tema. Mas só se o piso
  // aguentar — a legibilidade ganha da elegância.
  if (filhos.length - k === 1 && cabe(filhos.length)) k = filhos.length;

  return { visiveis: filhos.slice(0, k), desde: k };
}

/** Um degrau do caminho: um nó, ou a cauda dobrada de um nível. */
export type Passo =
  | { tipo: "no"; id: string; nome: string }
  | { tipo: "cauda"; paiId: string | null; desde: number; nome: string };

/** Os filhos que o nível corrente deve dispor. */
export function filhosDoPasso(indice: Indice, caminho: Passo[]): QuestionBankTopic[] {
  if (caminho.length === 0) return indice.filhosDe.get(null) ?? [];
  const ultimo = caminho[caminho.length - 1];
  if (ultimo.tipo === "no") return indice.filhosDe.get(ultimo.id) ?? [];
  // Numa cauda, o nível é exatamente o resto que ficou de fora do pai.
  return (indice.filhosDe.get(ultimo.paiId) ?? []).slice(ultimo.desde);
}

export type Peca =
  | {
      tipo: "no";
      caixa: Caixa;
      no: QuestionBankTopic;
      /** Quantos filhos tem. Zero = folha: o toque pratica em vez de aproximar. */
      dentro: number;
      /** As caixas dos filhos, para a prévia em filetes. Vazia quando é folha. */
      previa: Caixa[];
    }
  | {
      tipo: "cauda";
      caixa: Caixa;
      quantos: number;
      desde: number;
      paiId: string | null;
      /** O `node_type` dos irmãos dobrados — a peça precisa dele para dizer
       *  "+ 2 áreas" em vez de cair num substantivo genérico. */
      grao: string | null;
    };

/**
 * Dispõe um nível inteiro na caixa do palco.
 *
 * A prévia é o terceiro ingrediente do modelo: cada peça desenha os PRÓPRIOS
 * filhos como filetes, então você vê um degrau adiante sem entrar, e folha vira
 * visível (célula lisa = fim do caminho). São filetes e não caixas de propósito
 * — caixas dentro de caixas foi o que produziu as três molduras encaixadas que
 * poluíram a v2.
 */
export function disporNivel(
  indice: Indice,
  filhos: QuestionBankTopic[],
  caixa: Caixa,
  op: {
    ladoMinimo: { w: number; h: number };
    maxPecas: number;
    vao: number;
    previaMin: number;
    /**
     * ⚠️ PESO UNIFORME — é o que faz a conta fechar SEM sair do mosaico.
     *
     * A cauda prometia o total escondido e abria mostrando menos, porque o
     * nível dela era re-dobrado. A causa real é o DESNÍVEL de peso: Clínica
     * Médica (480) contra Outros (40) põe o segundo em 61px, abaixo do piso, e
     * nenhum ajuste de piso conserta isso — a área do menor é pequena demais
     * para ser desenhada legível, em qualquer nível.
     *
     * Mas na cauda os itens são, por construção, **os menores e quase iguais**:
     * ali a proporção não distingue nada, que é justamente o serviço que um
     * treemap presta. Com peso uniforme eles cabem todos, o mosaico continua
     * mosaico, e "Mais 4" abre 4.
     *
     * Cheguei a resolver isto trocando a cauda por uma LISTA. Fechava a conta e
     * quebrava a linguagem visual da tela — o operador apontou na hora. Peso
     * uniforme entrega as duas coisas.
     */
    pesoUniforme?: boolean;
    /**
     * A ordem de EXIBIÇÃO das peças, para o modo "Atenção". Nunca decide QUEM
     * aparece.
     *
     * ⚠️ ESTA SEPARAÇÃO NÃO É ESTILO — ela é o conserto de dois defeitos que
     * saíram publicados juntos, os dois porque a prioridade era aplicada ANTES
     * da dobra, lá no componente.
     *
     * 1. `dobrarCauda` só garante o piso enquanto a lista chega em peso
     *    decrescente: o laço para em `k > 1` e devolve `k = 1` SEM conferir,
     *    contando que a primeira peça seja a mais pesada. Com a prioridade
     *    promovendo um tema de 2 questões, nenhum `k` cabia e o nível saía com
     *    UMA célula de 1×348 px ao lado de "+19 temas". Medido no palco do
     *    telemóvel (358×352), em Cirurgia Geral.
     *
     * 2. `desde` é um ÍNDICE, e `filhosDoPasso` fatia com ele a lista do
     *    `indice`, que está em peso decrescente. Contado sobre a lista
     *    reordenada, ele apontava para outro conjunto: "+N temas" abria uma
     *    coisa diferente da que prometia — o mesmo "não fecha a conta" de antes.
     *
     * Com a dobra sempre em peso, a cauda volta a ser "os menores", `desde`
     * volta a casar com o índice, e a prioridade faz o que diz: muda a ordem do
     * que já ia aparecer.
     */
    ordemDeExibicao?: Map<string, number>;
  },
): Peca[] {
  const peso = (no: QuestionBankTopic) => (op.pesoUniforme ? 1 : pesoDoNo(no));
  const { visiveis, desde } = dobrarCauda(
    filhos,
    caixa,
    op.ladoMinimo,
    op.maxPecas,
    op.vao,
    op.pesoUniforme,
  );
  if (visiveis.length === 0) return [];

  const cauda = filhos.slice(desde);
  const pesoDaCauda = cauda.reduce((s, n) => s + peso(n), 0);

  const dispor = (nos: QuestionBankTopic[]): Caixa[] => {
    const itens = nos.map((n) => ({ peso: peso(n) }));
    if (cauda.length > 0) itens.push({ peso: pesoDaCauda });
    const saida: Caixa[] = [];
    fatiar(itens, caixa, saida, op.vao);
    return saida;
  };

  // A permutação muda o corte do `fatiar` e pode piorar a forma das células.
  // Então a ordem nova só vale se ela também respeitar o piso; senão fica a de
  // peso, e a atenção segue comunicando pelas marcas. Degradar a ORDEM é
  // aceitável; degradar a legibilidade não é.
  let naTela = visiveis;
  let caixas = dispor(visiveis);
  if (op.ordemDeExibicao) {
    const proposta = ordenarPorPrioridade(visiveis, op.ordemDeExibicao);
    const suasCaixas = dispor(proposta);
    const cabem = suasCaixas.every(
      (c) => c.w >= op.ladoMinimo.w && c.h >= op.ladoMinimo.h,
    );
    if (cabem) {
      naTela = proposta;
      caixas = suasCaixas;
    }
  }

  const pecas: Peca[] = [];
  naTela.forEach((no, i) => {
    const minha = caixas[i];
    if (!minha) return;
    const netos = indice.filhosDe.get(no.knowledge_node_id) ?? [];
    const previa: Caixa[] = [];
    // A prévia só vale a pena quando a peça comporta: abaixo disso os filetes
    // viram um borrão que sugere textura, não estrutura.
    if (netos.length > 1 && minha.w >= op.previaMin && minha.h >= op.previaMin) {
      fatiar(
        netos.map((n) => ({ peso: pesoDoNo(n) })),
        { x: 0, y: 0, w: minha.w, h: minha.h },
        previa,
        0,
      );
    }
    pecas.push({ tipo: "no", caixa: minha, no, dentro: netos.length, previa });
  });

  if (cauda.length > 0) {
    const daCauda = caixas[naTela.length];
    if (daCauda) {
      pecas.push({
        tipo: "cauda",
        caixa: daCauda,
        quantos: cauda.length,
        // ⚠️ `desde` conta na ordem do ÍNDICE (peso decrescente), que é a mesma
        // que `filhosDoPasso` fatia. Por isso a dobra roda sempre nela.
        desde,
        paiId: naTela[0]?.parent_knowledge_node_id ?? null,
        grao: cauda[0]?.node_type ?? null,
      });
    }
  }
  return pecas;
}

/**
 * ══ A ATENÇÃO ═════════════════════════════════════════════════════════════
 *
 * O que o aluno mais precisa ver, e **por quê** — com o porquê vindo pronto do
 * backend.
 *
 * ⚠️ NÃO RECALCULAR A PRIORIDADE AQUI. `app/services/topic_priority.py` é a
 * fonte: `0.45*deficit + 0.25*bank_demand + 0.20*recent_error + 0.10*under_coverage`,
 * e o módulo existe porque essa fórmula já esteve copiada em quatro lugares.
 * Uma segunda fórmula no frontend é exatamente o modo de falha que ele foi
 * escrito para eliminar. O que chega em `/topics` e basta:
 *
 *   · `recommendation_rank`  — a ordem, já calculada (hoje descartada: a lista
 *     vem ordenada por `bank_demand_score`, não por ela);
 *   · `recommendation_reason` — categórico, seguro de expor;
 *   · `recommendation_explanation` — a frase, com evidência.
 *
 * ⚠️ E NÃO EXPOR os fatores crus (`deficit`, `mastery`, `target_difficulty`).
 * `app/api/schemas/question_bank.py` documenta o ataque: com eles à vista, o
 * aluno infere a função de score por regressão e passa a responder de um jeito
 * que faz o banco servir item fácil e inflar a maestria.
 *
 * ⚠️ SÓ ENTRA QUEM TEM FRASE. `topic_explanation.py` não inventa explicação sem
 * evidência — então um nó sem `recommendation_explanation` é um nó sobre o qual
 * o produto não tem o que dizer, e listá-lo seria pedir fé.
 */
export function prioridades(indice: Indice, limite: number): QuestionBankTopic[] {
  const todos: QuestionBankTopic[] = [];
  for (const no of indice.porId.values()) {
    const frase = no.recommendation_explanation;
    if (typeof frase === "string" && frase.trim().length > 0) todos.push(no);
  }
  return todos
    .sort(
      (a, b) =>
        (a.recommendation_rank ?? Number.MAX_SAFE_INTEGER) -
          (b.recommendation_rank ?? Number.MAX_SAFE_INTEGER) ||
        a.node_name.localeCompare(b.node_name, "pt-BR"),
    )
    .slice(0, limite);
}

/**
 * O caminho até um nó, para o mapa poder ENQUADRÁ-LO quando alguém toca na
 * lista de atenção. Sem isto a lista diria "olhe para X" sem levar a X.
 */
export function caminhoAte(indice: Indice, id: string): Passo[] {
  const passos: Passo[] = [];
  let atual = indice.porId.get(id);
  // Sobe até a raiz montando o caminho ao contrário. O teto de 8 é guarda
  // contra ciclo: taxonomia com pai apontando para descendente já derrubou
  // consulta neste produto, e um `while` nu aqui congelaria a aba.
  for (let i = 0; atual && i < 8; i += 1) {
    passos.unshift({ tipo: "no", id: atual.knowledge_node_id, nome: atual.node_name });
    const pai = atual.parent_knowledge_node_id;
    atual = pai ? indice.porId.get(pai) : undefined;
  }
  // O último passo é o próprio nó; quem chama quer parar no PAI dele, para o
  // nó aparecer como peça no palco em vez de o palco virar os filhos dele.
  return passos.slice(0, -1);
}

/**
 * O caminho que REALMENTE mostra o nó — abrindo a cauda quando ele está dobrado.
 *
 * ⚠️ `caminhoAte` sozinho não cumpre a promessa da lista de atenção. Ele para no
 * pai para o alvo virar peça, mas um nó leve não é peça: ele está dentro do
 * "Mais N temas menores". Medido em Cirurgia da ENARE, no palco do telemóvel —
 * tocar num tema de 1 questão levava ao nível onde ele é invisível.
 *
 * E o defeito mordia exatamente a população que a atenção existe para servir:
 * prioridade é urgência, não volume, então o que o aluno mais precisa ver é com
 * frequência o que menos ocupa área. O comentário da própria lista já dizia o
 * critério — "prioridade que não leva a lugar nenhum é recado, não mapa".
 *
 * A dobra depende do palco, então ela é recalculada aqui com a mesma medida que
 * o nível usa. Sem palco medido ainda, devolve o caminho simples: melhor um
 * degrau a menos que um passo de cauda com `desde` de outro tamanho de tela.
 */
export function caminhoQueMostra(
  indice: Indice,
  id: string,
  caixa: Caixa,
  op: { ladoMinimo: { w: number; h: number }; maxPecas: number; vao: number },
): Passo[] {
  const caminho = caminhoAte(indice, id);
  if (caixa.w <= 0 || caixa.h <= 0) return caminho;

  const irmaos = filhosDoPasso(indice, caminho);
  const posicao = irmaos.findIndex((no) => no.knowledge_node_id === id);
  if (posicao < 0) return caminho;

  // ⚠️ UMA CAUDA PODE DOBRAR OUTRA, e por isso isto é um laço.
  //
  // Medido em Cirurgia: o nível do pai dobra 17, e esses 17 ainda dobram 3 —
  // mesmo com peso uniforme, que é o que o nível de cauda usa. Parar na
  // primeira dobra deixava o alvo invisível um degrau mais fundo, que é o mesmo
  // defeito com outro endereço.
  //
  // O `desde` é ABSOLUTO e a cauda SUBSTITUI a anterior em vez de empilhar —
  // é o contrato que `filhosDoPasso` já assume (`filhosDe.get(paiId).slice`),
  // e foi o compounding relativo que uma vez fez "Outros" ficar inalcançável.
  let base = 0;
  for (let i = 0; i < 8; i += 1) {
    const nivel = base === 0 ? irmaos : irmaos.slice(base);
    const { desde } = dobrarCauda(
      nivel,
      caixa,
      op.ladoMinimo,
      op.maxPecas,
      op.vao,
      // Dentro de uma cauda o peso é uniforme, como em `disporNivel`.
      base > 0,
    );
    if (desde <= 0 || desde >= nivel.length || posicao - base < desde) break;
    base += desde;
  }
  if (base === 0) return caminho;

  // O pai vem do CAMINHO, e não de `irmaos[0].parent_knowledge_node_id`: uma
  // raiz promovida por `construirIndice` guarda o pai técnico que foi
  // descartado, e `filhosDe` não tem essa chave — a cauda abriria vazia.
  const ultimo = caminho[caminho.length - 1];
  const paiId = ultimo?.tipo === "no" ? ultimo.id : null;
  return [...caminho, { tipo: "cauda", paiId, desde: base, nome: "menores" }];
}

/**
 * O melhor (menor) `recommendation_rank` do nó OU de qualquer descendente dele.
 *
 * ⚠️ SEM ISTO O BOTÃO NÃO FAZ NADA NA RAIZ, e o teste pegou: as prioridades são
 * subtemas, e as especialidades trazem o rank neutro do backend. Ligar a atenção
 * no nível de cima não mudava ordem nem marca — o aluno apertava e a tela ficava
 * igual, que é a pior resposta possível a um interruptor.
 *
 * Herdando o melhor rank do descendente, o território que CONTÉM a urgência vem
 * primeiro e é marcado; entrando nele, o mesmo critério aponta o tema; e assim
 * até o assunto. A atenção passa a ser um caminho, não um destino solto.
 */
export function melhoresRanks(indice: Indice): Map<string, number> {
  const melhor = new Map<string, number>();
  const visitar = (id: string | null): number => {
    let menor = Number.MAX_SAFE_INTEGER;
    for (const filho of indice.filhosDe.get(id) ?? []) {
      menor = Math.min(menor, visitar(filho.knowledge_node_id));
    }
    if (id !== null) {
      const no = indice.porId.get(id);
      const proprio = no?.recommendation_rank;
      // Só conta rank de nó sobre o qual o produto tem o que dizer — mesma regra
      // de `prioridades()`. Rank sem frase é ordem sem justificativa.
      const temFrase =
        typeof no?.recommendation_explanation === "string" &&
        no.recommendation_explanation.trim().length > 0;
      if (temFrase && typeof proprio === "number") menor = Math.min(menor, proprio);
      melhor.set(id, menor);
    }
    return menor;
  };
  visitar(null);
  return melhor;
}

/**
 * Ordena um nível pela prioridade, para o modo "Atenção".
 *
 * ⚠️ Muda a ORDEM, nunca o peso — a área continua sendo `question_count`. Trocar
 * o significado da área entre dois estados da mesma grade obrigaria o aluno a
 * reaprender a codificação ao apertar um botão, e foi por dimensionar peso com
 * duas grandezas que a v2 deste mapa foi reprovada.
 */
export function ordenarPorPrioridade(
  filhos: QuestionBankTopic[],
  melhorRank: Map<string, number>,
): QuestionBankTopic[] {
  const rankDe = (no: QuestionBankTopic) =>
    melhorRank.get(no.knowledge_node_id) ?? Number.MAX_SAFE_INTEGER;
  return [...filhos].sort(
    (a, b) =>
      rankDe(a) - rankDe(b) ||
      // Empate (nenhum dos dois tem urgência): volta ao critério do mapa, para
      // a metade de baixo da tela não virar ordem aleatória.
      pesoDoNo(b) - pesoDoNo(a) ||
      a.node_name.localeCompare(b.node_name, "pt-BR"),
  );
}

/**
 * Rola a proficiência do aluno para CIMA na árvore.
 *
 * ⚠️ NÃO É OPCIONAL, e a v2 escondia isso. `dominio` é chaveado por
 * `primary_subtheme`, então casa só no grão mais fundo; na v2 apenas as folhas
 * eram caixa e ninguém notou. Aqui a raiz e os temas também são caixa — sem
 * agregar, eles ficariam sem tinta nenhuma e a legenda "quanto mais escuro, mais
 * falta" seria falsa em dois dos três níveis.
 *
 * Média ponderada por `attempts`: quem respondeu 40 questões pesa mais que quem
 * respondeu 2, que é o mesmo critério que o mapa da fácies já usa para escolher
 * entre competências do mesmo subtema.
 */
export function agregarDominio(
  indice: Indice,
  porNome: Map<string, { mastery: number; attempts: number }>,
): Map<string, { mastery: number; attempts: number }> {
  const saida = new Map<string, { mastery: number; attempts: number }>();

  const visitar = (id: string | null): { mastery: number; attempts: number } | null => {
    let soma = 0;
    let tentativas = 0;
    for (const filho of indice.filhosDe.get(id) ?? []) {
      const abaixo = visitar(filho.knowledge_node_id);
      if (abaixo) {
        soma += abaixo.mastery * abaixo.attempts;
        tentativas += abaixo.attempts;
      }
    }
    if (id !== null) {
      const no = indice.porId.get(id);
      const proprio = no ? porNome.get(no.node_name) : undefined;
      if (proprio && proprio.attempts > 0) {
        soma += proprio.mastery * proprio.attempts;
        tentativas += proprio.attempts;
      }
    }
    if (tentativas <= 0) return null;
    const resultado = { mastery: soma / tentativas, attempts: tentativas };
    if (id !== null) saida.set(id, resultado);
    return resultado;
  };

  visitar(null);
  return saida;
}
