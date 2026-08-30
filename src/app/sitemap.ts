import type { MetadataRoute } from "next";

import { bancasComPagina, GERADO_EM } from "@/lib/facies";
import { urlAbsoluta } from "@/lib/site";
import { todasAsProvas } from "@/lib/provas";

/**
 * O mapa do funil público.
 *
 * Só entram páginas que **existem sem sessão** e que carregam conteúdo próprio:
 * a home, o índice de bancas, uma página por banca e uma por prova. O app
 * autenticado fica de fora pelo mesmo motivo do `robots.ts` — uma rota que
 * sempre cai no login não é um resultado de busca, é um beco.
 *
 * `lastModified` vem de `GERADO_EM`, a data em que o dataset foi produzido no
 * kbank. É a verdade disponível: as páginas são estáticas e derivadas do JSON,
 * então elas mudam quando ele muda. Usar `new Date()` aqui seria pior que
 * omitir — diria "atualizado agora" toda vez que o sitemap fosse servido, e um
 * sinal que é sempre verdade não é sinal.
 *
 * `priority` é relativa dentro do próprio site e não promete posição nenhuma:
 * a home lidera, as provas vêm em seguida (é o que a pessoa busca por nome), e
 * as bancas fecham.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const atualizado = new Date(GERADO_EM);
  // Data inválida no dataset não pode derrubar o sitemap inteiro: sem
  // `lastModified` o arquivo continua válido, com ele quebrado não.
  const quando = Number.isNaN(atualizado.getTime()) ? undefined : atualizado;

  return [
    {
      url: urlAbsoluta("/"),
      lastModified: quando,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: urlAbsoluta("/facies"),
      lastModified: quando,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...todasAsProvas().map((prova) => ({
      url: urlAbsoluta(`/prova/${prova.slug}`),
      lastModified: quando,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    // As bancas vivem no MESMO namespace das provas desde que o slug encolheu:
    // `/prova/usp-sp`, e não mais `/facies/<80 caracteres>`. O endereço antigo
    // continua respondendo, como 308 em `next.config.js` — mas 308 não entra em
    // sitemap: sitemap declara canônico, e o canônico é o novo.
    ...bancasComPagina().map(({ slug }) => ({
      url: urlAbsoluta(`/prova/${slug}`),
      lastModified: quando,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
