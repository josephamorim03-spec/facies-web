/**
 * Loader que permite ao Node puro importar os módulos do app por `@/`.
 *
 * ## Por que existe
 *
 * Os testes de `tests/unit/` seguem a convenção de NÃO importar módulo com alias
 * `@/` — o runner `node --test` não resolve o alias. Mas o smoke test da central
 * de mídia precisa chamar as funções REAIS (`cartao.ts`, `facies.ts`, `provas.ts`)
 * para provar que a peça renderiza; reescrevê-las no teste seria criar uma
 * segunda verdade, que é o defeito que o próprio `cartao.ts` já registra ter
 * corrigido.
 *
 * Este loader resolve `@/x` → `src/x` (tentando `.ts`, `.tsx`, `.json`) e serve
 * `.json` direto, porque o import do TS não carrega `with { type: "json" }` e o
 * Node exige o atributo. Node 24 já faz type-stripping de `.ts` sozinho.
 *
 * Uso:
 *
 *   node --experimental-strip-types --loader ./scripts/lib/alias-loader.mjs scripts/smoke-midia-peca.mjs
 *
 * `--experimental-strip-types` é no-op no Node 23.6+ e obrigatório no 22.6–23.5
 * — mesma exigência do `test:unit` deste repositório.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const SRC = resolvePath(process.cwd(), "src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = resolvePath(SRC, specifier.slice(2));
    for (const ext of [".ts", ".tsx", ".json", ""]) {
      const candidate = base + ext;
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    throw new Error("alias nao resolvido: " + specifier);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    return { format: "json", source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
