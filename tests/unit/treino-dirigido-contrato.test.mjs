import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fonteDoBackend, MOTIVO } from "./_contrato-com-o-backend.mjs";

/**
 * O front continua sendo capaz de pedir uma sessão dirigida.
 *
 * ## O defeito que este arquivo existe para impedir
 *
 * `session_kind: "kros"` tinha **um único produtor** em todo o frontend:
 * `/rota/page.tsx`. Quando o `/rota` foi deletado — decisão certa, pelo motivo
 * certo (a pergunta "quanto tempo você tem?" tinha de morrer) — os quatro
 * presets foram junto sem que nada acusasse. O backend seguiu perfeito:
 * `normalize_session_contract` continuou pinando `mode`, `study_kind` e
 * `feedback_timing` para `session_kind == "kros"`, pronto para atender uma
 * chamada que ninguém mais fazia.
 *
 * Nenhum gate viu. Typecheck não vê: remover um `POST` não quebra tipo nenhum.
 * O e2e não via: nenhum cenário passava por lá. E o teste de backend continuou
 * verde, porque o backend continuou correto — é justamente o formato de defeito
 * mais difícil de notar, o da capacidade que só some do lado que ninguém mede.
 *
 * ## Por que a asserção é sobre o produtor, e não sobre a UI
 *
 * A tentação é testar o componente: "o seletor renderiza quatro botões". Isso
 * teria passado verde com o `/rota` intacto e o `KrosModeChooser` órfão, sem
 * nenhum caminho do aluno até ele. O que se perde numa deleção é o **caminho**,
 * então é o caminho que se prende: alguém, em algum lugar, monta um payload com
 * `session_kind: "kros"`.
 */
const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const DOMINIO = fonteDoBackend("app/domain/kros_modes.py");

function varrer(dir) {
  return readdirSync(dir).flatMap((entrada) => {
    const cheio = join(dir, entrada);
    if (statSync(cheio).isDirectory()) {
      return entrada === "generated" ? [] : varrer(cheio);
    }
    return /\.tsx?$/.test(cheio) ? [cheio] : [];
  });
}

/**
 * Comentário não é comportamento.
 *
 * A primeira versão deste arquivo casava o padrão contra o texto cru e achava
 * *três* produtores: a página, o seletor (que só **descreve** `session_kind:
 * "kros"` num comentário de doc) e `types.ts` (que só **declara** o tipo).
 * Nenhum dos dois últimos envia coisa alguma — o guard teria seguido verde com a
 * página inteira deletada, provando exatamente o oposto do que promete. É a
 * mesma armadilha que já pegou esta base: afirmar um proxy no lugar da
 * propriedade.
 */
function semComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const ARQUIVOS = varrer(SRC).map((caminho) => ({
  caminho,
  texto: semComentarios(readFileSync(caminho, "utf8")),
}));

/**
 * O corpo de cada literal `QuestionBankSessionCreatePayload` do arquivo.
 *
 * Recortar o bloco é o que faz esta asserção valer alguma coisa. A versão
 * anterior perguntava "o arquivo contém `session_kind: "kros"` **e** chama
 * `createQuestionBankSession`?" — e eu provei que ela mentia: troquei o `"kros"`
 * do payload de criação por `"bank_topic"`, rodei, e deu **verde**. O que a
 * segurava era a chamada de *prévia*, que também manda `session_kind: "kros"`
 * quarenta linhas acima e não cria sessão nenhuma. Conjunção no nível do arquivo
 * é proximidade fingida.
 */
