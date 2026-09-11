#!/usr/bin/env node
/**
 * CATRACA DO ESTADO "SELECIONADO" — cinco gramáticas para uma coisa só.
 *
 * ## O que este guard mede
 *
 * O operador pediu que os botões do app ficassem "similares aos do MAPA". Ao ir
 * ver, o problema era maior do que divergência de gosto: o app pinta o mesmo
 * estado — *este aqui está escolhido* — de **cinco formas diferentes**.
 *
 * | gramática | onde |
 * | --- | --- |
 * | `border-primary bg-washSelecao` | a CERTA — chip, segmentado, aba, `BotaoDeEscolha` |
 * | `border-primary bg-surfaceMuted` | a que o `BotaoDeEscolha` foi escrito para matar |
 * | `bg-primary text-primaryInk` | o teal cheio, removido das abas em 2026-09-06 |
 * | `style={{ backgroundColor: … }}` | `color-mix` inline, fora de qualquer token |
 * | `font-semibold` / `font-medium` no escolhido | **peso como estado** |
 *
 * O último é o pior, e `ui/Tabs.tsx` proíbe-o com medida: abaixo de 13px o
 * desenho **nunca** pesa (330 ocorrências de 10/11/12px nas artboards, todas em
 * 400). Onde há estado, quem o carrega é a BORDA.
 *
 * ## Por que catraca, e não teto zero
 *
 * Um guard que nasce vermelho é um guard que as pessoas aprendem a ignorar — a
 * mesma razão pela qual `check_architecture_invariants` congelou o tamanho dos
 * módulos em vez de impor um número redondo. Há ~25 controlos assim hoje;
 * convertê-los todos de uma vez seria um diff impossível de rever. Isto congela
 * a dívida no tamanho de HOJE e cobra só a direção: **encolher passa, crescer
 * reprova**.
 *
 * Baixou? Baixe o número aqui — o próprio guard imprime o valor novo.
 *
 * ## O que ele NÃO é
 *
 * Não é um detetor de classe proibida. Um `bg-primary` numa ação primária está
 * certo (é o botão de "Começar"); o que ele procura é `bg-primary` **em par com
 * um ternário de estado**, que é outra coisa. Por isso a varredura casa a FORMA
 * (condicional + classe), não a classe sozinha.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZ = "src";

/**
 * O teto. Só desce.
 *
 * 2026-09-10: nasce em **75** — a contagem MEDIDA na árvore, depois de converter
 * os controlos das telas que o operador fotografou (`ExamDebrief`,
 * `MapaNavegavel`, `EscolhaDaProva`).
 *
 * ⚠️ Eu tinha estimado 24. A varredura achou **75** — três vezes mais. Fica
 * registado porque é o próprio argumento para o guard existir: a auditoria
 * visual, feita a ler ficheiro a ficheiro, subestimou a dívida em 3×. Contar à
 * mão o que uma regex conta melhor foi o erro; o número aqui é medido, não
 * escolhido.
 *
 * ⚠️ **Um terço da dívida está em `src/app/cards/**`** — e essas superfícies
 * DEIXARAM DE SER INVISÍVEIS: `FLASHCARDS_ENABLED=1` entrou em produção em
 * 2026-09-10, então o que ali diverge já não é dívida, é defeito à vista. Foi
 * por aí que a conversão começou.
 *
 * 75 → 73 → 72 em 2026-09-10: o filtro de área dos Cards e o toggle do
 * Caderno deixaram o teal cheio (os dois casos citados acima), e o FAB do
 * calendário passou a dizer o seu estado por `variant` do primitivo.
 */
const TETO = 72;

/** Ficheiros que o guard não varre, com o motivo. */
const ISENTOS = new Map([
  // A landing não usa o sistema de componentes do app: ela é a superfície de
  // marketing, com a paleta calibrada para MENOS fundos (2 contra 5).
  ["src/app/_landing", "superfície de marketing, fora do sistema do app"],
  // Os primitivos SÃO a definição da gramática certa; casariam consigo mesmos.
  ["src/components/ui/BotaoDeEscolha.tsx", "é o primitivo"],
  ["src/components/ui/SegmentedToggle.tsx", "é o primitivo"],
  ["src/components/ui/Tabs.tsx", "é o primitivo"],
]);

/**
 * As formas que contam como estado feito à mão.
 *
 * Cada uma casa um TERNÁRIO (ou `&&`) que escolhe entre dois conjuntos de
 * classes — é isso que distingue "controlo com estado" de "superfície pintada".
 */
