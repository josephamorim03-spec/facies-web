"use client";

import { useQuery } from "@tanstack/react-query";

import { FaixaAreas } from "@/components/facies/FaixaAreas";
import { getFaciesDaBanca, getMyTargetExam } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * A faixa da prova no topo do Hoje — artboard `8b`.
 *
 * O `8b` abre com marca, `UNIFESP · 63 dias` e a faixa em sigla
 * (`CM 24 · CIR 22 · PED 18`). Ela nao e decoracao: e a unica coisa na tela que
 * lembra o aluno de QUAL prova ele esta estudando, todo dia, sem ele precisar
 * abrir nada.
 *
 * ## Duas consultas, e por que elas nao competem com a tela
 *
 * A prova-alvo (`institution_key`) vem de uma consulta e a facies dela de outra,
 * e a segunda depende da primeira — nao ha como paralelizar sem o backend
 * juntar as duas pontas.
 *
 * O que impede isso de virar cascata visivel:
 *
 *   - as duas tem `staleTime` longo (a prova-alvo muda quando o aluno a troca; o
 *     dataset, quando alguem faz deploy), entao na segunda visita do dia nenhuma
 *     das duas sai da maquina;
 *   - as CHAVES sao as mesmas de `/mapa` — quem passou pelo mapa ja chega aqui
 *     com as duas em cache, e vice-versa;
 *   - e ela devolve `null` enquanto carrega, em vez de esqueleto. A faixa e
 *     orientacao periferica; um bloco cinza pulsando acima da acao principal
 *     competiria com a unica decisao que esta tela tem.
 *
 * ⚠️ SILENCIO E O COMPORTAMENTO CERTO em toda falha aqui. Sem prova declarada,
 * banca sem facies publicada, rede caida — em nenhum desses casos o Hoje deve
 * mostrar erro: o aluno veio decidir o que estudar, e a faixa nao participa
 * dessa decisao. Quem precisa dizer "escolha sua prova" e o `/mapa`, que existe
 * para isso.
 */
export function FaixaDaProva() {
  const { token, tokenResolved } = useAuthToken();

  const provaAlvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    staleTime: 300_000,
  });

  const chave =
    [...(provaAlvo.data?.items ?? [])].sort((a, b) => a.priority - b.priority)[0]
      ?.institution_key ?? null;

  const facies = useQuery({
    queryKey: queryKeys.faciesDaBanca(chave ?? ""),
    queryFn: () => getFaciesDaBanca(chave as string),
    enabled: Boolean(chave),
    staleTime: 3_600_000,
  });

  const banca = facies.data;
  if (!banca || banca.areas.linhas.length === 0) return null;

  return (
    <FaixaAreas
      className="mt-3"
      altura="chip"
      legenda="sigla"
      rotulo={`Peso por disciplina na ${banca.nome}`}
      linhas={banca.areas.linhas.map((linha) => ({ rotulo: linha.rotulo, pct: linha.pct }))}
    />
  );
}
