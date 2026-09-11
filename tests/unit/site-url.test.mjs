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
  // O qualificador é obrigatório na primeira aparição em contexto novo —
  // resultado de busca, cartão de link e ícone na tela inicial são três deles.
  //
  // Este teste NÃO trava o texto, trava a PROPRIEDADE. Travar a string faria
  // uma melhoria de copy parecer regressão, e foi exatamente o que aconteceu
  // quando "inteligência de prova" virou "a cara da sua prova" — que é melhor
  // porque explica o nome: *fácies*, em semiologia, é a cara característica que
  // uma doença dá ao paciente.
  const qualificador = site.match(/SITE_QUALIFICADOR = "([^"]+)"/);
  assert.ok(qualificador, "`SITE_QUALIFICADOR` sumiu");
  assert.ok(
    qualificador[1].length >= 12 && qualificador[1].length <= 40,
    `qualificador de ${qualificador[1].length} caracteres nao cabe num cartao de link`,
  );
  // Minúsculo: ele acompanha a marca numa linha só, e versal ali competiria
  // com o wordmark.
  assert.match(qualificador[1], /^[a-zà-ú]/);
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
  // `app/facies/[banca]/page.tsx` saiu da lista porque saiu do repositório: as
  // bancas passaram a viver em `/prova/<slug-curto>`, na mesma rota das provas,
  // e o endereço antigo é 308 em `next.config.js`. A rota que sobrou declara o
  // canônico das duas famílias.
  // ⚠️ CADA ROTA APONTA PARA QUEM DECLARA A METADATA DELA, e nem sempre é o
  // `page.tsx`. A home virou a landing v8, cujo `page.tsx` é fino de propósito
  // (`web/CLAUDE.md`: *"keep page files thin"*) e delega a
  // `_landing/Pagina.tsx` via `generateMetadata`. O canônico nunca saiu; quem
  // mudou de lugar foi o arquivo — e este teste reprovou por afirmar sobre a
  // LOCALIZAÇÃO do código em vez da propriedade "a rota emite canônico".
  //
  // O mapa é declarado, e não deduzido do import: seguir a delegação por regex
  // custaria trinta linhas de parser que falham em silêncio no primeiro
  // `export const metadata` ou re-export indireto. Mover a metadata de novo
  // custa atualizar uma linha aqui, e a mensagem de erro diz qual.
  for (const [rota, dono] of [
    ["/", "app/_landing/Pagina.tsx"],
    ["/facies", "app/facies/page.tsx"],
    ["/prova/[slug]", "app/prova/[slug]/page.tsx"],
  ]) {
    const fonte = ler(dono);
    assert.match(fonte, /alternates:\s*\{\s*canonical:/, `${rota} sem canônico (${dono})`);
    assert.match(fonte, /openGraph:\s*\{/, `${rota} sem Open Graph (${dono})`);
  }

  // E a delegação da home tem de continuar existindo. Sem esta linha o mapa
  // acima abriria um buraco: apagar o `generateMetadata` de `app/page.tsx`
  // deixaria a rota `/` sem canônico nenhum, e o teste passaria verde porque
  // `Pagina.tsx` — que ninguém mais chamaria — ainda o declara.
  assert.match(
    ler("app/page.tsx"),
    /export\s+function\s+generateMetadata\s*\([^)]*\)[^{]*\{\s*return\s+metadataDaLanding\(/,
    "app/page.tsx parou de delegar a metadata a _landing/Pagina.tsx",
  );
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
  // ⚠️ `/inicio` e `/mais` entraram com a barra nova (2026-09-10). O `/inicio` é
  // o mais importante da lista: ele virou a HOME do aluno, e uma home indexada
  // é a primeira coisa que aparece na busca e a primeira a cair no login.
  for (const rota of [
    "/inicio",
    "/mais",
    "/hoje",
    "/banco",
    "/cards",
    "/evolucao",
    "/admin",
    "/api/",
  ]) {
    assert.ok(robots.includes(`"${rota}"`), `robots.ts nao bloqueia ${rota}`);
  }
  // E o caminho de cancelamento fica fora: ele chega por e-mail, e indexá-lo é
  // um jeito de o cancelamento acontecer por acidente.
  assert.ok(robots.includes("/facies/descadastrar"));
  assert.match(robots, /sitemap:/);
});

test("o manifest identifica o app instalado e abre no lugar certo", () => {
  const manifest = ler("app/manifest.ts");

  // `id` fixo: sem ele o navegador identifica a instalação pelo `start_url`, e
  // mudar o `start_url` vira "outro app" — quem já instalou fica com um ícone
  // órfão que nunca mais atualiza, e um segundo aparece do lado.
  assert.match(manifest, /id:\s*"\/"/);

  // `/inicio` e não `/`: quem abre pelo ícone é aluno, e `/` é o funil público.
  // Abrir em `/` carregava a página de marketing, esperava o `fetch` do
  // `RedirectIfAuthenticated` e só então chegava ao app — uma piscada de página
  // errada em toda abertura.
  //
  // ⚠️ MUDOU DE `/hoje` PARA `/inicio` em 2026-09-10, e a asserção do `id` logo
  // acima é o que torna a mudança segura: com `id: "/"` fixo, a identidade da
  // instalação NÃO depende do `start_url`, então quem já instalou continua com
  // o mesmo app e passa a abrir na home nova. Sem o `id`, esta linha teria sido
  // um ícone órfão para toda a base instalada — e é por isso que as duas
  // asserções vivem na mesma prova.
  //
  // A home mudou porque a barra mudou: `/inicio` é o resumo, `/hoje` continua a
  // ser a agenda do dia. O ícone na tela inicial é a porta mais usada de um app
  // instalado; deixá-la na agenda faria a home nova ser a tela que menos gente
  // vê.
  assert.match(manifest, /start_url:\s*"\/inicio"/);
  // O escopo fica em "/" mesmo assim: o app instalado precisa alcançar
  // `/login` e `/ativar` sem sair para o navegador.
  assert.match(manifest, /scope:\s*"\/"/);

  // O qualificador é obrigatório no diálogo de instalação (contexto novo onde a
  // marca chega sozinha); o `short_name` é o que cabe embaixo do ícone.
  assert.match(manifest, /name:\s*`\$\{SITE_NAME\} — \$\{SITE_QUALIFICADOR\}`/);
  assert.match(manifest, /short_name:\s*SITE_NAME/);

  // Um desenho próprio para `maskable`: o SO recorta na forma dele e só os 80%
  // centrais sobrevivem. Reusar o ícone `any` faz o acento encostar na borda.
  const maskable = manifest.match(/src:\s*"([^"]*)"[^}]*purpose:\s*"maskable"/);
  assert.ok(maskable, "manifest sem ícone maskable");
  assert.match(maskable[1], /maskable/, "o `maskable` reusa o ícone `any`");
});
