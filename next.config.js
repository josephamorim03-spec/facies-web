/** @type {import('next').NextConfig} */

const faciesDataset = require("./src/data/facies/facies.json");
const slugsCurtos = require("./src/data/facies/slugs.json");

/**
 * As 138 bancas mudaram de endereço: `/facies/<slug-longo>` virou `/prova/<curto>`.
 *
 * ⚠️ O 301 É AQUI, e não num `redirect()` dentro da página. Este arquivo já
 * registra o caso (ver o bloco dos flashcards mais abaixo): um `redirect()` em
 * `page.tsx` continuou sendo PRÉ-RENDERIZADO como HTML, inclusive depois de
 * apagar `.next` e reconstruir do zero. O bloco `redirects()` é o mecanismo que
 * este repositório já usa para `/kros`, `/rota` e `/calendario`, e é verificável
 * por `curl -I`.
 *
 * `permanent: true` (308) porque a rota velha não volta. Os slugs longos são
 * derivados do `institution_key` e truncados em 80 caracteres pelo gerador do
 * kbank — impronunciáveis, e é por isso que saíram — mas eles já circulam em
 * grupo de WhatsApp e já estão indexados. Sem estas linhas, cada link colado
 * antes de hoje vira 404.
 *
 * Gerado do DADO, nunca digitado: uma lista de 138 caminhos escrita à mão
 * envelheceria na primeira regeração do dataset.
 */
function redirectsDasBancas() {
  return faciesDataset.bancas.flatMap((banca) => {
    const curto = slugsCurtos[banca.institution_key];
    if (!curto) return [];
    return [
      { source: `/facies/${banca.slug}`, destination: `/prova/${curto}`, permanent: true },
      // A imagem de Open Graph tinha rota própria sob o slug longo, e o raspador
      // de link do WhatsApp já a tem em cache com aquele endereço.
      {
        source: `/facies/${banca.slug}/opengraph-image`,
        destination: `/prova/${curto}/opengraph-image`,
        permanent: true,
      },
    ];
  });
}