function payloadsDeCriacao(texto) {
  const blocos = [];
  const abre = /const\s+\w+\s*:\s*QuestionBankSessionCreatePayload\s*=\s*\{/g;
  for (const m of texto.matchAll(abre)) {
    let profundidade = 1;
    let i = m.index + m[0].length;
    for (; i < texto.length && profundidade > 0; i += 1) {
      if (texto[i] === "{") profundidade += 1;
      else if (texto[i] === "}") profundidade -= 1;
    }
    blocos.push(texto.slice(m.index, i));
  }
  return blocos;
}

const PADRAO_PAYLOAD = /session_kind:\s*\n?\s*[\s\S]{0,400}?["']kros["']/;

/** Quem monta um payload de **criação** que pode sair como sessão dirigida. */
const PRODUTORES = ARQUIVOS.filter(
  ({ texto }) =>
    /createQuestionBankSession\(/.test(texto) &&
    payloadsDeCriacao(texto).some((bloco) => PADRAO_PAYLOAD.test(bloco)),
);

test("algum lugar do front ainda pede session_kind: 'kros'", () => {
  assert.ok(
    PRODUTORES.length > 0,
    "Nenhum arquivo monta e envia `session_kind: \"kros\"`. Foi assim que os " +
      "quatro presets sumiram quando o /rota foi deletado: o backend seguiu " +
      "pronto para atender uma chamada que o front parou de fazer, e nada acusou.",
  );
});

test("o montador de sessão é um dos produtores", () => {
  /*
   * A asserção acima sobrevive a qualquer produtor; esta prende o caminho que o
   * aluno de fato percorre. O /rota também era "algum lugar" até deixar de ser.
   */
  assert.ok(
    PRODUTORES.some(({ caminho }) => caminho.endsWith(join("app", "banco", "page.tsx"))),
    "O montador em /banco parou de oferecer o Treino dirigido. " +
      `Produtores encontrados: ${PRODUTORES.map((p) => p.caminho).join(", ") || "nenhum"}.`,
  );
});

test("o recorte separa o payload de criação da chamada de prévia", () => {
  /*
   * A regressão que este teste inteiro persegue é invisível de fora; se o
   * recorte não isolar o bloco certo, o guard volta a dar verde com o caminho
   * quebrado — que foi exatamente o que aconteceu na primeira tentativa.
   */
  const arquivo = `
    useEffect(() => {
      previewKros(token, { session_kind: "kros", kros_mode: "equilibrado" });
    }, []);
    const payload: QuestionBankSessionCreatePayload = {
      session_kind: cheio ? "institutional_exam" : "bank_topic",
      nested: { a: 1 },
    };
    await createQuestionBankSession(token, payload);
  `;
  const blocos = payloadsDeCriacao(arquivo);
  assert.equal(blocos.length, 1, "recortou o número errado de payloads");
  assert.ok(!PADRAO_PAYLOAD.test(blocos[0]), "a prévia vazou para dentro do recorte");
  assert.ok(blocos[0].includes("nested: { a: 1 }"), "o recorte fechou cedo demais em chave aninhada");
  assert.ok(
    PADRAO_PAYLOAD.test(payloadsDeCriacao(arquivo.replace('"bank_topic"', '"kros"'))[0]),
    "o recorte não reconhece o payload de criação quando ele PODE ser kros",
  );
});

test("o preset viaja junto — sem ele o modo não faz o que promete", () => {
  /*
   * `kros_mode` não é enfeite, e a falha por omiti-lo é silenciosa em vez de
   * ruidosa: `resolve_kros_mode(None)` devolve `equilibrado`, então o pedido
   * chega, é aceito, e devolve a sessão de todo mundo. Quem escolheu
   * "Prioridade nos erros" leva `max_answered_share = 0.0` no lugar de 0.40 e
   * nenhum dos boosts (`recent_error`, `deficit`, `fingerprint_need`) — uma
   * sessão que nunca reexpõe o erro, que é a única coisa que o modo faz.
   *
   * (Nota para quem vier depois: `explicit_kros`, no serviço, não olha para
   * `kros_mode` — é `session_kind == "kros" and "session_kind" in
   * model_fields_set`. Eu escrevi o contrário aqui antes de ler a linha.)
   */
  for (const { caminho, texto } of PRODUTORES) {
    const dirigidos = payloadsDeCriacao(texto).filter((b) => PADRAO_PAYLOAD.test(b));
    for (const bloco of dirigidos) {
      assert.match(
        bloco,
        /kros_mode/,
        `${caminho} pede uma sessão dirigida sem mandar \`kros_mode\` no payload.`,
      );
    }
  }
});

/**
 * Os modos declarados em `KROS_MODES`, lidos do domínio.
 *
 * Tolerante à indentação e ao fim de linha de propósito: a primeira versão
 * exigia exatamente quatro espaços, o arquivo usa oito, e o teste reprovou. Foi
 * o resultado certo — a asserção de piso (`>= 4`) transformou "não consegui ler"
 * em falha em vez de deixar o laço iterar sobre lista vazia e imprimir verde.
 */
const PADRAO_MODO = /^\s+key="([a-z_]+)",\s*$/gm;

test("os quatro modos do domínio chegam ao aluno", { skip: DOMINIO ? false : MOTIVO }, () => {
  const py = DOMINIO;
  const doDominio = [...py.matchAll(PADRAO_MODO)].map((m) => m[1]);
  assert.ok(
    doDominio.length >= 4,
    `não consegui ler os modos de kros_modes.py (li ${doDominio.length})`,
  );

  const seletor = readFileSync(
    join(SRC, "app/banco/_components/TreinoDirigidoChooser.tsx"),
    "utf8",
  );
  for (const modo of doDominio) {
    assert.match(
      seletor,
      new RegExp(`value:\\s*"${modo}"`),
      `O domínio define o modo "${modo}" e o seletor não o oferece. ` +
        "Modo que existe no servidor e não na tela é trabalho que ninguém usa.",
    );
  }
});

/**
 * O guard pega o que diz pegar.
 *
 * Guard que nunca falhou é indistinguível de guard quebrado, e esta base já
 * imprimiu verde com regex morto mais de uma vez. As duas asserções abaixo
 * exercitam o padrão contra texto sintético — uma que ele tem de reconhecer,
 * outra que ele não pode reconhecer.
 */
test("o padrão pega o produtor e ignora o não-produtor", () => {
  const pega = (texto) => /session_kind:\s*\n?\s*[\s\S]{0,400}?["']kros["']/.test(texto);

  assert.ok(
    pega(`const p = {\n  session_kind:\n    a ? "institutional_exam" : b ? "kros" : "bank_topic",\n};`),
    "o padrão não reconhece o ternário multilinha — é a forma real em banco/page.tsx",
  );
  assert.ok(pega(`{ session_kind: "kros" }`), "o padrão não reconhece a forma direta");
  assert.ok(
    !pega(`const rotulo = "kros";\n// ...\nsession_kind: "bank_topic",`),
    "o padrão casa 'kros' solto longe de um session_kind — daria verde sem produtor",
  );
});

test("o padrão dos modos aguenta a indentação e o fim de linha reais", () => {
  /*
   * Este caso existe porque a versão anterior errou aqui: exigia quatro espaços
   * de indentação num arquivo que usa oito, e leu zero modos. E CRLF é o outro
   * jeito clássico de um `$` deixar de casar — nesta base o `web/` mistura CRLF
   * e LF no mesmo arquivo, então nada garante qual chega.
   */
  const ler = (texto) => [...texto.matchAll(new RegExp(PADRAO_MODO.source, "gm"))].map((m) => m[1]);

  assert.deepEqual(ler(`    "a": KrosMode(\n        key="prioridade_erros",\n`), ["prioridade_erros"]);
  assert.deepEqual(ler(`\tkey="terreno_novo",\r\n`), ["terreno_novo"], "CRLF derruba o padrão");
  assert.deepEqual(ler(`key = "foco_banca"`), [], "o padrão casa atribuição solta");
});
