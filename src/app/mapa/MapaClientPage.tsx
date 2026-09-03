"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { CompararProvas } from "@/components/facies/CompararProvas";
import { LIMIAR_EM_PONTOS } from "@/components/facies/comparacaoDeProvas";
import { FaciesReport } from "@/components/facies/FaciesReport";
import { MapaDaProva } from "@/components/facies/MapaDaProva";
import {
  getFaciesDaBanca,
  getIndiceDeBancas,
  getMyCompetencyMastery,
  getMyTargetExam,
} from "@/lib/api";
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
 * As TRÊS abas do `9a`, e o tipo do estado sai DAQUI.
 *
 * O estado era `useState<"prova" | "voce">` com a lista escrita à mão logo
 * abaixo, no JSX. Acrescentar "Comparar" na lista deixou as duas em desacordo,
 * e o typecheck cobrou nos dois pontos — `setEixo` recusando o valor novo e
 * uma comparação declarada impossível.
 *
 * Derivando `Eixo` da lista, a lista é a única fonte: uma aba nova entra num
 * lugar só, e uma aba sem ramo de renderização vira erro de tipo em vez de um
 * botão que não faz nada.
 */
const ABAS = [
  ["prova", "A prova"],
  ["voce", "A prova e você"],
  ["comparar", "Comparar"],
] as const;

type Eixo = (typeof ABAS)[number][0];

/**
 * "Comparar" — o artboard `B1` do pacote do Instagram.
 *
 * ## A escolha da segunda prova é o componente inteiro
 *
 * A primeira prova não se escolhe: é a do aluno, a mesma das outras duas abas.
 * A segunda precisa de uma lista de 138, e é ela que decide o desenho daqui.
 *
 * `<select>` nativo, e não um combobox próprio. O `9a` usa exatamente esse
 * idioma no seletor de edições ("5 provas ▾"), então o nativo não é preguiça: é
 * o controle que o desenho já escolheu para esta tela. Ele também chega de
 * graça com busca por digitação, navegação por teclado, e a roda do celular —
 * que é onde uma lista de 138 itens de fato dói.
 *
 * ⚠️ A LISTA NÃO PODE VIR DO `facies.json`. Ele tem 1 MB e este é um componente
 * cliente; importá-lo aqui para tirar 138 pares nome/chave mandaria o dataset
 * inteiro para o navegador. Vem de `/api/facies/bancas`, 27,2 KB medidos,
 * estático.
 *
 * ⚠️ E a própria prova sai da lista. Comparar a UNIFESP com a UNIFESP dá uma
 * tela de zeros que parece defeito.
 */
/**
 * As chaves das provas que o aluno declarou ALÉM da principal, em ordem de
 * prioridade. Vem de `items`, que sempre foi um array — a tela é que lia só o
 * primeiro e jogava o resto fora.
 */
