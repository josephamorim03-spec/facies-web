"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { FaciesReport } from "@/components/facies/FaciesReport";
import { getFaciesDaBanca, getMyTargetExam } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";

/**
 * O mapa da prova — artboard `9a`, "A cara da UNIFESP".
 *
 * ## A ponte que faltava, e que existia o tempo todo
 *
 * A leitura da banca so existia PUBLICA, fora da casca do app. Trazer para
 * dentro dependia de casar a prova-alvo do aluno com a banca do dataset, e eu
 * cheguei a registrar que isso podia nao casar. Casa:
 * `StudentTargetExamItem.institution_key` e a MESMA chave de
 * `Banca.institution_key`, porque `student_objectives_service` valida a chave
 * declarada contra o vocabulario de instituicoes do banco de questoes, que e de
 * onde `build_facies_dataset.py` tambem le. Chave inventada e recusada no
 * onboarding com `unknown_institution_key`.
 *
 * ⚠️ NAO confundir com `institution_id`, que o objetivo (`ObjectiveCatalogItemV2`)
 * carrega. Aquele e o programa no catalogo de vagas; este e a banca no acervo.
 * Sao vocabularios diferentes e nao se convertem um no outro.
 *
 * ## O que esta tela AINDA nao e
 *
 * O `9a` tem tres abas -- "A prova", "A prova e voce" e "Comparar". Esta entrega
 * e a primeira: a leitura da prova, a mesma que a landing serve, dentro do app.
 * A segunda depende de cruzar a facies com a proficiencia do aluno
 * (`GET /student/competency-mastery`, ja no ar); a terceira, de escolher a
 * segunda banca. Anunciar as tres com uma pronta seria o defeito que a secao das
 * nove medidas custou a consertar.
 */
export function MapaClientPage() {
  const { token, tokenResolved } = useAuthToken();

  const provaAlvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    // A prova-alvo muda quando o aluno a troca, nao durante a leitura.
    staleTime: 300_000,
  });

  // A de maior prioridade, que e a mesma regra de `objetivoPrincipal`.
  const alvo = [...(provaAlvo.data?.items ?? [])].sort(
    (a, b) => a.priority - b.priority,
  )[0];
  const chave = alvo?.institution_key ?? null;

  const facies = useQuery({
    queryKey: queryKeys.faciesDaBanca(chave ?? ""),
    queryFn: () => getFaciesDaBanca(chave as string),
    enabled: Boolean(chave),
    // Dataset estatico: so muda com deploy.
    staleTime: 3_600_000,
  });

  if (!tokenResolved || provaAlvo.isPending) {
    return (
      <div className="space-y-4" aria-label="Mapa da prova carregando">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (provaAlvo.isError) {
    return <Alert variant="danger">Não consegui ler a sua prova-alvo agora.</Alert>;
  }

  // SEM prova declarada. Nao e erro: e o estado de quem ainda nao escolheu, e a
  // tela precisa levar ao lugar onde se escolhe em vez de so avisar.
  if (!chave) {
    return (
      <div className="rounded-surface border border-edge bg-surface p-6">
        <h2 className="font-serif text-xl font-semibold text-ink">
          Escolha a sua prova para ver a cara dela
        </h2>
        <p className="mt-2 max-w-[52ch] text-base text-muted">
          O mapa mostra o que a sua banca repete, como ela escreve as questões e
          quanto pesa cada disciplina. Ele começa quando você diz qual prova vai
          fazer.
        </p>
        <Link
          href="/preferencias"
          className="paper-control mt-4 inline-flex min-h-11 items-center rounded-surface border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk"
        >
          Escolher a prova
        </Link>
      </div>
    );
  }

  if (facies.isPending) {
    return <Skeleton className="h-64 w-full" aria-label="Fácies carregando" />;
  }

  if (facies.isError) {
    return <Alert variant="danger">Não consegui carregar a leitura desta banca.</Alert>;
  }

  // A banca existe no catalogo de objetivos e NAO tem facies publicada. O
  // dataset so publica quem passa do piso de questoes recentes, entao este caso
  // e real e precisa dizer a verdade em vez de mostrar tela vazia.
  if (!facies.data) {
    return (
      <div className="rounded-surface border border-edge bg-surface p-6">
        <h2 className="font-serif text-xl font-semibold text-ink">
          Ainda não há leitura publicada da {alvo?.label ?? "sua prova"}
        </h2>
        <p className="mt-2 max-w-[52ch] text-base text-muted">
          A cara de uma prova só é publicada quando há questões recentes
          suficientes para a medida não ser ruído. Assim que houver, ela aparece
          aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif font-semibold text-ink">
          A cara da {facies.data.nome}
        </h1>
        {/* A janela e o denominador da leitura, e o handoff pede que numero
            nunca apareca sem ele. */}
        <p className="paper-eyebrow mt-1">
          {facies.data.questoes_total.toLocaleString("pt-BR")} questões
          {facies.data.primeiro_ano && facies.data.ultimo_ano
            ? ` · ${facies.data.primeiro_ano}–${facies.data.ultimo_ano}`
            : ""}
        </p>
      </div>
      <FaciesReport banca={facies.data} />
    </div>
  );
}
