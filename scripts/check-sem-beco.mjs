#!/usr/bin/env node
/**
 * Erro sem saída é beco sem saída.
 *
 * ## O que isto media, em 2026-09-06
 *
 * Seis `<Alert variant="danger">` de tela de aluno diziam "Não consegui
 * carregar…" e ofereciam **zero** ações — quatro no Mapa, um no Hoje e um na
 * semana do Cronograma. O aluno lia que algo falhou e ficava com a página
 * parada: nem botão, nem link, nem instrução. O único retry inline do app
 * inteiro estava escrito à mão dentro dos Gráficos.
 *
 * O desenho é explícito sobre isto no Banco — *"sem beco sem saída"* — e a
 * regra não é sobre filtros: é sobre nunca deixar o aluno num estado de onde
 * não se sai.
 *
 * ## O que este guard exige
 *
 * Todo `<Alert variant="danger">` em rota de aluno carrega `onRetry`, `action`
 * ou `onDismiss`. O primitivo (`components/ui/Alert.tsx`) tem os três, e
 * `onRetry` custa uma prop.
 *
 * ⚠️ `onDismiss` CONTA como saída, e a primeira versão deste guard não a
 * aceitava — reprovava três alertas que já estavam certos, entre eles o toast
 * da sessão. Um erro que a pessoa fecha não a prende em lado nenhum; o que
 * prende é o que fica na tela sem nada para fazer.
 *
 * ⚠️ **Só `danger`.** `warning` e `info` são avisos que acompanham conteúdo
 * vivo — "alguns dados estão incompletos" ao lado da tela que funciona — e
 * exigir ação deles produziria botão decorativo, que é o defeito oposto.
 *
 * ⚠️ Não cobre vazio (`EmptyState`, `SemBase`). Vazio tem causas legítimas sem
 * saída — "ainda não há leitura publicada desta banca" não tem o que oferecer.
 * Fica anotado como candidato a apertar, não fingido.
 */

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { semComentarios } from "./lib/fonte-visivel.mjs";

/**
 * ⚠️ `src/components` ENTRA. A primeira versão varria só `src/app` — e a
 * fronteira de erro partilhada (`ui/TelaDeErro`), que passou a servir cinco
 * rotas nesta mesma rodada, ficava invisível para a regra que ela devia
 * cumprir.
 */
const RAIZES = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];

/** Fora da superfície do aluno. */
const DIRETORIOS_IGNORADOS = new Set(["admin", "api"]);

function varrer(dir, achados = []) {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.isDirectory()) {
      if (DIRETORIOS_IGNORADOS.has(entrada.name)) continue;
      varrer(join(dir, entrada.name), achados);
    } else if (extname(entrada.name) === ".tsx") {
      const completo = join(dir, entrada.name);
      // Comentário é prosa: um registo que cite `<Alert variant="danger">` não
      // pode reprovar o lint.
      achados.push([relative(process.cwd(), completo), semComentarios(readFileSync(completo, "utf8"))]);
    }
  }
  return achados;
}

/**
 * O texto da tag de abertura, do `<Alert` até o `>` que a fecha.
 *
 * ⚠️ Um `[^>]*` NÃO serve: `onRetry={() => refetch()}` tem um `>` dentro da
 * seta, e a tag seria cortada no meio — o guard leria a metade sem `onRetry` e
 * reprovaria exatamente quem já está certo. Por isso a contagem de chaves.
 */
function tagDeAbertura(fonte, inicio) {
  let profundidade = 0;
  for (let i = inicio; i < fonte.length; i += 1) {
    const c = fonte[i];
    if (c === "{") profundidade += 1;
    else if (c === "}") profundidade -= 1;
    else if (c === ">" && profundidade === 0) return fonte.slice(inicio, i + 1);
  }
  return fonte.slice(inicio);
}

const arquivos = RAIZES.flatMap((raiz) => varrer(raiz));
const semSaida = [];
let conferidos = 0;

for (const [caminho, fonte] of arquivos) {
  let indice = fonte.indexOf("<Alert");
  while (indice !== -1) {
    const tag = tagDeAbertura(fonte, indice);
    if (/variant\s*=\s*"danger"/.test(tag)) {
      conferidos += 1;
      if (!/\b(?:onRetry|action|onDismiss)\s*=/.test(tag)) {
        semSaida.push({
          caminho,
          linha: fonte.slice(0, indice).split("\n").length,
        });
      }
    }
    indice = fonte.indexOf("<Alert", indice + 1);
  }
}

if (semSaida.length > 0) {
  console.error("Erro de tela de aluno sem saída:");
  for (const item of semSaida) {
    console.error(`- ${item.caminho}:${item.linha}`);
  }
  console.error(
    '\nTodo `<Alert variant="danger">` precisa de `onRetry`, `action` ou `onDismiss`. ' +
      "Dizer que falhou sem dizer o que fazer deixa a pessoa parada na página.",
  );
  process.exit(1);
}

console.log(`Sem beco: ${conferidos} erro(s) de aluno, todos com saída.`);
