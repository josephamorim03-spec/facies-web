"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/Skeleton";
import { Alert } from "@/components/ui/Alert";
import { CompararProvas } from "@/components/facies/CompararProvas";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS, TabsScrollArea } from "@/components/ui/Tabs";
import { LIMIAR_EM_PONTOS } from "@/components/facies/comparacaoDeProvas";
import { FaciesReport } from "@/components/facies/FaciesReport";
import { MapaDaProva } from "@/components/facies/MapaDaProva";
import { MapaNavegavel } from "./_components/MapaNavegavel";
import { FolhaDoAssunto } from "./_components/FolhaDoAssunto";
import {
  getFaciesDaBanca,
  getIndiceDeBancas,
  getMyCompetencyMastery,
  getMyTargetExam,
} from "@/lib/api";
import type { CompetencyMasteryItem, StudentTargetExamItem } from "@/lib/api/domains/study-plan";
import { nomeCurto, type Banca } from "@/lib/facies";
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
  ["mapa", "Mapa"],
  ["leitura", "Leitura"],
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
/**
 * O NOME DA PROVA É O BOTÃO — pedido do operador, 2026-09-10.
 *
 * Antes eram três `BotaoDeEscolha` numa fileira abaixo do título. Com os nomes
 * institucionais por extenso ("SP - Universidade de São Paulo - USP - SP
 * (Hospital das Clínicas…)"), cada um virava uma caixa de largura total: três
 * blocos empilhados a empurrar o mapa para fora da primeira tela.
 *
 * ## Por que `<select>` nativo
 *
 * É o idioma que o desenho já usa nesta mesma tela — o seletor de edições da
 * aba Comparar (`EixoComparar`, logo abaixo) é um `<select>`, com o motivo
 * escrito lá: o `9a` desenha "5 provas ▾", e o nativo traz de graça a roda do
 * telemóvel, a busca por digitação e o teclado.
 *
 * ## ⚠️ O SELECT É TRANSPARENTE, SOBREPOSTO AO TÍTULO
 *
 * E não é enfeite: um `<select>` dimensiona-se pela opção MAIS LARGA, e as
 * opções aqui são os nomes por extenso. Estilizá-lo diretamente faria o título
 * herdar a largura do nome mais comprido — o mesmo estouro que os chips
 * causavam, noutra forma.
 *
 * Sobreposto (`absolute inset-0 opacity-0`), o que se vê é o nome CURTO que o
 * `9a` pede, e o que se toca é o seletor nativo com os nomes por extenso — que
 * são o que distingue "USP - SP" de "USP - RP".
 *
 * ⚠️ O texto visível é `aria-hidden` de propósito: o `<select>` já anuncia a
 * opção escolhida, e sem isso o leitor de tela diria o nome duas vezes.
 */
