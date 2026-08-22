import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * O endereço público, e o que ele exige de quem for compartilhado.
 *
 * O funil inteiro existe para viajar em WhatsApp. Três coisas quebram esse
 * caminho em silêncio — o build passa, a página abre certa no navegador, e só
 * quem recebe o link descobre:
 *
 * 1. **Sem `metadataBase`**, o Next emite `og:image` RELATIVO, e nenhum raspador
 *    de link resolve caminho relativo. O cartão chega sem imagem.
 * 2. **Sem canônico**, `?utm_source=whatsapp` e `?fbclid=...` viram URLs
 *    distintas para o índice, e a autoridade se divide entre cópias da mesma
 *    página.
 * 3. **Domínio errado** num default manda o leitor para lugar nenhum — e o link
 *    de cancelamento do e-mail viaja por aí.
 */
const RAIZ = fileURLToPath(new URL("../../src", import.meta.url));

function ler(rel) {
  return readFileSync(join(RAIZ, rel), "utf8");
}

function varrer(dir) {
  return readdirSync(dir).flatMap((e) => {
    const cheio = join(dir, e);
    return statSync(cheio).isDirectory() ? varrer(cheio) : /\.(tsx?|mjs)$/.test(cheio) ? [cheio] : [];
  });
}

test("o endereco publico e facies.app, SEM acento", () => {
  const site = ler("lib/site.ts");
  assert.match(site, /https:\/\/facies\.app/);
  // Domínio com diacrítico vira punycode (`xn--fcies-hva.app`) na barra do
  // navegador e em cliente de e-mail: a marca apareceria deformada exatamente
  // onde precisa ser reconhecida. Acento é para o TEXTO (§3.3).
  assert.doesNotMatch(site, /https:\/\/f[áa]cies\.app/i.test(site) ? /$^/ : /xn--/);
  assert.doesNotMatch(site, /fácies\.app/);
});

test("a marca em prosa mantem o acento", () => {
  const site = ler("lib/site.ts");
  assert.match(site, /SITE_NAME = "Fácies"/);
  // O qualificador é obrigatório na primeira aparição em contexto novo, e
  // resultado de busca, cartão de link e ícone na tela inicial são três deles.
  assert.match(site, /SITE_QUALIFICADOR = "inteligência de prova"/);
});

test("SITE_URL nunca termina em barra", () => {
  // Todo consumidor concatena `/algo`. Com barra final o canônico sai `//algo`,
  // que é uma URL diferente para o índice e uma referência protocol-relative
  // para o navegador.
  const site = ler("lib/site.ts");
  assert.match(site, /replace\(\/\\\/\+\$\/, ""\)/);
});

test("o layout declara metadataBase", () => {
  const layout = ler("app/layout.tsx");
  assert.match(layout, /metadataBase:\s*new URL\(SITE_URL\)/);
});

test("toda pagina publica declara canonico", () => {
  // Se uma página nova entrar no funil sem canônico, este teste avisa antes de
  // o link começar a circular.
  for (const rel of [
    "app/page.tsx",
    "app/facies/page.tsx",
    "app/facies/[banca]/page.tsx",
    "app/prova/[slug]/page.tsx",
  ]) {
    const fonte = ler(rel);
    assert.match(fonte, /alternates:\s*\{\s*canonical:/, `${rel} sem canônico`);
    assert.match(fonte, /openGraph:\s*\{/, `${rel} sem Open Graph`);
  }
});

test("o dominio antigo nao volta por nenhuma porta", () => {
  const ofensores = [];
  for (const arquivo of varrer(RAIZ)) {
    // O schema gerado vem do OpenAPI e não é editado à mão.
    if (arquivo.includes("generated")) continue;
    const fonte = readFileSync(arquivo, "utf8");
    if (/krosmed\.(com|app|vercel)/i.test(fonte)) ofensores.push(arquivo);
  }
  assert.deepEqual(ofensores, [], `domínio aposentado em: ${ofensores.join(", ")}`);
});

test("robots nao deixa o app autenticado ser indexado", () => {
  const robots = ler("app/robots.ts");
  // Não é controle de acesso — quem protege rota é o proxy. É higiene de
  // índice: rota que sempre cai no login não é resultado de busca, é beco.
  for (const rota of ["/hoje", "/banco", "/cards", "/evolucao", "/admin", "/api/"]) {
    assert.ok(robots.includes(`"${rota}"`), `robots.ts nao bloqueia ${rota}`);
  }
  // E o caminho de cancelamento fica fora: ele chega por e-mail, e indexá-lo é
  // um jeito de o cancelamento acontecer por acidente.
  assert.ok(robots.includes("/facies/descadastrar"));
  assert.match(robots, /sitemap:/);
});
