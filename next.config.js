/** @type {import('next').NextConfig} */

const faciesDataset = require("./src/data/facies/facies.json");
const slugsCurtos = require("./src/data/facies/slugs.json");

/**
 * 🚨 UMA FONTE SÓ PARA OS FLASHCARDS — as duas leituras divergiam NESTE arquivo.
 *
 * O bloco `env` declarava o default (`?? "0"`), que é o que vai inlined no
 * bundle do cliente; o `redirects()` lia `process.env.NEXT_PUBLIC_FLASHCARDS`
 * **cru**, sem o default. Enquanto o valor foi "0" nos dois, ninguém notou —
 * mas ligar pelo default deixaria o cliente a achar que a aba existe e o
 * `redirects()` a mandar `/cards` para `/hoje`. Metade da feature ligada, que é
 * exatamente o defeito que o comentário do bloco `env` avisava sobre as chaves
 * do front e do backend, dentro do mesmo ficheiro.
 *
 * ⚠️ O PAR CONTINUA OBRIGATÓRIO: `FLASHCARDS_ENABLED` no backend impede a
 * agenda de oferecer "Revisar cards no ponto". Ligar só um lado dá aba que não
 * leva a nada, ou agenda a prometer o que a barra esconde.
 *
 * 2026-09-10: default passa a "1" a pedido do operador ("ligar as duas agora").
 */
const FLASHCARDS = (process.env.NEXT_PUBLIC_FLASHCARDS ?? "1") === "1";

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