function SeletorDaProva({
  banca,
  provas,
  escolhida,
  onEscolher,
}: {
  banca: Banca;
  provas: StudentTargetExamItem[];
  escolhida: string | null;
  onEscolher: (chave: string | null) => void;
}) {
  const nome = nomeCurto(banca);
  const comEscolha = provas.filter((p) => p.institution_key);

  // Uma prova declarada: texto simples. Um seletor de um item é ruído que
  // ensina que há escolha onde não há.
  if (comEscolha.length < 2) return <>{nome}</>;

  return (
    <span className="relative inline-flex items-baseline gap-1">
      {/* ⚠️ `data-testid` porque o texto do `<h1>` NÃO SERVE de âncora: o
          `<select>` vive dentro dele, e o `textContent` de um `<select>`
          inclui o rótulo de TODAS as opções. Um teste que afirmasse
          `não contém "UNIFESP"` depois de trocar para a ENARE falharia com
          o ecrã correto. O nome escolhido precisa de um sítio só dele. */}
      <span
        aria-hidden="true"
        data-testid="mapa-prova-escolhida"
        className="underline decoration-edge decoration-1 underline-offset-4"
      >
        {nome}
      </span>
      <span aria-hidden="true" className="text-muted">
        ▾
      </span>
      <select
        aria-label="Qual das suas provas o mapa mostra"
        value={escolhida ?? ""}
        onChange={(evento) => onEscolher(evento.target.value || null)}
        // Cobre exatamente o nome e a seta, então o alvo de toque é o que se
        // vê — e não uma área menor escondida atrás dele.
        //
        // ⚠️ `min-h-11` E `top-1/2 -translate-y-1/2`, e não `inset-0` puro.
        // Medido a 390px: o `<span>` pai é `items-baseline`, então a sua altura
        // é a caixa de linha do título — 38px, abaixo do piso de 44px do
        // sistema. Com `inset-0` o alvo ficava do TAMANHO DO TEXTO, que é
        // precisamente o que este seletor não podia ser: ele é a única porta
        // para trocar de prova.
        //
        // A altura extra distribui-se para os dois lados (centrada), e não
        // para baixo: crescer só para baixo roubaria o toque da linha de
        // contagem que vem logo a seguir.
        className="absolute inset-x-0 top-1/2 min-h-11 w-full -translate-y-1/2 cursor-pointer opacity-0"
      >
        {comEscolha.map((item) => (
          <option key={item.institution_key} value={item.institution_key ?? ""}>
            {item.label ?? item.institution_key}
          </option>
        ))}
      </select>
    </span>
  );
}
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
    <div className="ritmo-secao">
      <div>
        <label htmlFor="comparar-com" className="paper-eyebrow">
          comparar a {nomeCurto(minha)} com
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
        <Alert variant="danger" onRetry={() => void indice.refetch()}>
          Não consegui carregar a lista de provas.
        </Alert>
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
        <Skeleton className="h-64 w-full" rotulo="Comparação carregando" />
      ) : null}

      {escolhida !== "" && outra.isError ? (
        <Alert variant="danger" onRetry={() => void outra.refetch()}>
          Não consegui carregar a leitura dessa prova.
        </Alert>
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
/** O que a tinta da grade mostra. Sobe até `MapaClientPage` para caber na
 *  mesma linha das abas — ver o comentário no cabeçalho da tela. */
export type TintaDoMapa = "prova" | "voce";

function EixoMapa({ banca, tinta }: { banca: Banca; tinta: TintaDoMapa }) {
  const { token, tokenResolved } = useAuthToken();
  /**
   * O assunto aberto na grade.
   *
   * Ele mora AQUI, e nao no `MapaDaProva`, porque a acao que ele destrava
   * (montar a sessao) e' de cliente: cria sessao, invalida consultas e navega.
   * O mapa continua sendo leitura, e apenas AVISA qual celula foi aberta.
   */
  const [assuntoAberto, setAssuntoAberto] = useState<string | null>(null);


  const proficiencia = useQuery({
    queryKey: queryKeys.competencyMastery,
    queryFn: () => getMyCompetencyMastery(token),
    enabled: tokenResolved,
    staleTime: 60_000,
  });

  const itens = proficiencia.data?.items ?? [];
  // ⚠️ `nao_avaliado` ENTRA no mapa, e nao vira tinta.
  //
  // Ele era descartado, com o argumento certo -- o posterior encolhido devolve
  // um numero mesmo sem observacao, e pinta-lo afirmaria desempenho onde nao
  // houve resposta. So' que descartar tinha o mesmo efeito: a celula caia no
  // PISO de tinta, visualmente identica a "voce vai muito bem aqui".
  //
  // O `12b` resolve por FORMA: medido e' liso, estimado e' trama, nao avaliado
  // e' tracejado SEM preenchimento.
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
  // "Com dado" quer dizer COM RESPOSTA — `nao_avaliado` continua no mapa, mas
  // não conta como medida.
  const comDado = assuntos.filter((linha) => {
    const meu = dominio.get(linha.rotulo);
    return !!meu && meu.certeza !== "nao_avaliado";
  }).length;
  const piso = proficiencia.data?.observation_floor ?? 5;

  // A MESMA ordem que o `MapaDaProva` usa quando `preOrdenado` e' falso. Ela
  // e' repetida aqui de proposito e nao exportada: o dia em que o mapa mudar de
  // criterio, esta linha fica errada em silencio. O par certo seria o mapa
  // devolver o posto junto com o rotulo em `onSelecionar` -- fica anotado.
  const porIncidencia = [...assuntos].sort((a, b) => b.n - a.n);
  const indiceAberto = assuntoAberto
    ? porIncidencia.findIndex((linha) => linha.rotulo === assuntoAberto)
    : -1;
  const naProva =
    indiceAberto >= 0
      ? {
          posicao: indiceAberto + 1,
          n: porIncidencia[indiceAberto].n,
          exibivel: porIncidencia[indiceAberto].exibivel,
        }
      : null;

  const podeVoce = comDado > 0;
  // ⚠️ `mostrandoVoce` SAIU, e com ele o interruptor "A prova / Você".
  //
  // No mosaico dos quinze o preenchimento tinha de escolher entre as duas
  // leituras, porque só havia UMA dimensão para pintar. No mapa navegável há
  // duas ao mesmo tempo: o TAMANHO é quantas questões o acervo desta banca tem
  // do nó, e a TINTA é o quanto lhe falta. Não há o que alternar — e um
  // interruptor que não muda nada é pior que interruptor nenhum, porque promete
  // um estado que a tela não tem.
  //
  // ⚠️ ESTA FRASE JÁ DISSE "o tamanho é o quanto a sua PROVA cobra", e era falso.
  // O tamanho vinha de `target_bank_demand_score` quando ele existia — um score
  // normalizado em [0,1] que some no grão de subtema para bancas menores, então
  // irmãos eram dimensionados em unidades incomparáveis. Hoje o tamanho é
  // `question_count`, uma unidade só; o eixo da prova-alvo virou frase com
  // denominador na `FolhaDoAssunto`. A conclusão continua de pé; a premissa não.

  return (
    <div className="ritmo-secao">
      {/* ⚠️ A ABA "MAPA" DEIXOU DE SER O MOSAICO DOS QUINZE.

          O operador apontou o que o nome já dizia: mapa é instrumento de
          orientação — mostra o território todo, a posição significa alguma
          coisa, e dá para aproximar sem perder onde se está. Quinze quadrados
          ordenados por posto é uma LISTA desenhada em grade.

          O mosaico dos quinze não morreu, e não devia: ele é a *cara* da banca,
          o corte editorial do gerador (`TOP_SUBTEMAS = 15`). Ele mudou para a
          aba "Leitura", dentro do `FaciesReport`, que é onde a leitura mora — e
          isso também apaga a duplicação de DOIS mosaicos na mesma tela. */}
      <MapaNavegavel
        institutionKey={banca.institution_key}
        nomeDaBanca={nomeCurto(banca)}
        dominio={dominio}
        onPraticar={setAssuntoAberto}
      />
      <FolhaDoAssunto
        assunto={assuntoAberto}
        institutionKey={banca.institution_key}
        nomeDaBanca={nomeCurto(banca)}
        meu={assuntoAberto ? dominio.get(assuntoAberto) ?? null : null}
        naProva={naProva}
        onFechar={() => setAssuntoAberto(null)}
      />

      {/* A nota diz o tamanho da amostra, que nenhuma textura carrega.

          ⚠️ O DENOMINADOR SAIU DAQUI, e a razão é que ele mentia. A frase dizia
          "{comDado} de {assuntos.length} assuntos" — e `assuntos` são os QUINZE
          da fácies, que desde 2026-09-06 já não estão nesta aba: o mapa passou a
          ser a árvore inteira. Comparar a sua cobertura com um total que não
          está na tela é a troca silenciosa de denominador que este arquivo passa
          o tempo a evitar. O que sobra é o que se sabe: quantos assuntos você já
          tocou, e a partir de quantas respostas a medida deixa de ser palpite. */}
      {proficiencia.isPending ? (
        <p className="text-nota text-muted">Lendo as suas respostas…</p>
      ) : podeVoce ? (
        <p className="text-nota text-muted">
          Quanto mais escuro, mais falta. Você já respondeu em {comDado}
          {comDado === 1 ? " assunto" : " assuntos"}; a partir de {piso} respostas
          o assunto deixa de ser estimado e passa a ser medido.
        </p>
      ) : (
        <p className="text-nota text-muted">
          O mapa acende conforme você responde: cada sessão pinta os assuntos que
          ela tocou.
        </p>
      )}
    </div>
  );
}

export function MapaClientPage() {
  const { token, tokenResolved } = useAuthToken();
  const [eixo, setEixo] = useState<Eixo>("mapa");
  /**
   * ⚠️ O INTERRUPTOR DA TINTA MORA AQUI, e não dentro do mapa.
   *
   * Ele ocupava uma FILEIRA inteira logo acima da grade, e a 390px cada fileira
   * de chrome custa ~44px de mosaico. Subindo, ele divide a linha com as abas —
   * que estavam com metade da largura vazia — e a grade sobe junto.
   *
   * O padrão é "prova" porque ela não depende de consulta nenhuma: a grade
   * pinta no primeiro frame. "Você" espera a proficiência, e diz que espera.
   */
  // A tinta continua a existir para a aba "Leitura", que monta o mosaico dos
  // quinze por dentro do `FaciesReport`. O que saiu foi o INTERRUPTOR da aba do
  // mapa, onde ele deixou de ter o que alternar.
  const [tinta] = useState<TintaDoMapa>("prova");

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

  /**
   * 🚨 A BANCA DO MAPA PASSOU A SER ESCOLHA, e antes era imposição.
   *
   * O operador perguntou: *"esse mapa é só do ENAMED ou de todas bancas
   * prioritárias?"*, depois de ver o título dizer uma banca e a lista de Atenção
   * citar outra. A resposta medida é **as duas coisas, e é esse o bug**:
   *
   * | elemento | escopo antes desta linha |
   * | --- | --- |
   * | título, questões, anos, área das peças | UMA banca — `porPrioridade[0]` |
   * | tinta das peças | maestria do aluno, sem banca |
   * | Atenção: ordem e frase | TODAS as ≤3 declaradas ("vence a maior") |
   *
   * O próprio backend já previa a queixa em comentário
   * (`topic_explanation.py:170-176`): *"na tela de OUTRA banca, porque a
   * evidência é do objetivo do aluno, não do mapa que ele está olhando"*.
   *
   * ⚠️ ISTO RESOLVE METADE. Trocar a banca exibida é do cliente e custa zero de
   * rede — `queryKeys.studentTargetExam` já é partilhada. O escopo da **Atenção**
   * é do servidor: `_apply_target_demand` agrega sobre todas as provas
   * declaradas, e limitá-lo a uma exige `institution_key` no serviço. Enquanto
   * isso não acontece, a tela DIZ de quem é a evidência quando ela diverge, em
   * vez de deixar o aluno descobrir sozinho — ver `evidenciaDeOutraBanca` em
   * `MapaNavegavel`.
   */
  const [chaveEscolhida, setChaveEscolhida] = useState<string | null>(null);
  const alvo =
    porPrioridade.find((item) => item.institution_key === chaveEscolhida) ??
    porPrioridade[0];
  const chave = alvo?.institution_key ?? null;

  // As OUTRAS provas declaradas — o desenho manda que elas sejam a comparação
  // do mapa. `items` sempre veio com todas; era esta linha que faltava.
  //
  // ⚠️ ERA `.slice(1)`, e isso passou a estar errado quando a banca do mapa
  // virou escolha: com a segunda prova selecionada, `slice(1)` deixaria a
  // PRÓPRIA banca exibida na lista de comparação — comparar uma prova consigo
  // mesma — e esconderia a primeira. O corte certo é por identidade.
  const outrasDoAluno = porPrioridade
    .map((item) => item.institution_key)
    .filter((k): k is string => Boolean(k) && k !== chave);

  const facies = useQuery({
    queryKey: queryKeys.faciesDaBanca(chave ?? ""),
    queryFn: () => getFaciesDaBanca(chave as string),
    enabled: Boolean(chave),
    // Dataset estatico: so muda com deploy.
    staleTime: 3_600_000,
  });

  if (!tokenResolved || provaAlvo.isPending) {
    return (
      <div className="ritmo-secao" aria-label="Mapa da prova carregando">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (provaAlvo.isError) {
    return (
      <Alert variant="danger" onRetry={() => void provaAlvo.refetch()}>
        Não consegui ler a sua prova-alvo agora.
      </Alert>
    );
  }

  // SEM prova declarada. Nao e erro: e o estado de quem ainda nao escolheu, e a
  // tela precisa levar ao lugar onde se escolhe em vez de so avisar.
  if (!chave) {
    return (
      <div className="rounded-surface border border-edge bg-surface p-4 sm:p-5">
        <h2 className="font-serif font-semibold text-ink">
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
    return <Skeleton className="h-64 w-full" rotulo="Fácies carregando" />;
  }

  if (facies.isError) {
    return (
      <Alert variant="danger" onRetry={() => void facies.refetch()}>
        Não consegui carregar a leitura desta banca.
      </Alert>
    );
  }

  // A banca existe no catalogo de objetivos e NAO tem facies publicada. O
  // dataset so publica quem passa do piso de questoes recentes, entao este caso
  // e real e precisa dizer a verdade em vez de mostrar tela vazia.
  if (!facies.data) {
    return (
      <div className="rounded-surface border border-edge bg-surface p-4 sm:p-5">
        <h2 className="font-serif font-semibold text-ink">
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
    <div className="ritmo-secao">
      <div>
        <h1 className="font-serif font-semibold text-ink">
          {/* ⚠️ NOME CURTO, e nao o institucional por extenso.

              O desenho escreve "A cara da UNIFESP" (`9a`). Com `banca.nome`
              a manchete saia "A cara da SP - Universidade Federal de São
              Paulo - UNIFESP (Hospital Universitário da UNIFESP)" -- QUATRO
              linhas a 390px, empurrando as abas e o mapa para fora da
              primeira tela. `nomeCurto` ja resolve homonimo com a UF e e o
              mesmo nome dos chips da landing. */}
          A cara da <SeletorDaProva
            banca={facies.data}
            provas={porPrioridade}
            escolhida={chave}
            onEscolher={setChaveEscolhida}
          />
        </h1>
        {/* A janela e o denominador da leitura, e o handoff pede que numero
            nunca apareca sem ele.

            ⚠️ "COBRADAS", e o adjetivo carrega a correção inteira desta tela.

            Até 2026-09-10 este número era `read index + anuladas` — 566 no
            ENARE/ENAMED, onde a prova cobrou 600 e as células do mapa somavam
            530. Três números na mesma tela, e o do cabeçalho não era o tamanho
            de nada: somava a população de TREINO com parte da de MEDIÇÃO.

            Agora ele vem inteiro de `question_source_dimensions`, a mesma
            população que a árvore passou a dimensionar (`population: "exam"`),
            então cabeçalho e grade voltam a falar do mesmo conjunto. O
            substantivo tem de dizer QUAL conjunto é: um "600 questões" solto,
            numa tela com botão de praticar, promete um acervo que não existe —
            530 dessas é que se resolvem, e a legenda do nível diz isso. */}
        <p className="paper-eyebrow mt-1">
          {facies.data.questoes_total.toLocaleString("pt-BR")} questões cobradas
          {facies.data.primeiro_ano && facies.data.ultimo_ano
            ? ` · ${facies.data.primeiro_ano}–${facies.data.ultimo_ano}`
            : ""}
        </p>
      </div>

      {/* ⚠️ A ORDEM MUDOU, e o mosaico passou a ser o que abre.

          A tela chamava-se Mapa e abria num LAUDO: "A prova" era a primeira
          aba e servia o `FaciesReport`, prosa e barras. O mosaico — a coisa que
          dá nome à tela — era a SEGUNDA aba, e só aparecia depois de um toque.
          O operador disse que a navegação estava ruim; isto é metade do porquê.

          Agora: **Mapa** abre com o mosaico, **Leitura** guarda o laudo que era
          a primeira, e **Comparar** fica onde estava. Três abas continuam a ser
          as três do `9a`; o que mudou foi qual delas é a casa.

          A antiga "A prova e você" não virou aba: virou um interruptor DENTRO
          do mapa, que é o que o `12b` sempre pediu — "toque troca a leitura",
          na mesma grade, e não duas grades em abas diferentes.

          ── As abas do artboard `9a` ──────────────────────────────────────
          As TRES que o desenho nomeia. Ele desenha a primeira no `9a` e a
          segunda no `12b`; a terceira nao esta em artboard nenhum do
          `Webapp - telas`, e eu tinha concluido dai que o desenho nao a havia
          decidido.

          Estava errado, e o erro foi de METODO: eu li um arquivo e afirmei
          sobre o pacote. O `B1` do `Instagram - modelos` e' esta tela, com
          regra explicita -- duas faixas empilhadas, mesma escala, ambar so'
          acima de 3 pontos. Ver `CompararProvas.tsx`. */}
      {/* ⚠️ NO TELEMÓVEL AS TRÊS ABAS ENCHEM A LARGURA, como toda fileira de
          controles desta rodada. Antes eram três botões encostados à esquerda com
          um vazio à direita, e o interruptor de preenchimento pendurado com
          `ml-auto` — dois blocos desalinhados na mesma linha. */}
      <div className="fileira-de-controles md:flex md:flex-wrap md:items-center">
        {/* 🚨 O TRILHO CANÓNICO, e não pastilhas soltas.

            Esta fileira era `BotaoDeEscolha papel="aba"`: pastilhas de 14px
            com borda visível também no não-escolhido, sem trilho à volta. As
            secções do resto do app (Cards, Banco, pós-simulado) usam
            `TAB_LIST_CLASS` + `TAB_TRIGGER_CLASS` — trilho, 12px, borda
            transparente no não-escolhido. Duas línguas para a mesma coisa, e
            foi o que o operador apontou ao dizer que os botões do Mapa não
            combinavam com os dos Cards.

            ⚠️ Botões com `aria-current`, e não o `Tabs` do Radix: os painéis
            aqui são ramos condicionais, não `TabsContent`. É o mesmo arranjo
            do `PostExamTabs` e do `ExamDebrief`, e `TAB_TRIGGER_CLASS` pinta o
            estado por `data-[state=active]` OU `aria-[current=page]`
            justamente para servir os dois casos.

            A história antiga desta fileira continua a valer e por isso fica
            registada: ela já foi um teal cheio, que fazia a aba ativa parecer
            a ação principal do app — um botão no topo que, ao ser premido, não
            levava a lado nenhum. O único teal cheio desta tela continua a ser
            "Praticar", dentro da folha do assunto: a ação de verdade. */}
        <TabsScrollArea className="w-full md:w-auto">
          {({ ref, onScroll }) => (
            <div
              ref={ref}
              onScroll={onScroll}
              role="group"
              aria-label="O que o mapa mostra"
              className={TAB_LIST_CLASS}
            >
              {ABAS.map(([chave, rotulo]) => (
                <button
                  key={chave}
                  type="button"
                  onClick={() => setEixo(chave)}
                  aria-current={eixo === chave ? "page" : undefined}
                  className={TAB_TRIGGER_CLASS}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          )}
        </TabsScrollArea>
        {/* ⚠️ O INTERRUPTOR "A PROVA / VOCÊ" SAIU com o mosaico dos quinze.

            Ali o preenchimento tinha de escolher entre as duas leituras, porque
            havia UMA dimensão para pintar. No mapa navegável há duas ao mesmo
            tempo: o tamanho é quantas questões o acervo desta banca tem do nó, a
            tinta é o quanto lhe falta. Não sobrou o que alternar.

            ⚠️ Dizia "o tamanho é o quanto a sua prova cobra" — falso desde que o
            peso deixou de sair de `target_bank_demand_score`, que era um score
            [0,1] e não uma contagem. Ver a nota em `mapaLayout.pesoDoNo`. */}
      </div>

      {eixo === "mapa" ? (
        <EixoMapa banca={facies.data} tinta={tinta} />
      ) : null}
      {eixo === "leitura" ? <FaciesReport banca={facies.data} /> : null}
      {eixo === "comparar" ? (
        <EixoComparar minha={facies.data} outrasDoAluno={outrasDoAluno} />
      ) : null}
    </div>
  );
}
