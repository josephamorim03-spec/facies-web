import { SITE_URL } from "@/lib/site";

/**
 * Documentos legais, lidos em SERVER COMPONENT.
 *
 * Não usa o helper `api()` de propósito: aquele fala com o BFF (`/api/...`) a
 * partir do navegador, com cookie de sessão. Aqui a leitura acontece no servidor
 * do Next, durante a renderização, para uma página pública — não há navegador,
 * não há cookie, e a rota upstream não exige nenhum dos dois.
 */

export type DocumentoLegal = {
  kind: string;
  publicado: boolean;
  version?: string | null;
  effective_from?: string | null;
  conteudo?: string | null;
};

function alvo(): string {
  // Mesma variável que o BFF usa. Em build/SSR o Next roda no servidor e alcança
  // o backend direto, sem passar por `facies.app`.
  const bruto = process.env.NEXT_API_PROXY_TARGET || `${SITE_URL}/api`;
  return bruto.replace(/\/+$/, "");
}

/**
 * Nunca lança. Documento legal indisponível não pode derrubar a página — ela
 * existe para dizer "ainda não publicamos", e uma exceção aqui viraria erro 500
 * numa rota que o aceite do cadastro linka.
 */
export async function buscarDocumentoLegal(kind: string): Promise<DocumentoLegal> {
  const ausente: DocumentoLegal = { kind, publicado: false };
  try {
    const resposta = await fetch(`${alvo()}/legal/${kind}`, {
      // O `revalidate` da página governa o cache; aqui só não queremos que o
      // fetch force `no-store` e anule aquilo.
      next: { revalidate: 3600 },
    });
    if (!resposta.ok) return ausente;
    return (await resposta.json()) as DocumentoLegal;
  } catch {
    return ausente;
  }
}
