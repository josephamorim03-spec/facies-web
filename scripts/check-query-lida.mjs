#!/usr/bin/env node
/**
 * O link do ebook para o banco usa parâmetro que o banco lê?
 *
 * ## O buraco que este guard fecha
 *
 * O ebook publicou `/banco?subtheme=<slug>` durante um deploy inteiro. `subtheme`
 * não é lido em lugar nenhum — o banco lê `knowledge_node_id`, `theme`, `area`,
 * `answer_status` e afins. O link não dava 404: a rota existe e a página carrega.
 * Ela só carregava sem assunto nenhum selecionado.
 *
 * `check-links-internos` aprovou, e com razão: ele confere ROTA contra as rotas
 * publicadas, e a rota estava certa. Um parâmetro inventado é invisível para
 * ele, e é justamente o tipo de defeito que nada acusa — nem o build, nem o
 * tipo, nem o teste, porque `URLSearchParams.get` de uma chave inexistente
 * devolve `null` e o código segue com o caminho de "sem contexto".
 *
 * ## O que ele confere
 *
 * As chaves que aparecem em links para `/banco` contra as que o próprio código
 * do banco lê. A lista de chaves lidas é EXTRAÍDA do fonte, não redigitada:
 * redigitar criaria uma segunda verdade que envelhece calada — que é a classe
 * de defeito que este arquivo existe para pegar.
 */

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
/** O código do banco que lê query. Se a leitura mudar de arquivo, o autoteste
 *  abaixo derruba o gate em vez de deixá-lo aprovar por lista vazia. */
const FONTES_DE_LEITURA = [
  "src/app/banco/_lib/sessionBuilder.ts",
  "src/app/banco/page.tsx",
];

// ── as chaves que o banco LÊ, extraídas do fonte ────────────────────────────
const lidas = new Set();
for (const relativo of FONTES_DE_LEITURA) {
  const arquivo = path.join(cwd, relativo);
  if (!fs.existsSync(arquivo)) continue;
  const texto = fs.readFileSync(arquivo, "utf8");
  for (const m of texto.matchAll(/\.get\(\s*"([a-z_]+)"\s*\)/g)) lidas.add(m[1]);
}

// ── as chaves que o ebook ESCREVE ───────────────────────────────────────────
//
// O escopo é o dataset da Revisão Final, e só ele. Uma varredura do `src`
// inteiro acusaria também `?answer_status=`, `?limit=` e `?knowledge_node_ids=`,
// que estão no mesmo estado — presentes em links, ausentes de qualquer leitura.
// Elas são anteriores a este guard e a intenção delas não está clara: pode ser
// link errado, pode ser leitura perdida. Transformar isso num gate agora
// obrigaria a mexer no banco autenticado sem saber o que restaurar, e uma lista
// de isenções envelheceria apontando para código que já mudou.
//
// O que este arquivo garante é estreito e verdadeiro: o material PÚBLICO não
// volta a linkar com chave inventada.
const DATASET = path.join(cwd, "src/data/facies/revisao_final.json");
const falhas = [];
let conferidos = 0;
if (fs.existsSync(DATASET)) {
  const dados = JSON.parse(fs.readFileSync(DATASET, "utf8"));
  for (const [subtema, pagina] of Object.entries(dados.conteudo ?? {})) {
    const url = pagina?.exemplo_de_cobranca?.url_banco;
    if (!url || !url.includes("?")) continue;
    for (const par of url.split("?")[1].split("&")) {
      const chave = par.split("=")[0].trim();
      if (!chave) continue;
      conferidos++;
      if (!lidas.has(chave)) {
        falhas.push(`${subtema} -> ?${chave}= (o banco nao le esta chave)`);
      }
    }
  }
}

// AUTOTESTE: sem ele a regra nasce inerte quando o fonte muda de forma, e o
// gate imprime verde sobre uma lista vazia — que aprova qualquer coisa.
if (lidas.size < 3) {
  console.error("check-query-lida: extrai menos de 3 chaves do banco; a REGRA esta cega.");
  console.error(`  extraidas: ${[...lidas].join(", ") || "(nenhuma)"}`);
  console.error(`  fontes: ${FONTES_DE_LEITURA.join(", ")}`);
  process.exit(1);
}
// A regra tem de PEGAR o caso conhecido. Sem isto ela poderia passar a aceitar
// tudo — por exemplo se `lidas` virasse um Set com um curinga — e o gate
// imprimiria verde sobre o mesmo defeito que ele nasceu para achar.
const pegaria = !lidas.has("subtheme") && !lidas.has("chave_que_ninguem_le");
const liberaria = lidas.has("theme");
if (!pegaria || !liberaria) {
  console.error("check-query-lida: a REGRA nao se comporta como escrita.");
  console.error(`  reprovaria chave inventada: ${pegaria}   aprovaria 'theme': ${liberaria}`);
  process.exit(1);
}

if (falhas.length) {
  console.error("O ebook publica link para /banco com parametro que NINGUEM le:");
  for (const f of falhas) console.error("  - " + f);
  console.error(`\nChaves lidas pelo banco: ${[...lidas].sort().join(", ")}`);
  console.error("\nO link nao da 404: a pagina abre, e abre SEM contexto. Nada acusa.");
  process.exit(1);
}

console.log(
  `Query do ebook: ${conferidos} parametro(s) conferido(s) contra ${lidas.size} chaves que o banco le.`,
);