function EixoComparar({ minha, outrasDoAluno }: { minha: Banca; outrasDoAluno: string[] }) {
  // ⚠️ O PADRÃO É A SEGUNDA PROVA DO ALUNO, e isso é regra do desenho, não
  // conveniência: "Até três provas […] Só a principal monta o dia; as outras
  // duas entram como comparação no mapa e como filtro no banco"
  // (`Webapp - telas`, tela de escolha de provas).
  //
  // Quem declarou duas provas já disse com quem quer comparar. Abrir a aba num
  // "Escolha uma prova" vazio faria a pessoa repetir uma escolha que o app já
  // tem guardada — e o dado para isso estava carregado o tempo todo.
  const [escolhida, setEscolhida] = useState<string>(outrasDoAluno[0] ?? "");

  const indice = useQuery({
    queryKey: queryKeys.indiceDeBancas,
    queryFn: getIndiceDeBancas,
    // O índice muda quando alguém commita um dataset novo, e o deploy invalida
    // o cache junto. Uma hora em memória é conservador.
    staleTime: 60 * 60_000,
  });

  const outra = useQuery({
    queryKey: queryKeys.faciesDaBanca(escolhida),
    queryFn: () => getFaciesDaBanca(escolhida),
    enabled: escolhida !== "",
    staleTime: 60 * 60_000,
  });

  const opcoes = (indice.data ?? []).filter(
    (banca) => banca.institution_key !== minha.institution_key,
  );

  // As provas do aluno primeiro, na ordem de prioridade que ele mesmo definiu
  // no seletor de objetivos. Uma lista de 138 em ordem alfabética esconde no
  // meio dela exatamente as duas que o desenho manda oferecer.
  const chavesDoAluno = new Set(outrasDoAluno);
  const minhasOutras = outrasDoAluno
    .map((chave) => opcoes.find((banca) => banca.institution_key === chave))
    .filter((banca): banca is (typeof opcoes)[number] => Boolean(banca));
  const demais = opcoes.filter((banca) => !chavesDoAluno.has(banca.institution_key));

  const rotuloDe = (banca: (typeof opcoes)[number]) =>
    `${banca.nome}${banca.uf ? ` · ${banca.uf}` : ""}`;

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="comparar-com" className="paper-eyebrow">
          comparar a {minha.nome} com
        </label>
        <select
          id="comparar-com"
          value={escolhida}
          onChange={(evento) => setEscolhida(evento.target.value)}
          disabled={indice.isPending || indice.isError}
          className="paper-control mt-1.5 block min-h-11 w-full max-w-[42ch] rounded-surface border border-rule bg-surface px-3 py-2 text-base text-ink"
        >
          <option value="">
            {indice.isPending ? "Carregando as provas…" : "Escolha uma prova"}
          </option>
          {/* O nome curto é o que o aluno reconhece; o longo desempata os
              homônimos que `nomeCurto` não resolveu sozinho. */}
          {minhasOutras.length > 0 ? (
            <optgroup label="Suas provas">
              {minhasOutras.map((banca) => (
                <option key={banca.institution_key} value={banca.institution_key}>
                  {rotuloDe(banca)}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={minhasOutras.length > 0 ? "Todas as provas" : "Provas"}>
            {demais.map((banca) => (
              <option key={banca.institution_key} value={banca.institution_key}>
                {rotuloDe(banca)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {indice.isError ? (
        <Alert variant="danger">Não consegui carregar a lista de provas.</Alert>
      ) : null}

      {escolhida === "" ? (
        <p className="max-w-[52ch] text-base text-muted">
          {/* O limiar vem da CONSTANTE, e não escrito por extenso. Esta frase
              dizia "passam de três pontos" enquanto a legenda de
              `CompararProvas` interpola `LIMIAR_EM_PONTOS`: a mesma regra em
              dois lugares, e só um acompanharia uma mudança do desenho. É o
              defeito que a numeração das seções da home já pagou — número
              escrito duas vezes é número que diverge. */}
          Duas provas com o mesmo edital cobram diferente. Escolha uma e as duas
          faixas aparecem na mesma escala, com as diferenças que passam de{" "}
          {LIMIAR_EM_PONTOS} pontos percentuais destacadas.
        </p>
      ) : null}

      {escolhida !== "" && outra.isPending ? (
        <Skeleton className="h-64 w-full" aria-label="Comparação carregando" />
      ) : null}

      {escolhida !== "" && outra.isError ? (
        <Alert variant="danger">Não consegui carregar a leitura dessa prova.</Alert>
      ) : null}

      {/* `null` com sucesso é a banca sem fácies publicada, e é diferente de
          erro: ela está no índice porque existe no acervo, mas não passou do
          piso de questões recentes. */}
      {escolhida !== "" && outra.isSuccess && !outra.data ? (
        <Alert variant="warning">
          Ainda não há leitura publicada dessa prova — ela não tem questões
          recentes suficientes para a medida não ser ruído.
        </Alert>
      ) : null}

      {outra.data ? <CompararProvas a={minha} b={outra.data} /> : null}
    </div>
  );
}

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
  const [eixo, setEixo] = useState<Eixo>("prova");

  const provaAlvo = useQuery({
    queryKey: queryKeys.studentTargetExam,
    queryFn: () => getMyTargetExam(token),
    enabled: tokenResolved,
    // A prova-alvo muda quando o aluno a troca, nao durante a leitura.
    staleTime: 300_000,
  });

  // A de maior prioridade, que e a mesma regra de `objetivoPrincipal`.
  const porPrioridade = [...(provaAlvo.data?.items ?? [])].sort(
    (a, b) => a.priority - b.priority,
  );
  const alvo = porPrioridade[0];
  const chave = alvo?.institution_key ?? null;

  // As OUTRAS provas declaradas — o desenho manda que elas sejam a comparação
  // do mapa. `items` sempre veio com todas; era esta linha que faltava.
  const outrasDoAluno = porPrioridade
    .slice(1)
    .map((item) => item.institution_key)
    .filter((k): k is string => Boolean(k));

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
        {/* A ÂNCORA importa. A prova alvo é a segunda das seis seções de
            `/preferencias`, mas a primeira sozinha ocupa ~240 linhas de
            formulário de rotina — sem `#prova-alvo` este botão entregava o
            aluno no topo da página, com a decisão que o trouxe fora da tela. */}
        <Link
          href="/preferencias#prova-alvo"
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
          As TRES que o desenho nomeia. Ele desenha a primeira no `9a` e a
          segunda no `12b`; a terceira nao esta em artboard nenhum do
          `Webapp - telas`, e eu tinha concluido dai que o desenho nao a havia
          decidido.

          Estava errado, e o erro foi de METODO: eu li um arquivo e afirmei
          sobre o pacote. O `B1` do `Instagram - modelos` e' esta tela, com
          regra explicita -- duas faixas empilhadas, mesma escala, ambar so'
          acima de 3 pontos. Ver `CompararProvas.tsx`. */}
      <div className="flex flex-wrap gap-2">
        {ABAS.map(([chave, rotulo]) => (
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

      {eixo === "prova" ? <FaciesReport banca={facies.data} /> : null}
      {eixo === "voce" ? <EixoVoce banca={facies.data} /> : null}
      {eixo === "comparar" ? (
        <EixoComparar minha={facies.data} outrasDoAluno={outrasDoAluno} />
      ) : null}
    </div>
  );
}
