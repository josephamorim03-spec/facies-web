import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fonteDoBackend, MOTIVO } from "./_contrato-com-o-backend.mjs";

/**
 * O checklist de `docs/product/positioning.md`, executável.
 *
 * O doc termina com "Checklist antes de publicar qualquer peça" — seis regras,
 * cada uma com literatura ou razão comercial por trás. Checklist em markdown
 * depende de alguém lembrar de abrir o arquivo, e é o mesmo argumento que
 * `scripts/inventario_marca.py` usa sobre si mesmo: *"documento escrito à mão
 * sobre o que falta apodrece na primeira semana"*.
 *
 * Estas asserções são quase todas NEGATIVAS, e isso é deliberado: o risco não é
 * esquecer de escrever algo, é escrever o que não pode. Uma peça de marketing
 * bem-intencionada ("temos 100 mil questões!", "com inteligência artificial!")
 * é exatamente o que o doc existe para impedir, e ela nunca parece errada para
 * quem a escreve.
 */
const RAIZ = fileURLToPath(new URL("../../src", import.meta.url));
const DOC = fonteDoBackend("docs/product/positioning.md");

function varrer(dir) {
  return readdirSync(dir).flatMap((entrada) => {
    const cheio = join(dir, entrada);
    if (statSync(cheio).isDirectory()) {
      return entrada === "generated" ? [] : varrer(cheio);
    }
    return /\.tsx?$/.test(cheio) ? [cheio] : [];
  });
}

/** As superfícies públicas: home, funil, e os componentes que elas montam. */
const PUBLICAS = varrer(RAIZ).filter(
  (caminho) =>
    /components[\\/]facies[\\/]/.test(caminho) ||
    /app[\\/]page\.tsx$/.test(caminho) ||
    /app[\\/](facies|prova)[\\/]/.test(caminho),
);

/** O texto que o visitante lê, sem comentário nem className. */
function copyDe(caminho) {
  return readFileSync(caminho, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/className="[^"]*"/g, "");
}

test("as superficies publicas foram encontradas", () => {
  // Sem isto, mover a pasta faria todas as asserções abaixo passarem sobre
  // conjunto vazio — guard morto imprime a mesma linha verde que guard
  // satisfeito, e isso já aconteceu três vezes nesta base.
  assert.ok(PUBLICAS.length >= 8, `achei só ${PUBLICAS.length} arquivos públicos`);
});

test("nao vende com IA, e nao nega usar IA", () => {
  // A regra tem duas metades. Negar seria falso e detectável, e destruiria o
  // único ativo que não se recompra. Vender por isso derruba intenção de
  // compra: 65% dos consumidores querem que marcas parem de falar de IA.
  for (const caminho of PUBLICAS) {
    const copy = copyDe(caminho);
    assert.doesNotMatch(
      copy,
      /intelig[êe]ncia artificial/i,
      `${caminho} vende com "inteligência artificial" — vendemos julgamento, não modelo`,
    );
    assert.doesNotMatch(
      copy,
      /sem (uso de )?(IA|intelig[êe]ncia artificial)|n[ãa]o usa(mos)? (IA|intelig)/i,
      `${caminho} NEGA usar IA — é falso e detectável`,
    );
  }
});

test("nao afirma nada em nivel de microcompetencia", () => {
  // O checklist é explícito: nenhuma afirmação em nível de microcompetência
  // enquanto a cobertura facetada não existir. O ranking pesa micro (0,10), mas
  // pesar não é cobrir — prometer o mapa antes da cobertura é vender o que não
  // se entrega.
  for (const caminho of PUBLICAS) {
    assert.doesNotMatch(
      copyDe(caminho),
      /microcompet[êe]nc/i,
      `${caminho} promete microcompetência antes da cobertura facetada`,
    );
  }
});

