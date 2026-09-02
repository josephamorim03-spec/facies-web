/**
 * A mensagem legível de um erro de validação do backend.
 *
 * ## O que estava quebrado
 *
 * FastAPI devolve erro de validação do Pydantic assim:
 *
 *     {"detail": [{"loc": ["body","birth_date"],
 *                  "msg": "Value error, e necessario ter ao menos 18 anos"}]}
 *
 * `toAPIError` só sabia ler `detail` como string ou como objeto com `.message`.
 * Uma LISTA não casa com nenhum dos dois, então caía no fallback e o aluno via
 * **"Request failed: 422"** — em `/cadastro/completar`, que é tela obrigatória
 * no caminho de todo mundo que entra pelo Google.
 *
 * E o backend não estava sendo econômico: as mensagens são específicas e boas
 * ("e necessario ter ao menos 18 anos", "medico ja formado: informe o ano em que
 * concluiu"). Elas existiam e não chegavam. O comentário em `completar/page.tsx`
 * ainda dizia "a mensagem do backend é específica e mais útil que um genérico" —
 * verdade sobre o backend, mentira sobre o que a tela mostrava.
 *
 * ## Por que módulo próprio, e não dentro de `http.ts`
 *
 * `http.ts` importa `@/lib/auth`, e o `node --test` da suíte unitária resolve
 * ESM sem o alias do bundler: importar `http.ts` de um teste falha com
 * `ERR_MODULE_NOT_FOUND` antes de rodar um caso. Regra pura em arquivo sem
 * dependência é a mesma disciplina de `upstreamAuth.ts` e `rotasPublicas.ts`
 * nesta base — e é o que torna a regra exercitável.
 */

/** Pydantic v2 prefixa todo erro levantado por validador com o tipo dele. */
const _PREFIXO_PYDANTIC = /^(Value|Type|Assertion) error,\s*/i;

export function mensagemDeErroDeValidacao(rawDetail: unknown): string | null {
  if (!Array.isArray(rawDetail) || rawDetail.length === 0) return null;

  const mensagens = rawDetail
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const msg = (item as Record<string, unknown>).msg;
      if (typeof msg !== "string") return "";
      return msg.replace(_PREFIXO_PYDANTIC, "").trim();
    })
    .filter(Boolean);

  if (mensagens.length === 0) return null;
  // Vários campos inválidos de uma vez: a pessoa precisa dos dois, não do
  // primeiro — senão corrige um, reenvia, e descobre o outro.
  return [...new Set(mensagens)].join("; ");
}
