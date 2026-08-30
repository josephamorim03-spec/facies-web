import { NextResponse } from "next/server";

import { bancaPorInstitutionKey } from "@/lib/facies";

/**
 * Uma banca do dataset estatico, pela chave que o objetivo do aluno carrega.
 *
 * ## Por que uma rota, e nao props de server component
 *
 * A tela `/mapa` precisa da facies da banca-alvo DO ALUNO, e sao dois lados que
 * nao se encontram sozinhos:
 *
 *   - quem sabe qual e a banca e o cliente, porque a prova-alvo vem de
 *     `getMyTargetExam(token)` e a autenticacao deste app e por token no
 *     cliente -- nenhum server component daqui le a sessao;
 *   - quem tem o dado da banca e o servidor, porque `facies.json` tem 780 KB e
 *     mandar o dataset inteiro para o navegador por causa de uma banca seria
 *     trocar 5 KB uteis por 780.
 *
 * Entao o cliente descobre a chave e pede so a sua. Resposta tipica: ~5 KB.
 *
 * ⚠️ NAO e proxy do backend e nao precisa de sessao: o conteudo e o mesmo
 * dataset publico que a landing serve em `/facies/[banca]`. Nao ha nada aqui
 * que o aluno nao possa ver deslogado -- o que e privado e a PROVA-ALVO dele,
 * e essa continua vindo do backend autenticado.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const banca = bancaPorInstitutionKey(decodeURIComponent(key));
  if (!banca) {
    // 404 com corpo nomeado, e nao 200 com `null`: a tela precisa distinguir
    // "banca sem facies publicada" de "falhou a rede", e as duas viram estados
    // diferentes na interface.
    return NextResponse.json({ erro: "banca_sem_facies" }, { status: 404 });
  }
  return NextResponse.json(banca, {
    // O dataset so muda quando alguem commita um JSON novo, e o deploy invalida
    // o cache junto. Uma hora no CDN e conservador para um dado de cinco anos.
    headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