// Uma leitura só do ambiente, usada pelos três pontos abaixo que dependem dele
// (HSTS, `unsafe-eval` e `ws:`). Repetir a comparação em cada um é como as três
// cópias divergem quando alguém troca uma.
const emDesenvolvimento = process.env.NODE_ENV !== "production";

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
      //
      // 🚨 `unsafe-eval` SÓ EM DESENVOLVIMENTO, e sem ele o `next dev` não
      // hidrata. Medido em 2026-09-10, com instrumentação do navegador:
      //
      //   CONSOLE(error): eval() is not supported in this environment. If this
      //   page was served with a `Content-Security-Policy` header, make sure
      //   that `unsafe-eval` is included.
      //
      // O bundle de DEV usa `eval()` para os módulos (é assim que o HMR troca
      // um módulo sem recarregar a página); o de produção não. Sem hidratar,
      // NENHUM `useEffect` roda — e o modo de falha é cruel, porque a página
      // renderiza bonita e completa: só não reage. Foi assim que dois specs
      // ficaram vermelhos parecendo defeito da tela, quando o que faltava era
      // a página estar viva.
      //
      // ⚠️ Produção fica BYTE POR BYTE igual: em `next build` o valor não muda,
      // e é por isso que o e2e do repositório exige build de produção em vez de
      // `next dev`. Essa exigência não era burocracia — era o que mantinha o
      // e2e verde apesar deste defeito.
      `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""} https://accounts.google.com https://www.gstatic.com`,
      // accounts.google.com needed for Google GSI stylesheet (gsi/style)
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      "img-src 'self' data: blob: https:",
      // `ws:` só em desenvolvimento, pelo mesmo motivo: o HMR do Next abre
      // `ws://127.0.0.1:3000/_next/webpack-hmr`, e a mesma instrumentação
      // registrou o handshake sendo recusado. Produção não abre WebSocket
      // nenhum, então o valor lá continua idêntico.
      `connect-src 'self' https:${emDesenvolvimento ? " ws://127.0.0.1:* ws://localhost:*" : ""}`,
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
    // Flashcards LIGADOS desde 2026-09-10, a pedido do operador. O valor vem da
    // constante do topo -- ler o env outra vez aqui foi como as duas leituras
    // deste ficheiro divergiram. O par obrigatorio continua sendo
    // `FLASHCARDS_ENABLED` no backend.
    NEXT_PUBLIC_FLASHCARDS: FLASHCARDS ? "1" : "0",
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
    // A constante do topo do ficheiro, e não uma segunda leitura do env: eram
    // duas fontes para a mesma verdade, e divergiam no default.
    const flashcards = FLASHCARDS;
    const paraOsCards = (destino) => (flashcards ? destino : "/hoje");
    return [
      // ── `www` VAI PARA O APEX ──────────────────────────────────────────
      //
      // `www.facies.app` respondia 200 e servia o app SEM redirecionar, o que
      // fazia dele uma ORIGEM propria. Duas consequencias, e a segunda morde:
      //
      // 1. duas URLs canonicas para o mesmo conteudo, dividindo sinal de busca;
      // 2. o "Entrar com Google" QUEBRA no `www` com `origin_mismatch`. As
      //    origens JavaScript autorizadas do OAuth casam por igualdade exata de
      //    esquema, dominio e porta, e curinga e' proibido -- entao `www`
      //    precisaria de entrada propria no console do Google, e nada na tela
      //    explicaria a falha para quem chegasse por ele.
      //
      // Redirecionar resolve os dois, e deixa o console com UMA origem.
      //
      // ⚠️ 308 aqui, ao contrario do bloco dos flashcards abaixo. Aquele e' 307
      // porque a rota volta quando a feature voltar; este nao volta -- o host
      // canonico do produto e' o apex, e o 308 e' o que consolida o sinal de
      // busca no lugar certo. Um 307 manteria os dois hosts competindo.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.facies.app" }],
        destination: "https://facies.app/:path*",
        permanent: true,
      },
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
      // ⚠️ AS SEIS QUE ERAM PAGINA E VIRARAM REGRA.
      //
      // `/today`, `/semana`, `/setup`, `/desempenho`, `/agenda-operacional` e
      // `/provas` existiam como `page.tsx` de 5 a 13 linhas cujo corpo inteiro
      // era `redirect(...)`. Redirect que mora em pagina custa um render de
      // servidor para nao desenhar nada, e -- pior -- fica invisivel para quem
      // le esta lista procurando o mapa de rotas do app.
      //
      // ⚠️ NENHUMA das seis estava aqui, ao contrario do que eu supus: apagar
      // as paginas sem estas linhas teria criado seis 404. E `/agenda-operacional`
      // nao e sequer legado morto -- o fluxo de importacao do cronograma navega
      // para ela em 21 lugares, como alvo de saida.
      // ⚠️ ESTES SEIS SAO 307, E NAO 308 — a mesma razao do `/cards` acima.
      //
      // Eles substituem paginas que FORAM APAGADAS (eram `page.tsx` de uma linha,
      // so com `redirect()`). Apagar reverte-se; e um 308 fica cacheado no
      // navegador de quem visitou, entao a rota que voltasse continuaria a
      // desviar para sempre naquele aparelho, sem nada no servidor a explicar
      // porque. O `/provas` e o caso mais claro: o comentario da pagina que saiu
      // dizia que ele tinha vocacao de voltar.
      //
      // O custo do 307 e um pedido a mais por visita a um alias que quase
      // ninguem usa. O custo do 308 errado e irreversivel do lado de fora.
      { source: "/today", destination: "/hoje", permanent: false },
      { source: "/semana", destination: "/hoje", permanent: false },
      { source: "/setup", destination: "/", permanent: false },
      { source: "/desempenho", destination: "/cronograma", permanent: false },
      { source: "/agenda-operacional", destination: "/cronograma/mes", permanent: false },
      { source: "/provas", destination: "/banco/historico", permanent: false },
      // ── O MES GANHOU ROTA, E `?view=month` PASSOU A ENCAMINHAR ──────────
      //
      // "Semana" e "Mes" viraram secoes da barra do Plano, e `navConfig` casa
      // secao por PATHNAME (`normalizePathname` corta a query antes de
      // comparar). Enquanto as duas visoes dividiam `/cronograma`, elas
      // empatavam no comprimento do casamento e a barra acendia sempre a mesma
      // -- o aluno no mes lia "Semana" acesa.
      //
      // O encaminhamento e AQUI, e nao num `redirect()` dentro de
      // `cronograma/page.tsx`, pela razao ja medida no bloco dos flashcards
      // acima: `redirect()` em pagina continuou a ser pre-renderizado como
      // HTML. `has` casa a query, e o Next reenvia os restantes parametros
      // (`anchor`, `day`) sozinho.
      //
      // 307 e nao 308: `?view=month` circula em link colado e no historico do
      // aparelho, e um 308 ficaria cacheado para sempre no navegador de quem o
      // abriu -- mesmo raciocinio das seis linhas acima.
      {
        source: "/cronograma",
        has: [{ type: "query", key: "view", value: "month" }],
        destination: "/cronograma/mes",
        permanent: false,
      },
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

/**
 * Limitador de workers da geracao estatica, para maquina com pouca RAM.
 *
 * O build gera 323 paginas estaticas e cada rota `opengraph-image` renderiza uma
 * imagem por libvips. Com 7 workers em paralelo isso pede varios GB, e numa
 * maquina de 7,7 GB com o editor aberto o build morre com
 * `vips_tracked: out of memory` -- em paginas DIFERENTES a cada tentativa, que e'
 * a assinatura de falta de recurso e nao de defeito no codigo.
 *
 * Sem `NEXT_BUILD_CPUS` no ambiente, nada muda: `undefined` deixa o Next escolher
 * como sempre escolheu. E' um escape para build local, nao uma mudanca de padrao.
 */
const cpusDoBuild = Number(process.env.NEXT_BUILD_CPUS) || undefined;
if (cpusDoBuild) {
  nextConfig.experimental = { ...(nextConfig.experimental || {}), cpus: cpusDoBuild };
}

module.exports = nextConfig;
