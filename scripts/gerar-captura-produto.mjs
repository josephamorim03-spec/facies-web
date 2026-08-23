import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Gera a captura do produto que a landing pública mostra.
 *
 * POR QUE UM SCRIPT, E NÃO UM PNG SOLTO NO `public/`
 * --------------------------------------------------
 * Uma captura de produto colada à mão envelhece em silêncio: a tela muda, a
 * imagem fica, e a landing passa a mostrar um produto que não existe mais. Num
 * produto que vende medição honesta, esse é o defeito mais caro possível —
 * quem entra depois de ver a imagem descobre na primeira tela que foi enganado.
 *
 * Rodando isto de novo, a imagem acompanha. Depois de qualquer mudança em
 * `/hoje`, rode e confira o resultado.
 *
 * POR QUE OS MOCKS SÃO PRÓPRIOS, E NÃO OS DE `capture-design-redesign.mjs`
 * -----------------------------------------------------------------------
 * Aquele script executa ao ser importado (sobe servidor, abre navegador), então
 * não dá para reusar as funções dele. Mas o enquadramento é melhor separado
 * mesmo: os mocks de lá existem para exercitar o CONTRATO real da API; estes
 * existem para compor uma ILUSTRAÇÃO. São perguntas diferentes — "isto quebra?"
 * e "isto mostra bem o que o produto faz?" — e misturá-las faria a segunda
 * refém da primeira.
 *
 * ⚠️ Dados de exemplo, nunca de conta real. A imagem é pública.
 *
 * Uso:
 *   npm run build && npx next start -p 3100
 *   node scripts/gerar-captura-produto.mjs
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const SAIDA = resolve(process.cwd(), "public", "produto-hoje.png");

const HOJE = new Date().toISOString().slice(0, 10);

/**
 * O cenário da ilustração, escolhido para mostrar o que distingue o produto:
 * uma ação já dimensionada, com a razão à vista, num dia de plantão.
 */
const TODAY = {
  status: "complete",
  primary_action: {
    kind: "practice",
    source: "trainer",
    title: "Resolver bloco clínico de GO",
    // A justificativa segue o artefato canônico de docs/product/positioning.md
    // — erro do aluno + relevância da prova-alvo — e só cita o que o motor
    // ALCANÇA hoje.
    //
    // ⚠️ Uma versão anterior dizia "a SES-DF cobrou isso em 18 das últimas 1.244
    // questões". Essa evidência por nó não chega à tela: topic_explanation.py
    // não tem importador de produção, QuestionBankTopicOut não declara
    // target_demand_evidence (o Pydantic descarta calado), e institution_key
    // nunca é gravado pelo INSERT de student_objectives_repo.py.
    //
    // O que sobrou roda sem flag: impulsive_haste do classificador cognitivo, e
    // o rótulo "cobrada pela sua prova alvo" de _target_relevance, que usa
    // board_code — esse É gravado.
    rationale:
      "Nas duas últimas questões de pré-eclâmpsia você marcou rápido demais e errou — e o tema é cobrado pela sua prova-alvo.",
    cta_label: "Começar bloco",
    href: "/banco",
    estimated_minutes: 35,
    area: "GO",
    agenda_occurrence_id: null,
  },
  backup_actions: [],
  today_load: {
    label: "Adequada",
    estimated_minutes: 62,
    recommended_limit_minutes: 90,
    overload_alert: false,
  },
  progress_snapshot: { weekly_progress_pct: 62, accuracy_pct: 71 },
  review_snapshot: { estimated_minutes: 18 },
  schedule_preview: { date: HOJE, items: [] },
};

// Plantão de 12h: é o caso que o produto existe para tratar, e o único em que
// "≈ 60 min disponíveis" diz alguma coisa que o aluno não saberia sozinho.
const PROMPT = {
  presets: [20, 45, 60],
  suggested_minutes: 60,
  suggested_energy: "low",
  energy_source: "assumed",
  interruption_risk: true,
  interruption_reason: "plantao",
  blocked_hours_today: 12,
  predicted_minutes: 60,
};

const AGENDA = {
  status: "complete",
  days: [{ date: HOJE, items: [], completed_items: 3, total_items: 8 }],
  overdue: [],
  summary: { weekly_progress_pct: 62 },
};

mkdirSync(resolve(process.cwd(), "public"), { recursive: true });

const navegador = await chromium.launch();
const ctx = await navegador.newContext({
  viewport: { width: 1120, height: 900 },
  colorScheme: "light",
  // 2x: a imagem é exibida com largura menor que a nativa na landing, e um
  // asset 1x fica visivelmente mole em tela de retina.
  deviceScaleFactor: 2,
});
await ctx.addCookies([
  {
    name: "krosmed_session",
    value: "captura_produto",
    url: BASE,
    httpOnly: true,
    sameSite: "Lax",
  },
]);

const page = await ctx.newPage();
await page.route("**/api/**", (route) => {
  const p = new URL(route.request().url()).pathname;
  const json = (body) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  if (p === "/api/student/today") return json(TODAY);
  if (p === "/api/student/agenda") return json(AGENDA);
  if (p === "/api/navigation/prompt") return json(PROMPT);
  // `access_status` e `has_completed_initial_goal_setup` NAO sao decoracao:
  // `resolveAuthenticatedLandingRoute` (lib/initialGoalSetup.ts:38-51) manda
  // para /ativar-acesso sem o primeiro e para o setup sem o segundo. Sem os
  // dois, a captura sai da tela de ativacao — foi o que aconteceu.
  if (p === "/api/profile") {
    return json({
      display_name: "Ana",
      email: "ana@exemplo.test",
      access_status: "active",
      has_completed_initial_goal_setup: true,
    });
  }
  return json({});
});

await page.goto(`${BASE}/hoje`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);

// Recorta o conteúdo, não a janela: o trilho lateral e o espaço morto abaixo
// não dizem nada sobre o produto e só encolhem o que importa na landing.
const conteudo = page.locator("main").first();
if ((await conteudo.count()) === 0) {
  throw new Error("nao achei o <main> de /hoje — a captura sairia da pagina errada");
}
await conteudo.screenshot({ path: SAIDA, animations: "disabled" });

const texto = (await conteudo.innerText()).replace(/\s+/g, " ");
for (const esperado of [
  "Resolver bloco clínico de GO",
  "min disponíveis",
  "plantão detectado",
  "prova-alvo",
]) {
  if (!texto.includes(esperado)) {
    throw new Error(
      `a captura saiu sem "${esperado}" — a tela mudou e a ilustração deixaria de mostrar o ponto`,
    );
  }
}

// Afirmação renderizada em PNG é invisível a qualquer guard de texto do repo.
// Este é o único lugar onde dá para pegá-la, então ele pega aqui.
const PROIBIDO = [
  [/cobrou (isso|esse tema) em \d+ das [úu]ltimas/i, "evidência por nó não chega à tela"],
  [/tr[êe]s baterias de 100/i, "está atrás de ENABLE_ADAPTIVE_STUDY_PLAN_V1, desligada"],
  [/microcompet[êe]nc/i, "a cobertura facetada não existe"],
];
for (const [padrao, porque] of PROIBIDO) {
  if (padrao.test(texto)) {
    throw new Error(
      `a captura afirma o que o produto não entrega (${porque}) — e num PNG, onde nenhum guard de texto enxerga`,
    );
  }
}

console.log(`  ${SAIDA}`);
console.log(`  conferido: ação dimensionada, minutos disponíveis e plantão à vista`);

await navegador.close();
