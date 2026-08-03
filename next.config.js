/** @type {import('next').NextConfig} */

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
    return [
      { source: "/praticar", destination: "/banco", permanent: true },
      { source: "/banco-de-questoes", destination: "/banco", permanent: true },
      {
        source: "/banco-de-questoes/sessao/:sessionId",
        destination: "/banco/sessao/:sessionId",
        permanent: true,
      },
      { source: "/revisar", destination: "/cards", permanent: true },
      { source: "/cards-adaptativos", destination: "/cards", permanent: true },
      { source: "/revisao-turbo", destination: "/cards", permanent: true },
      { source: "/caderno", destination: "/cards/registros", permanent: true },
      { source: "/acompanhar", destination: "/evolucao", permanent: true },
      { source: "/estatisticas", destination: "/evolucao", permanent: true },
      { source: "/dados-e-relatorios", destination: "/evolucao", permanent: true },
      { source: "/dados-e-relatorios/:path*", destination: "/evolucao", permanent: true },
      { source: "/revisoes", destination: "/evolucao", permanent: true },
      // `/cronograma` e' a canonica: e' o nome que a tela usa com o aluno e o
      // diretorio real da pagina. O 308 estava invertido -- mandava a canonica
      // para o alias, e o proprio `app/planejamento/page.tsx` so reexportava
      // `app/cronograma/page.tsx`.
      { source: "/planejar", destination: "/cronograma", permanent: true },
      { source: "/planejamento", destination: "/cronograma", permanent: true },
      { source: "/calendario", destination: "/cronograma", permanent: true },
      { source: "/rotina-e-metas", destination: "/preferencias", permanent: true },
      { source: "/perfil", destination: "/preferencias", permanent: true },
    ];
  },
};

module.exports = nextConfig;
