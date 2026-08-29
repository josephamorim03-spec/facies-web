export type DisplayArea = "GO" | "OB" | "PD" | "MP" | "CG" | "CM" | "OU";

export const AREA_FULL_LABELS: Record<DisplayArea, string> = {
  GO: "Ginecologia e Obstetrícia",
  OB: "Obstetrícia",
  PD: "Pediatria",
  CG: "Cirurgia Geral",
  CM: "Clínica Médica",
  MP: "Medicina Preventiva",
  OU: "Outras",
};

export const AREA_SHORT_LABELS: Record<DisplayArea, string> = {
  GO: "GO", OB: "OB", PD: "PD", CG: "CG", CM: "CM", MP: "MP", OU: "OU",
};

/**
 * O nome curto do DESIGN — terceira forma, e não substituta de nenhuma das duas.
 *
 * O pacote de design não escreve os nomes institucionais em lugar nenhum, nem na
 * landing nem no webapp. O artboard `1b` traz a legenda assim:
 *
 *     clínica 26%   preventiva 22%   pediatria 19%   GO 18%   cirurgia 15%
 *
 * Enquanto isso a página imprimia "Ginecologia e Obstetrícia 19%". Fundir OB em
 * GO e continuar com o nome por extenso atendia metade do pedido: o que
 * simplifica de verdade é a palavra curta.
 *
 * ⚠️ GO É A EXCEÇÃO, e é uma exceção PEDIDA. O design escreve "GO"; o usuário
 * pediu o nome por extenso em 2026-08-29. A razão é boa: as outras cinco são
 * palavras que o aluno lê sem traduzir ("clínica", "cirurgia"), e "GO" é a única
 * que exige conhecer a sigla — logo na primeira tela, antes de a página ter
 * ganhado qualquer confiança.
 *
 * Fica em minúscula como as demais: aqui é nome, não título.
 *
 * ⚠️ E ele é VISUAL, só. Quem ouve a página não tem a barra colorida ao lado
 * para desambiguar "GO", e "clínica" sozinha é ambígua num contexto médico —
 * então `aria-label` e leitor de tela continuam recebendo `AREA_FULL_LABELS`.
 * É por isso que este mapa é o terceiro, e não uma troca: as três formas servem
 * a três leitores diferentes (olho, ouvido, e a sigla dos gráficos densos).
 */
export const AREA_LANDING_LABELS: Record<DisplayArea, string> = {
  CM: "clínica",
  CG: "cirurgia",
  PD: "pediatria",
  GO: "ginecologia e obstetrícia",
  // OB não aparece sozinha na landing (é fundida em GO por
  // `fundirObstetriciaEmGo`), mas o mapa é total: uma entrada faltando viraria
  // `undefined` renderizado como vazio no dia em que a fusão for desligada.
  OB: "obstetrícia",
  MP: "preventiva",
  OU: "outras",
};

/**
 * Cor de área — FONTE ÚNICA.
 *
 * Havia um `AREA_HEX` paralelo com hexes fixos. Os 8 divergiam destes, e 14 dos
 * 20 arquivos que importam "AREA_COLORS" recebiam aquela paleta: GO saía
 * `#7B0F6B` no gráfico da Evolução e `#8F3F7D` na pílula do calendário, na
 * mesma sessão. No tema escuro a divergência explodia — o hex fixo não tinha
 * override, então a cor clara continuava sendo desenhada sobre papel preto.
 *
 * A var resolve os dois problemas: tem override no `.dark` e existe uma vez só.
 * Recharts aceita `var()` em `stroke`/`fill`, então não há motivo para hex.
 */
export const AREA_VAR: Record<DisplayArea, string> = {
  GO: "var(--area-go)",
  OB: "var(--area-ob)",
  PD: "var(--area-ped)",
  MP: "var(--area-mp)",
  CG: "var(--area-cg)",
  CM: "var(--area-cm)",
  OU: "var(--area-ou)",
};

export const AREA_FULL_EXAM_VAR = "var(--area-full-exam)";

/**
 * OB entra em GO **para o aluno**, e continua separada no banco.
 *
 * A separação existe por uma razão boa e interna: `OB` é código próprio em
 * `VALID_AREAS`, e quem filtra por Obstetrícia precisa receber Obstetrícia.
 * Isso não muda.
 *
 * O que não se sustenta é mostrá-la ao aluno na mesma lista que "Ginecologia e
 * Obstetrícia". A legenda saía com as duas em sequência — "Ginecologia e
 * Obstetrícia 11%" e logo abaixo "Obstetrícia 8%" — e lida em voz alta soa
 * como duplicata, não como duas coisas. Na cabeça de quem estuda, GO é uma
 * área; a divisão é do nosso acervo, não da prova dele.
 *
 * ⚠️ SÓ PARA EXIBIÇÃO. Não usar em filtro, seleção nem contagem que volte ao
 * banco — ali as duas continuam distintas, e fundi-las esconderia questão de
 * Obstetrícia de quem pediu Obstetrícia.
 */
export function fundirObstetriciaEmGo<T extends { rotulo: string }>(
  linhas: T[],
  resolver: (rotulo: string) => DisplayArea,
  somar: (a: T, b: T) => T,
): T[] {
  const saida: T[] = [];
  let indiceGo = -1;
  for (const linha of linhas) {
    const area = resolver(linha.rotulo);
    if (area !== "GO" && area !== "OB") {
      saida.push(linha);
      continue;
    }
    if (indiceGo < 0) {
      // A primeira das duas define a POSIÇÃO na lista e o rótulo. Como a ordem
      // de chegada é por incidência, a maior das duas fica — e é ela que o
      // aluno já reconhece.
      indiceGo = saida.length;
      saida.push({ ...linha, rotulo: AREA_FULL_LABELS.GO });
      continue;
    }
    saida[indiceGo] = somar(saida[indiceGo], linha);
  }
  return saida;
}

// OB apontava para a cor do GO aqui e para `--area-ob` no `AREA_VAR` — a mesma
// área com duas cores dependendo de quem perguntasse. OB é código próprio em
// `VALID_AREAS`, e quem filtra por OB precisa ver OB.
export const AREA_BG_CLASS: Record<DisplayArea, string> = {
  GO: "bg-area-go", OB: "bg-area-ob", PD: "bg-area-ped", MP: "bg-area-mp",
  CG: "bg-area-cg", CM: "bg-area-cm", OU: "bg-area-ou",
};

/*
 * NAO existe AREA_TEXT_CLASS, e a ausencia e' deliberada.
 *
 * Cor de area e' MARCA, nunca texto: ponto, barra, faixa, celula — sempre ao
 * lado de um rotulo em tinta. O rotulo carrega a informacao; a cor e' o atalho
 * de leitura.
 *
 * O motivo e' medido. Texto exige 4.5:1, e nenhuma paleta segura para
 * daltonismo entrega isso em sete tons sobre papel claro: a Okabe-Ito reprovou
 * 29 dos 152 pares quando a sigla era escrita na cor da area. Como MARCA o
 * minimo e' 3:1 (WCAG 1.4.11), e ai ela passa — com tres tons escurecidos, o que
 * esta registrado em globals.css.
 *
 * Se voce precisa da sigla colorida, o que voce quer e' a barra colorida com a
 * sigla em `text-ink` ao lado. E o padrao `.area-nome` do sistema.
 */

export const AREA_BORDER_CLASS: Record<DisplayArea, string> = {
  GO: "border-area-go", OB: "border-area-ob", PD: "border-area-ped", MP: "border-area-mp",
  CG: "border-area-cg", CM: "border-area-cm", OU: "border-area-ou",
};
