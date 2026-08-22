import type { MetadataRoute } from "next";

import { urlAbsoluta } from "@/lib/site";

/**
 * O que pode ser indexado é exatamente o funil público — e nada além.
 *
 * A lista de proibições espelha `PUBLIC_EXACT`/`PUBLIC_PREFIXES` do `proxy.ts`
 * pelo complemento: tudo que o proxy exige sessão para abrir não deve estar num
 * índice de busca. Não é redundância com o gate de auth (esse é a segurança);
 * é higiene de índice — uma rota autenticada listada no Google rende ao aluno
 * um resultado que sempre cai no login, e ao produto uma página de zero valor
 * competindo com a que tem valor.
 *
 * `/facies/descadastrar` fica de fora por outro motivo: ela já declara
 * `robots: { index: false }` na própria página, e é o link que chega por
 * e-mail. Indexar um caminho de cancelamento é um jeito de o cancelamento
 * acontecer por acidente.
 *
 * ⚠️ Isto NÃO é controle de acesso. `robots.txt` é um pedido que raspador
 * educado respeita; quem protege rota é o proxy.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/hoje",
        "/banco",
        "/cards",
        "/evolucao",
        "/cronograma",
        "/preferencias",
        "/estatisticas",
        "/login",
        "/auth/",
        "/ativar",
        "/facies/descadastrar",
      ],
    },
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
