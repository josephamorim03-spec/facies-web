import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fácies",
    short_name: "Fácies",
    description: "Inteligência de prova: como a sua prova cobra, e um plano que cabe na sua escala de plantão.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F6F4",
    theme_color: "#0D4F4A",
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
