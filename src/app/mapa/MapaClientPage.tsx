"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { FaciesReport } from "@/components/facies/FaciesReport";
import { MapaDaProva } from "@/components/facies/MapaDaProva";
import { getFaciesDaBanca, getMyCompetencyMastery, getMyTargetExam } from "@/lib/api";
import type { CompetencyMasteryItem } from "@/lib/api/domains/study-plan";
import type { Banca } from "@/lib/facies";
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
 * O `9a` tem tres abas -- "A prova", "A prova e você" e "Comparar". Esta entrega
 * e a primeira: a leitura da prova, a mesma que a landing serve, dentro do app.
 * A segunda depende de cruzar a facies com a proficiencia do aluno
 * (`GET /student/competency-mastery`, ja no ar); a terceira, de escolher a
 * segunda banca. Anunciar as tres com uma pronta seria o defeito que a secao das
 * nove medidas custou a consertar.
 */
/**
 * "A prova e você" — o artboard `12b`.
 *
 * A regra do desenho cabe numa linha, e está escrita nele:
 * **"tamanho é incidência · preenchimento é você"**. A grade não muda de forma;
 * muda de onde sai a tinta.
 *
 * ⚠️ "Você" é AMBÍGUO, e o desenho não desfaz a ambiguidade — o `12b` usa
 * placeholders e nenhuma palavra de direção. Preenchimento pode ser o quanto
 * você domina ou o quanto falta, e as duas leituras pintam a grade ao contrário
 * uma da outra.
 *
 * Resolvido pela coerência interna do componente: na aba da prova a tinta é
 * incidência, ou seja, **atenção**. Se aqui ela virasse domínio, o significado
 * da tinta inverteria entre duas abas da mesma grade. A legenda na tela diz
 * "preenchimento é o que falta" em vez da frase do artboard, porque legenda
 * ambígua sobre gráfico é pior que legenda que diverge do desenho.
 *
 * A junção é por `primary_subtheme`, e ela casa por construção: o gerador do
 * dataset preenche `mais_cai` com `r.primary_subtheme AS subtema`, e é a mesma
 * coluna que `competency_mastery` lê. Conferido nos dois lados antes de existir.
 *
 * ⚠️ A COBERTURA VAI NA TELA. O aluno tem domínio medido em alguns subtemas e em
 * outros não, e uma grade onde metade das células está no piso por falta de dado
 * parece uma grade onde o aluno vai mal em metade da prova. Dizer "34 dos 15
 * assuntos têm resposta sua" é o que separa as duas leituras.
 */
function EixoVoce({ banca }: { banca: Banca }) {
  const { token, tokenResolved } = useAuthToken();

  const proficiencia = useQuery({
    queryKey: queryKeys.competencyMastery,
    queryFn: () => getMyCompetencyMastery(token),
    enabled: tokenResolved,
    staleTime: 60_000,
  });

  if (proficiencia.isPending) {
    return <Skeleton className="h-64 w-full" aria-label="Proficiência carregando" />;
  }
  if (proficiencia.isError) {
    return <Alert variant="danger">Não consegui ler a sua proficiência agora.</Alert>;
  }

  const itens = proficiencia.data?.items ?? [];
  // ⚠️ `nao_avaliado` ENTRA no mapa, e nao vira tinta.
  //
  // Ele era descartado aqui, com o argumento certo -- o posterior encolhido
  // devolve um numero mesmo sem observacao, e pinta-lo afirmaria desempenho
  // onde nao houve resposta. So' que descartar tinha o mesmo efeito: a celula
  // caia no PISO de tinta, visualmente identica a "voce vai muito bem aqui".
  //
  // O `12b` resolve por FORMA: medido e' liso, estimado e' trama, nao avaliado
  // e' tracejado SEM preenchimento. O componente distingue os tres, entao a
  // certeza viaja junto em vez de o item sumir.
  const dominio = new Map<
    string,
    { mastery: number; attempts: number; certeza: CompetencyMasteryItem["certeza"] }
  >();
  for (const item of itens) {
    if (!item.primary_subtheme) continue;
    const anterior = dominio.get(item.primary_subtheme);
    // Varias competencias podem morar no mesmo subtema. Fica a de MAIS
    // evidencia: media ponderada esconderia uma medicao boa atras de tres ruins.
    if (!anterior || item.attempts > anterior.attempts) {
      dominio.set(item.primary_subtheme, {
        mastery: item.mastery,
        attempts: item.attempts,
        certeza: item.certeza,
      });
    }
  }

  const assuntos = banca.mais_cai.linhas;
  // "Com dado" agora quer dizer COM RESPOSTA — `nao_avaliado` continua no mapa,
  // mas não conta como medida.
  const comDado = assuntos.filter((linha) => {
    const meu = dominio.get(linha.rotulo);
    return !!meu && meu.certeza !== "nao_avaliado";
  }).length;
  const piso = proficiencia.data?.observation_floor ?? 5;

  if (comDado === 0) {
    return (
      <div className="rounded-surface border border-edge bg-surface p-6">
        <h2 className="font-serif font-semibold text-ink">
          Você ainda não respondeu os assuntos desta prova
        </h2>
        <p className="mt-2 max-w-[52ch] text-base text-muted">
          Este mapa acende conforme você responde. Cada sessão pinta os assuntos
          que ela tocou, e é aí que dá para ver onde a sua prova e você discordam.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="paper-eyebrow">tamanho é incidência · preenchimento é você</p>
      <MapaDaProva linhas={assuntos} dominio={dominio} pisoDeObservacao={piso} />
      {/* A nota continua, e mudou de trabalho.
          Antes ela existia para desfazer a ambiguidade do tom claro — que tinha
          dois sentidos, "você domina" e "não há o que medir". Agora a FORMA
          separa os dois (tracejado é ausência), e a nota diz o tamanho da
          amostra, que nenhuma textura carrega. */}
      <p className="text-nota text-muted">
        Quanto mais escuro, mais falta. {comDado} de {assuntos.length} assuntos
        têm resposta sua; a partir de {piso} respostas o assunto deixa de ser
        estimado e passa a ser medido.
      </p>
    </div>
  );
}

export function MapaClientPage() {
  const { token, tokenResolved } = useAuthToken();
  const [eixo, setEixo] = useState<"prova" | "voce">("prova");

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

      {/* ── As abas do artboard `9a` ──────────────────────────────────────
          O desenho nomeia TRES -- "A prova", "A prova e você" e "Comparar" --
          e desenha DUAS: o `9a` mostra a primeira e o `12b` a segunda.
          "Comparar" aparece so como botao, em nenhum artboard com conteudo.

          Por isso ela nao esta aqui. Inventar o que o desenho nao decidiu foi
          exatamente o que esta sessao passou o dia corrigindo -- e uma aba que
          abre em nada e' pior que uma aba ausente. */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["prova", "A prova"],
            ["voce", "A prova e você"],
          ] as const
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            aria-pressed={eixo === chave}
            onClick={() => setEixo(chave)}
            className={`paper-control inline-flex min-h-11 items-center rounded-surface border px-3.5 py-2 text-sm font-medium transition ${
              eixo === chave
                ? "border-primary bg-primary text-primaryInk"
                : "border-rule bg-transparent text-ink hover:border-muted"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {eixo === "prova" ? (
        <FaciesReport banca={facies.data} />
      ) : (
        <EixoVoce banca={facies.data} />
      )}
    </div>
  );
}
