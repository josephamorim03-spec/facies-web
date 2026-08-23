/**
 * Instrumentação do funil público da Fácies.
 *
 * Por que isto existe antes de qualquer otimização de conversão: sem estes
 * eventos, o teste que decide o projeto é incontável. O §10 diz que o critério é
 * "print circulando em grupo sem você ter pedido", e o §22 transforma isso no
 * primeiro gatilho de abandono ("zero compartilhamento espontâneo em 4 semanas →
 * pare e reformule a comunicação"). As duas frases pressupõem um contador que
 * não existia.
 *
 * O envio NUNCA quebra a página. Telemetria que derruba a tela que ela deveria
 * medir é pior que telemetria nenhuma — e a landing é a primeira impressão do
 * funil inteiro.
 */

/** Espelha a allowlist do backend (`EVENTOS` em `facies_funnel_repo.py`). */
export type EventoFacies =
  | "facies_vista"
  | "facies_banca_trocada"
  | "facies_copiada"
  | "facies_pagina_aberta"
  | "diagnostico_clicado"
  //: Clique no card da prova em destaque da home. Sem ele, a transicao
  //: home -> /prova/[slug] era cega: dava para saber quantos viam a home e
  //: nao quantos seguiam para a prova nacional, que e o atalho da maioria.
  | "destaque_clicado";

/**
 * O BFF recusa mutação sem este header (proteção de origem). Não é opcional:
 * sem ele o proxy responde 403 e o evento some em silêncio.
 */
const CSRF: HeadersInit = {
  "Content-Type": "application/json",
  "X-KrosMed-CSRF": "1",
};

export function registrarEvento(evento: EventoFacies, banca?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/facies/sinal", {
      method: "POST",
      credentials: "same-origin",
      headers: CSRF,
      body: JSON.stringify({ evento, banca: banca ?? null }),
      // `keepalive` para o evento sobreviver à navegação: "copiou e saiu" é
      // justamente o comportamento que mais importa medir, e é o que uma
      // requisição normal perde ao ser cancelada na saída da página.
      keepalive: true,
    }).catch(() => {
      /* medir nunca pode quebrar a página */
    });
  } catch {
    /* idem */
  }
}

export type ResultadoInteresse = "ok" | "invalido" | "limitado" | "erro";

export async function registrarInteresse(
  email: string,
  banca: string | null,
): Promise<ResultadoInteresse> {
  try {
    const resposta = await fetch("/api/facies/interesse", {
      method: "POST",
      credentials: "same-origin",
      headers: CSRF,
      // `consentimento` é explícito no corpo, e não inferido do envio: sem prova
      // de consentimento não há base legal (§19), e "ele clicou em Salvar" não
      // é prova de nada quando ninguém escreveu no que ele consentiu.
      body: JSON.stringify({ email, banca, consentimento: true }),
    });
    if (resposta.status === 429) return "limitado";
    if (resposta.status === 400 || resposta.status === 422) return "invalido";
    if (!resposta.ok) return "erro";
    return "ok";
  } catch {
    return "erro";
  }
}