const securityHeaders = [
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), camera=(), microphone=(), payment=(), browsing-topics=(), usb=(), serial=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Content-Security-Policy",
    // unsafe-inline in style-src is temporary — remove after all inline
    // style={{ }} props are replaced with Tailwind/CSS-var classes.
    value: [
      "default-src 'self'",
      // unsafe-inline is required by Next.js for its client-side runtime
      // (inline <script> tags for chunks, bootstrap, etc.). Without it the
      // entire app is non-interactive.
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com",
      // accounts.google.com needed for Google GSI stylesheet (gsi/style)
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https:",
      "frame-src https://accounts.google.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  poweredByHeader: false,
  // `NEXT_PUBLIC_*` e' inlined em BUILD, nao lido em runtime. Ate agosto/2026 o
  // unico lugar que definia esta flag era `vercel.json` (`build.env`), o que
  // fazia a build da Vercel divergir de toda build local e de CI: producao
  // servia o `/hoje` CANONICO enquanto qualquer outra build servia a
  // `LegacyTodayPage`.
  //
  // O efeito era um buraco de cobertura: os specs de e2e de `/hoje` exercitavam
  // uma tela que nenhum aluno ve, e a que producao entrega nao era testada por
  // ninguem. Um `.env.production` resolveria, mas `.gitignore` engole `.env.*`
  // (controle de seguranca legitimo) e o arquivo nunca chegaria ao repositorio.
  //
  // Declarar aqui faz local, CI e Vercel construirem a mesma coisa, que e' a
  // unica forma de um teste de `/hoje` significar alguma coisa. O override
  // explicito continua possivel por env.
  env: {
    NEXT_PUBLIC_STUDENT_AGENDA_V1: process.env.NEXT_PUBLIC_STUDENT_AGENDA_V1 ?? "1",
    // Flashcards fora de producao, de molho para voltar depois. Desligado por
    // padrao, e o par desta chave e `FLASHCARDS_ENABLED` no backend: uma sem a
    // outra deixa metade da feature ligada -- aba escondida com a agenda ainda
    // oferecendo o bloco, ou o inverso.
    NEXT_PUBLIC_FLASHCARDS: process.env.NEXT_PUBLIC_FLASHCARDS ?? "0",
  },
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // Os flashcards estao de molho (`NEXT_PUBLIC_FLASHCARDS`, default "0"). Com
    // a chave desligada, tudo que levava a eles passa a levar ao Hoje.
    //
    // ⚠️ `permanent: false`. As outras entradas desta lista sao 308 porque a
    // rota velha nunca mais volta; estas voltam quando a feature voltar, e um
    // 308 fica CACHEADO no navegador do aluno -- ele continuaria caindo no Hoje
    // depois de religarmos, sem nada no servidor explicando por que.
    //
    // ⚠️ E o redirect e AQUI, nao na pagina. Tentei primeiro um `redirect()`
    // dentro de `cards/page.tsx`: o build continuou pre-renderizando a tela
    // normalmente (`registros.html` com o Caderno dentro, `x-nextjs-prerender:
    // 1`), inclusive depois de apagar `.next` e reconstruir do zero. Este bloco
    // e o mecanismo que o repo ja usa para `/kros`, `/rota` e `/calendario`, e e
    // verificavel por `curl -I`.
    const flashcards = process.env.NEXT_PUBLIC_FLASHCARDS === "1";
    const paraOsCards = (destino) => (flashcards ? destino : "/hoje");
    return [
      // Link curto por prova. O canal deste produto e o print colado em
      // grupo, e link longo com parametro morre no boca a boca (§11.3).
      // Permanente: preserva o valor do link quando o dominio migrar.
      //
      // Precisa estar em `PUBLIC_EXACT` do `proxy.ts` tambem -- o proxy roda
      // antes deste redirect e mandaria `/enamed` para o login.
      { source: "/enamed", destination: "/prova/enamed", permanent: true },
      // As bancas institucionais mudaram de `/facies/<longo>` para `/prova/<curto>`.
      ...redirectsDasBancas(),
      { source: "/praticar", destination: "/banco", permanent: true },
      { source: "/banco-de-questoes", destination: "/banco", permanent: true },
      {
        source: "/banco-de-questoes/sessao/:sessionId",
        destination: "/banco/sessao/:sessionId",
        permanent: true,
      },
      { source: "/revisar", destination: paraOsCards("/cards"), permanent: flashcards },
      { source: "/cards-adaptativos", destination: paraOsCards("/cards"), permanent: flashcards },
      { source: "/revisao-turbo", destination: paraOsCards("/cards"), permanent: flashcards },
      { source: "/caderno", destination: paraOsCards("/cards/registros"), permanent: flashcards },
      // As duas rotas vivas dos flashcards. Ficam FORA da lista quando a chave
      // esta ligada, senao `/cards` redirecionaria para si mesmo em laco.
      ...(flashcards
        ? []
        : [
            { source: "/cards", destination: "/hoje", permanent: false },
            { source: "/cards/registros", destination: "/hoje", permanent: false },
          ]),
      { source: "/acompanhar", destination: "/evolucao", permanent: true },
      { source: "/estatisticas", destination: "/evolucao", permanent: true },
      { source: "/dados-e-relatorios", destination: "/evolucao", permanent: true },
      { source: "/dados-e-relatorios/:path*", destination: "/evolucao", permanent: true },
      // O historico saiu de /evolucao e virou pagina propria sob o Banco. Estes
      // dois aliases prometem o historico: apontados para /evolucao eles
      // aterrissam nos Graficos, calados — que e exatamente o bug que
      // `banco.historico.spec.ts` existe para impedir.
      { source: "/revisoes", destination: "/banco/historico", permanent: true },
      // `/cronograma` e' a canonica: e' o nome que a tela usa com o aluno e o
      // diretorio real da pagina. O 308 estava invertido -- mandava a canonica
      // para o alias, e o proprio `app/planejamento/page.tsx` so reexportava
      // `app/cronograma/page.tsx`.
      { source: "/planejar", destination: "/cronograma", permanent: true },
      { source: "/planejamento", destination: "/cronograma", permanent: true },
      { source: "/calendario", destination: "/cronograma", permanent: true },
      { source: "/rotina-e-metas", destination: "/preferencias", permanent: true },
      { source: "/perfil", destination: "/preferencias", permanent: true },
      // A tela deixou de se chamar Kros e virou Rota: o rotulo do menu e a URL
      // precisam dizer a mesma coisa. `Kros` continua sendo a marca do motor
      // (status bar, boot), so nao e mais nome de destino.
      // A aba Rota morreu com a pergunta de tempo e energia que a justificava.
      // Quem tem o endereço salvo cai no Hoje, que é onde a decisão passou a
      // morar — inteira, e já dimensionada.
      { source: "/kros", destination: "/hoje", permanent: true },
      { source: "/rota", destination: "/hoje", permanent: true },
    ];
  },
};

module.exports = nextConfig;