test("nao usa 'paradoxo da escolha' como lei geral", () => {
  // A meta-análise de referência (63 condições, N=5.036) achou efeito médio
  // praticamente zero. Um comprador informado derruba a frase, e o custo é
  // credibilidade — que é o ativo que o produto inteiro vende.
  for (const caminho of PUBLICAS) {
    assert.doesNotMatch(copyDe(caminho), /paradoxo da escolha/i, caminho);
  }
});

test("nao ataca concorrente pelo nome", () => {
  // O antagonista é uma cena, nunca um concorrente: atacar vindo de quem não
  // tem marca soa a raposa e uvas.
  const concorrentes = /\b(medway|sanar|medcel|estrat[ée]gia\s*med|medgrupo|eu m[ée]dico residente|jaleko|aristo)\b/i;
  for (const caminho of PUBLICAS) {
    assert.doesNotMatch(copyDe(caminho), concorrentes, `${caminho} cita concorrente pelo nome`);
  }
});

test("nao promete tempo ou energia declarados — o D1 matou a pergunta", () => {
  // Os minutos saem do calendário e o plantão é inferido. Copy que peça tempo
  // descreve um produto que não existe mais.
  for (const caminho of PUBLICAS) {
    assert.doesNotMatch(
      copyDe(caminho),
      /diga quanto tempo|quanto tempo voc[êe] tem\?|escolha a sua energia/i,
      `${caminho} pede tempo/energia, que o produto deixou de perguntar`,
    );
  }
});

test("a home mostra a CENA e uma recomendacao com o porque", () => {
  // A parte positiva do checklist, e a mais difícil de acertar: "mostra uma
  // recomendação real com o porquê, não uma lista de features". O doc chama
  // esse artefato de peça principal.
  // `copyDe`, e nao `readFileSync`: a versao anterior lia o arquivo CRU e casava
  // com o COMENTARIO que explica por que a frase saiu. Verde falso — o teste
  // afirmava que o artefato citava uma evidencia que ele tinha acabado de perder.
  const ponte = copyDe(join(RAIZ, "components/facies/PonteDiagnostico.tsx"));
  assert.match(ponte, /23h40/, "a cena sumiu da ponte");
  assert.match(ponte, /p[óo]s-plant[ãa]o/i, "o artefato precisa citar o contexto inferido");
  // A evidencia que o artefato PODE citar: relevancia por prova-alvo
  // (`_target_relevance`, sem flag, via board_code) e o tipo do erro
  // (`question_bank_cognitive`, sem flag). A demanda por no com contagem NAO
  // chega a tela — ver a lista NAO_ALCANCAVEL abaixo.
  assert.match(ponte, /prova-alvo|prova alvo/i, "o artefato precisa citar a prova-alvo");
  // ERA /rapido demais/. Esse guard passou a EXIGIR a acusacao: uma afirmacao
  // sobre como a pessoa leu, feita logo depois do erro dela. O artefato agora
  // cita o fato sem julgar — o assunto caiu e voce errou — e e isso que o teste
  // afirma. Guard que congela a copy errada e pior que guard nenhum, porque
  // impede o conserto e parece rigor.
  assert.match(ponte, /errou|erro/i, "o artefato precisa citar o erro concreto");
  assert.doesNotMatch(
    ponte,
    /r[áa]pido demais|sem ler|antes de (a )?leitura/i,
    "o artefato nao pode acusar a pessoa de como leu",
  );
  // "Exemplo" explícito: um artefato assim, sem rótulo, é indistinguível de um
  // print de conta real — e anúncio vira obrigação contratual (CDC art. 30/37).
  assert.match(ponte, /Exemplo\./, "o artefato precisa ser marcado como exemplo");
});

