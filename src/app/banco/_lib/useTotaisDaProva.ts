"use client";

/**
 * O tamanho de prova de cada banca — para o seletor parar de anunciar o treino.
 *
 * O ENARE aparecia com **530** e as seis provas somam **600**. Medido em
 * produção (2026-09-10): 530 = 67+90+95+96+93+89, a soma ano a ano já sem
 * anulada, desatualizada e duplicata. Certo para treino, errado num seletor que
 * está escolhendo qual **prova** fazer.
 *
 * Uma requisição por modalidade, agregada no banco: são ~270 instituições. Sem
 * agrupar seriam 2.102 linhas, e mandar tudo ao navegador por causa de um
 * número ao lado de cada nome é pagar 200 KB para exibir três dígitos.
 *
 * ⚠️ A guarda é `pronto` (o `tokenResolved` da página), e **nunca** `token`:
 * `getAuthToken()` devolve string vazia por desenho — a sessão vive em cookie
 * httpOnly que o BFF converte. `&& token` é um `return` incondicional, e já
 * matou este mesmo hook irmão em produção (`token-no-cliente-e-sempre-vazio`).
 */

import { useEffect, useState } from "react";

import { listQuestionBankExamTotals, type QuestionBankExamTotal } from "@/lib/api";

type Resultado = { grupo: string; linhas: QuestionBankExamTotal[] };

export function useTotaisDaProva(entrada: {
  token: string;
  /** `tokenResolved`: a auth já se resolveu. NÃO use `token`. */
  pronto: boolean;
  ehModoProva: boolean;
  /** `RPLUS` ou `ACESSO-DIRETO`. */
  accessGroup: string;
  incluirAnuladas: boolean;
}): Map<string, number> | null {
  const { token, pronto, ehModoProva, accessGroup, incluirAnuladas } = entrada;
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const ativo = Boolean(ehModoProva && pronto);
  const combina = resultado?.grupo === accessGroup;

  useEffect(() => {
    if (!ativo || combina) return;
    const controller = new AbortController();
    listQuestionBankExamTotals(token, { access_group: accessGroup }, controller.signal)
      .then((linhas) => setResultado({ grupo: accessGroup, linhas }))
      .catch(() => {
        // Aborto não é falha: o pedido foi trocado. Gravar `[]` faria o recorte
        // novo parecer "sem provas" em vez de "ainda carregando".
        if (controller.signal.aborted) return;
        setResultado({ grupo: accessGroup, linhas: [] });
      });
    return () => controller.abort();
  }, [accessGroup, ativo, combina, token]);

  if (!ativo || !combina || !resultado) return null;

  const mapa = new Map<string, number>();
  for (const linha of resultado.linhas) {
    // A anulada sai da conta quando o aluno não a pede — a mesma regra que o
    // seletor de ano usa, senão o total da banca e a soma dos anos discordam.
    const total = incluirAnuladas ? linha.total : linha.total - linha.annulled;
    if (total > 0) mapa.set(linha.institution_key, total);
  }
  return mapa;
}