const FORMAS = [
  {
    nome: "bg-surfaceMuted como escolhido",
    // `? "…border-primary…bg-surfaceMuted…"` — o par que o BotaoDeEscolha mata.
    padrao: /\?\s*["'`][^"'`]*border-primary[^"'`]*bg-surfaceMuted[^"'`]*["'`]/g,
  },
  {
    nome: "teal cheio como escolhido",
    padrao: /\?\s*["'`][^"'`]*bg-primary\b[^"'`]*text-primaryInk[^"'`]*["'`]/g,
  },
  {
    nome: "peso de fonte como estado",
    padrao: /\?\s*["'`][^"'`]*font-(?:semibold|medium|bold)[^"'`]*["'`]\s*:/g,
  },
  {
    nome: "estado por style inline",
    padrao: /style=\{\{[^}]*(?:backgroundColor|boxShadow)[^}]*\?[^}]*\}\}/g,
  },
  {
    nome: "washSelecao pintado à mão fora do primitivo",
    // A gramática certa, mas re-escrita em vez de usar o primitivo. Conta na
    // dívida porque é ela que se desatualiza quando o token muda.
    padrao: /\?\s*["'`][^"'`]*border-primary[^"'`]*(?:bg-washSelecao|bg-\[var\(--wash-selecao\)\])[^"'`]*["'`]/g,
  },
];

function ficheirosDe(raiz) {
  if (!fs.existsSync(raiz)) return [];
  return fs.readdirSync(raiz, { withFileTypes: true }).flatMap((entrada) => {
    const alvo = path.join(raiz, entrada.name).split(path.sep).join("/");
    if ([...ISENTOS.keys()].some((isento) => alvo === isento || alvo.startsWith(`${isento}/`))) {
      return [];
    }
    if (entrada.isDirectory()) return ficheirosDe(alvo);
    return /\.tsx$/.test(entrada.name) ? [alvo] : [];
  });
}

export function varrer(raiz = RAIZ) {
  const achados = [];
  for (const ficheiro of ficheirosDe(raiz)) {
    const fonte = fs.readFileSync(ficheiro, "utf8");
    for (const forma of FORMAS) {
      forma.padrao.lastIndex = 0;
      for (const casamento of fonte.matchAll(forma.padrao)) {
        const linha = fonte.slice(0, casamento.index).split("\n").length;
        achados.push({ ficheiro, linha, forma: forma.nome });
      }
    }
  }
  return achados;
}

function principal() {
  const achados = varrer();
  const total = achados.length;

  if (total > TETO) {
    console.error(
      `Estado selecionado feito à mão: ${total} (teto ${TETO}, +${total - TETO}).\n` +
        "O teto SÓ DESCE: use `BotaoDeEscolha`, `SegmentedToggle`, `km-chip` ou\n" +
        "`TAB_TRIGGER_CLASS` em vez de repintar o estado.\n",
    );
    for (const achado of achados) {
      console.error(`  ${achado.ficheiro}:${achado.linha} — ${achado.forma}`);
    }
    process.exit(1);
  }

  if (total < TETO) {
    console.log(
      `Estado selecionado: ${total} controlos à mão (teto ${TETO}).\n` +
        `  ✔ encolheu — baixe o TETO para ${total} em scripts/check-estado-selecionado.mjs`,
    );
    return;
  }

  console.log(`Estado selecionado: ${total} controlos à mão, no teto (${TETO}).`);
}

// ⚠️ AUTOTESTE OBRIGATÓRIO. Guard que itera precisa provar que iterou: um regex
// que deixa de casar, um diretório renomeado ou uma varredura vazia imprimem
// exatamente o mesmo verde que "está tudo certo".
if (process.argv.includes("--autoteste")) {
  const tmp = fs.mkdtempSync(path.join(process.env.TEMP || "/tmp", "estado-"));
  const casos = [
    ['a.tsx', 'const c = on ? "border-primary bg-surfaceMuted text-ink" : "border-edge";', true],
    ['b.tsx', 'const c = on ? "bg-primary text-primaryInk" : "bg-surface";', true],
    ['c.tsx', 'const c = on ? "font-semibold text-primary" : "text-muted";', true],
    ['d.tsx', 'const e = <b style={{ backgroundColor: on ? "a" : "b" }} />;', true],
    // Negativos: ação primária e superfície pintada NÃO podem contar.
    ['e.tsx', 'const c = "border border-primary bg-primary text-primaryInk";', false],
    ['f.tsx', 'const c = <div className="rounded-surface border border-edge bg-surface" />;', false],
  ];
  let falhas = 0;
  for (const [nome, fonte, deveCasar] of casos) {
    fs.writeFileSync(path.join(tmp, nome), fonte);
  }
  const achados = varrer(tmp);
  for (const [nome, , deveCasar] of casos) {
    const casou = achados.some((a) => a.ficheiro.endsWith(nome));
    if (casou !== deveCasar) {
      console.error(`  ✖ ${nome}: esperado ${deveCasar ? "casar" : "NÃO casar"}, obteve ${casou}`);
      falhas += 1;
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (falhas > 0) {
    console.error(`Autoteste do guard: ${falhas} caso(s) errado(s) — o guard não vê o que diz ver.`);
    process.exit(1);
  }
  console.log(`Autoteste do guard: ${casos.length} casos, 4 reprovados e 2 liberados como esperado.`);
} else {
  principal();
}
