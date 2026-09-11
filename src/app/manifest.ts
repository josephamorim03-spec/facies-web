import type { MetadataRoute } from "next";

import { SITE_NAME, SITE_QUALIFICADOR } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` PINA a identidade do app instalado.
    //
    // Sem ele o navegador identifica a instalação pelo `start_url`, e mudar o
    // `start_url` — como esta versão faz — passa a ser tratado como um app
    // DIFERENTE: quem já instalou fica com um ícone órfão que não recebe mais
    // atualização, e um segundo ícone aparece do lado. Com `id` fixo em "/",
    // que é o valor que o `start_url` tinha, a instalação existente continua
    // sendo a mesma.
    id: "/",
    // O qualificador é obrigatório na primeira aparição da marca em contexto
    // novo, e o diálogo de instalação é um: ali "Fácies" chega sozinha, sem a
    // página em volta para explicá-la.
    name: `${SITE_NAME} — ${SITE_QUALIFICADOR}`,
    // O `short_name` é o que cabe embaixo do ícone (~12 caracteres): só a marca.
    short_name: SITE_NAME,
    description: "Inteligência de prova: como a sua prova cobra, e um plano que cabe na sua escala de plantão.",
    // `/hoje`, e não `/`.
    //
    // Quem instalou o app é aluno, e `/` é o funil público — página de marketing
    // para quem ainda não entrou. Um aluno logado abrindo pelo ícone carregava a
    // home pública, esperava o `fetch("/api/profile")` do
    // `RedirectIfAuthenticated` e só então chegava ao app: uma piscada de página
    // errada em TODA abertura.
    //
    // Sem sessão, `/inicio` cai no login — que é o destino certo para quem abre
    // um app instalado sem estar logado.
    //
    // ⚠️ Mudou de `/hoje` para `/inicio` em 2026-09-10. O ícone na tela inicial
    // do telemóvel é a porta mais usada de um app instalado; deixá-la na agenda
    // do dia faria a home nova ser a tela que menos gente vê.
    start_url: "/inicio",
    // O escopo continua em "/": o app instalado precisa alcançar `/login`,
    // `/ativar` e as páginas públicas sem sair para o navegador.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F6F4",
    theme_color: "#096F63",
    lang: "pt-BR",
    dir: "ltr",
    icons: [
      {
        src: "/icon-192.png?v=20260822f",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=20260822f",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // `maskable` e um DESENHO diferente, nao o mesmo arquivo com outro rotulo.
      // O sistema operacional recorta o icone na forma dele (circulo, squircle,
      // gota), e so os 80% centrais sobrevivem — reusar o `any` aqui, como
      // estava, faz o Android cortar o canto arredondado e o acento encostar na
      // borda. Este tem sangria cheia e o glifo reduzido para a zona segura.
      {
        src: "/icon-512-maskable.png?v=20260822f",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