test("o doc canonico existe e a promessa esta atualizada", { skip: DOC ? false : MOTIVO }, () => {
  const doc = DOC;
  // Se o doc sumir ou for renomeado, este teste avisa — em vez de as asserções
  // acima continuarem verdes protegendo regras que ninguém mais mantém.
  assert.match(doc, /## A promessa/);
  assert.match(
    doc,
    /Você não precisa dizer quanto tempo tem/,
    "a promessa canônica voltou a pedir tempo ao aluno",
  );
});

/**
 * Afirmações cujo CÓDIGO EXISTE mas cujo CAMINHO NÃO EXECUTA.
 *
 * Esta é a classe de erro mais cara desta página, e eu a cometi duas vezes na
 * mesma sessão: achar a constante, confirmar que ela está lá, e concluir que a
 * frase é verdadeira. Existir e ser alcançável são coisas diferentes, e a
 * diferença é sempre uma flag desligada, um schema que descarta o campo, ou uma
 * coluna que nenhum INSERT preenche.
 *
 * A lista é escrita à mão de propósito: não dá para derivar de código se um
 * caminho é alcançável em produção. O que dá é registrar cada caso com a prova,
 * para quem for reintroduzir a frase encontrar o motivo antes.
 */
const NAO_ALCANCAVEL = [
  {
    padrao: /tr[êe]s baterias de 100|3 baterias de 100|bateria diagn[óo]stica/i,
    porque:
      "diagnostic_blueprint.py tem as constantes, mas o único consumidor é " +
      "study_plan/plan_service.py, atrás de ENABLE_ADAPTIVE_STUDY_PLAN_V1 — que " +
      "factory.py lê com default 'false'. O /banco nunca cria session_kind='kros'.",
  },
  {
    // Cobre a frase COMPLETA e a versao CURTA. A primeira versao deste padrao
    // so procurava "cobrou isso em N das ultimas", e a forma curta — "com o
    // numero que sustenta" — sobreviveu no E/NAO E ate uma auditoria manual.
    // Guard que cobre uma redacao so cobre uma redacao.
    padrao: /cobrou (isso|esse tema|este tema) em d+ das [úu]ltimas|n[úu]mero que sustenta/i,
    porque:
      "a evidência por nó está quebrada em três pontos independentes: " +
      "topic_explanation.py não tem importador de produção; QuestionBankTopicOut " +
      "não declara target_demand_evidence (o Pydantic descarta em silêncio); e " +
      "institution_key nunca é gravado pelo INSERT de student_objectives_repo.py. " +
      "O que funciona é target_relevance por board_code — 'cobrada pela sua prova alvo'.",
  },
  {
    padrao: /grau de confian[çc]a por assunto|mapa de dom[íi]nio|incerteza (à|a) vista/i,
    porque:
      "o posterior Beta-Binomial de mastery_estimate.py governa a ESCOLHA da " +
      "questão, mas stdev, is_confident e difficulty_band não saem em nenhum " +
      "schema. /evolucao mostra acerto por área — não existe tela de mapa.",
  },
  {
    padrao: /quest[õo]es irm[ãa]s|mesma microcompet[êe]ncia/i,
    porque:
      "o grafo de questão irmã por microcompetência exige " +
      "QUESTION_BANK_STRUCTURAL_ADAPTIVE_V2_ENABLED, que está desligada. A versão " +
      "honesta é 'outra questão do mesmo assunto' (same_node/same_subtheme).",
  },
  {
    padrao: /escolha o modo|modo da sua sess[ãa]o/i,
    porque:
      "os 4 presets de kros_modes existem completos no backend e nenhum " +
      "componente envia kros_mode — não há seletor, o aluno cai sempre no default.",
  },
  {
    padrao: /por que cada alternativa|cada alternativa errada/i,
    porque:
      "distractor_diagnosis tem cobertura ~0 (cognitive_debt.py registra isso) e " +
      "o learning package canônico está com as três flags de entrega em 0.",
  },
];

test("nao afirma o que existe em codigo mas nao executa em producao", () => {
  for (const caminho of PUBLICAS) {
    const copy = copyDe(caminho);
    for (const { padrao, porque } of NAO_ALCANCAVEL) {
      assert.doesNotMatch(copy, padrao, `${caminho}\n  → ${porque}`);
    }
  }
});
