"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert } from "@/components/ui/Alert";
import { BotaoDeEscolha } from "@/components/ui/BotaoDeEscolha";
import { Skeleton } from "@/components/Skeleton";
import { browseQuestionBankTopics } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import { CelulaDoMapa } from "./CelulaDoMapa";
import { TrilhaDoTerritorio } from "./TrilhaDoTerritorio";
import {
  agregarDominio,
  construirIndice,
  disporNivel,
  filhosDoPasso,
  melhoresRanks,
  prioridades,
  caminhoQueMostra,
  type Passo,
  type Peca,
} from "./mapaLayout";

/**
 * O mapa navegável — um treemap proporcional que enche o palco, um grão por vez.
 *
 * ## As duas versões reprovadas, e o que cada uma errou
 *
 * **v1, drill-down em grade CSS.** Clara, e não era um mapa: grade destrói a
 * única coisa que um mapa tem, **área = quantidade**. Posição e tamanho não
 * significavam nada, então cada nível era "uma lista desenhada em grade".
 *
 * **v2, cena pan/zoom com os três grãos juntos.** Proporcional, e ilegível —
 * *"bem bugado visualmente, as interações não estão precisas, os textos quase
 * inelegíveis"*. Não por acidente: três grãos num palco de 358×416, com o rótulo
 * medido em pixels de TELA dentro de uma caixa medida no MUNDO. As duas unidades
 * divergem a cada nível de zoom, e a rampa de opacidade era um pedido de
 * desculpas por um layout que não cabia.
 *
 * ## O meio do caminho
 *
 * Mantém a proporcionalidade da v2 — que é o que faz ser mapa — e a legibilidade
 * garantida da v1 — que é o que faz ser usável —, trocando câmera livre por
 * navegação por enquadramento. Três ingredientes o separam da v1:
 *
 *   1. o palco é treemap, não grade: área = `question_count`, em todos os níveis;
 *   2. o rastro dá o caminho de volta inteiro, e cada passo é clicável;
 *   3. **cada peça desenha os próprios filhos como filetes** — vê-se um degrau
 *      adiante sem entrar, e folha fica visível (célula lisa = fim).
 *
 * A legibilidade deixa de ser esperança e vira construção, por `dobrarCauda()`:
 * nenhuma célula fica abaixo do polegar, então o rótulo volta a viver dentro dela
 * em fluxo normal, sem `var(--k)`, sem rampa, sem camada separada.
 *
 * **O trade, declarado:** desiste de ver os três grãos ao mesmo tempo. Era a
 * promessa da v2, e é a promessa que 390×844 não paga.
 *
 * ## ⚠️ Sem gesto nenhum
 *
 * Saiu tudo: roda, pinça, arrasto, captura de ponteiro e a heurística
 * "arrastou ≠ clicou". *"As interações não estão precisas"* desaparece porque
 * **não sobrou heurística para ser imprecisa** — cada célula é um `<button>` com
 * área de toque garantida, e o único gesto é `click`.
 */

/** O teto do servidor para esta consulta (`le=1000`), não uma preferência. */
const LIMITE_DA_ARVORE = 1000;

/** O grão que se navega. Microcompetência é fina demais para uma célula. */
const GRAOS = ["specialty", "theme", "subtheme"] as const;

/**
 * O PISO DE CADA LADO da peça: 44px é o alvo de toque, 72px comporta duas
 * linhas de `text-nota` sem espremer o nome.
 *
 * ⚠️ É por LADO, e não por área. Uma peça com área suficiente ainda pode sair
 * 400×8 — e saiu: o gate mediu 30,7px de largura no nível raiz quando a conta
 * era de área. Forma não se governa por área.
 */
const LADO_MINIMO = { w: 72, h: 44 };

/** Teto duro de peças por nível, para o olho não ter de varrer uma parede. */
const MAX_PECAS = 20;

/** O vão entre peças, em px de tela — aqui o mundo É a tela. */
const VAO = 4;

/** Abaixo disto a prévia vira borrão e sugere textura em vez de estrutura. */
const PREVIA_MIN = 40;

/**
 * Quantos itens a atenção lista.
 *
 * Seis, como no projeto de design — e o número tem função: uma lista de
 * prioridades longa demais deixa de ser prioridade. Quem quiser o resto tem o
 * mapa inteiro logo acima.
 */
const LIMITE_DA_ATENCAO = 6;

type Dominio = Map<string, { mastery: number; attempts: number }>;

/** Sem acento, sem caixa, sem pontuação — para comparar rótulo de banca. */
function achatar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

/**
 * O rótulo da banca que sustenta a frase, QUANDO não é a do mapa aberto.
 *
 * `_apply_target_demand` mede a procura sobre todas as provas declaradas (até 3)
 * e entre elas "vence a maior" — regra deliberada em `bank_demand.py`, para o
 * terceiro alvo não diluir o principal. A consequência é que a frase de um nó
 * pode citar uma prova que não é a que está no título.
 *
 * Devolve `null` quando bate (ou quando não há evidência), para a linha extra
 * não aparecer no caso comum, que é a esmagadora maioria.
 */
function evidenciaDeOutraBanca(
  no: { target_demand_evidence?: { institution_label: string | null } | null },
  nomeDaBanca: string,
): string | null {
  const rotulo = no.target_demand_evidence?.institution_label?.trim();
  if (!rotulo) return null;
  const doMapa = achatar(nomeDaBanca);
  const daEvidencia = achatar(rotulo);
  if (!doMapa || !daEvidencia) return null;
  // `includes` nos dois sentidos: o rótulo da evidência costuma ser mais longo
  // que o nome curto do mapa ("USP-SP" dentro de "Universidade de São Paulo…").
  if (daEvidencia.includes(doMapa) || doMapa.includes(daEvidencia)) return null;
  return rotulo;
}

export function MapaNavegavel({
  institutionKey,
  nomeDaBanca,
  dominio,
  onPraticar,
}: {
  institutionKey: string;
  nomeDaBanca: string;
  dominio: Dominio;
  onPraticar: (assunto: string) => void;
}) {
  const { token, tokenResolved } = useAuthToken();
  const palcoRef = useRef<HTMLDivElement | null>(null);
  const observadorRef = useRef<ResizeObserver | null>(null);
  const [caminho, setCaminho] = useState<Passo[]>([]);
  /** A medida do palco, arredondada a 4px — ver o `ResizeObserver`, abaixo. */
  const [palco, setPalco] = useState({ w: 0, h: 0 });

  const arvore = useQuery({
    // ⚠️ `medicao` ENTRA NA CHAVE porque entra na resposta. O mesmo
    // `institutionKey` devolve DUAS árvores diferentes conforme a população, e
    // partilhar chave faria a primeira a chegar decidir o que o mapa mostra.
    queryKey: ["mapa", "arvore", institutionKey, "medicao"],
    queryFn: () =>
      browseQuestionBankTopics(token, {
        institutions: [institutionKey],
        node_types: [...GRAOS],
        limit: LIMITE_DA_ARVORE,
        // ⚠️ O MAPA MEDE A PROVA, e não a fila de treino.
        //
        // Sem isto a árvore contava `question_student_read_index` — o que o
        // aluno pode praticar —, que exclui anulada, duplicata e desatualizada.
        // Medido em produção em 2026-09-10: o ENARE/ENAMED de acesso direto
        // cobrou 600 questões e as células somavam 530, enquanto o cabeçalho
        // dizia 566 (530 + as 36 anuladas). Três números, nenhum deles o
        // tamanho da prova.
        //
        // O que dá para praticar continua visível, em `servable_question_count`
        // — na célula, ao lado do número da prova. Dimensionar por um e oferecer
        // o outro em silêncio é o defeito que isto conserta.
        population: "exam",
      }),
    enabled: tokenResolved,
    // A taxonomia muda com deploy de dataset, não durante a leitura.
    staleTime: 3_600_000,
  });

  const nos = useMemo(() => arvore.data ?? [], [arvore.data]);
  const indice = useMemo(() => construirIndice(nos), [nos]);
  const dominioPorNo = useMemo(() => agregarDominio(indice, dominio), [indice, dominio]);

  /**
   * ══ ATENÇÃO ═══════════════════════════════════════════════════════════════
   *
   * Os que o aluno mais precisa ver, com o porquê vindo PRONTO do backend
   * (`recommendation_explanation`). Ver a nota em `prioridades()`.
   *
   * ⚠️ O botão muda ORDEM e MARCA, nunca o tamanho. A área continua sendo
   * `question_count` nos dois estados — trocar o significado da área ao apertar
   * um botão obrigaria o aluno a reaprender a codificação da mesma grade, e foi
   * por dimensionar peso com duas grandezas que a v2 foi reprovada.
   */
  const [atencaoLigada, setAtencao] = useState(false);

  const prioritarios = useMemo(() => prioridades(indice, LIMITE_DA_ATENCAO), [indice]);
  const melhorRank = useMemo(() => melhoresRanks(indice), [indice]);

  /**
   * ⚠️ A MARCA SOBE A ÁRVORE, e é o que faz o botão significar alguma coisa no
   * nível de cima. As prioridades são subtemas; sem herdar, ligar a atenção na
   * raiz não mudava ordem nem marca — o aluno apertava e a tela ficava igual.
   *
   * O corte é o pior rank entre os listados: quem contém alguém da lista fica
   * marcado, e mais ninguém.
   */
  const marcados = useMemo(() => {
    if (prioritarios.length === 0) return new Set<string>();
    const corte = Math.max(
      ...prioritarios.map((n) => n.recommendation_rank ?? Number.MAX_SAFE_INTEGER),
    );
    const dentro = new Set<string>();
    for (const [id, rank] of melhorRank) if (rank <= corte) dentro.add(id);
    return dentro;
  }, [prioritarios, melhorRank]);

  /**
   * ⚠️ A ORDEM DA ATENÇÃO NÃO ENTRA AQUI — ela desce como opção de exibição.
   *
   * Reordenar antes de `disporNivel` publicou dois defeitos: a dobra da cauda
   * perdia a garantia de piso (o nível saía com UMA célula de 1×348 px no
   * telemóvel) e `desde` passava a contar noutra lista, fazendo "+N temas"
   * abrir um conjunto diferente do prometido. O porquê está escrito em
   * `disporNivel`, junto do código que depende disso.
   */
  const filhos = useMemo(() => filhosDoPasso(indice, caminho), [indice, caminho]);
  const ordemDeExibicao = atencaoLigada ? melhorRank : undefined;

  /**
   * ⚠️ NA CAUDA O PESO É UNIFORME, e é isso que faz a conta fechar.
   *
   * A cauda prometia o total escondido e abria mostrando menos, porque o nível
   * dela era re-dobrado — o desnível de peso (480 contra 40) põe o menor em
   * 61px, abaixo do piso. Com peso uniforme eles cabem todos.
   *
   * Cheguei a resolver trocando a cauda por LISTA: fechava a conta e quebrava a
   * linguagem visual. Isto entrega as duas.
   */
  const naCauda = (caminho[caminho.length - 1]?.tipo ?? null) === "cauda";

  /**
   * A MARCA TAMBÉM ACENDE NA CAUDA, e sem isso a Atenção parece quebrada.
   *
   * Prioridade é urgência, não volume: com frequência o que o aluno mais precisa
   * ver é um tema de poucas questões, e ele cai justamente na cauda. Como a área
   * é `question_count` e `fatiar` é bisecção, ordenar não deixa uma peça leve
   * maior — ela seria uma tira ilegível onde quer que ficasse. Foi o que este
   * mapa acabou de publicar como defeito.
   *
   * Então quando o marcado está dobrado, quem carrega a marca é a peça da
   * cauda: um toque leva ao nível onde ele aparece, e a lista abaixo do mapa
   * continua dando o porquê escrito e o atalho direto (`enquadrar`). Apertar
   * "Atenção" e não ver nada acender seria pior que não ter o botão.
   */
  const pedeAtencao = useCallback(
    (peca: Peca) =>
      peca.tipo === "no"
        ? marcados.has(peca.no.knowledge_node_id)
        : filhos.slice(peca.desde).some((no) => marcados.has(no.knowledge_node_id)),
    [marcados, filhos],
  );

  const pecas = useMemo(
    () =>
      palco.w > 0 && palco.h > 0
        ? disporNivel(
            indice,
            filhos,
            { x: 0, y: 0, w: palco.w, h: palco.h },
            {
              ladoMinimo: LADO_MINIMO,
              maxPecas: MAX_PECAS,
              vao: VAO,
              previaMin: PREVIA_MIN,
              pesoUniforme: naCauda,
              ordemDeExibicao,
            },
          )
        : [],
    [indice, filhos, palco.w, palco.h, naCauda, ordemDeExibicao],
  );

  /**
   * ⚠️ REF DE CALLBACK, e não `useRef` + `useEffect([])`. O gate pegou isto.
   *
   * O componente devolve `<Skeleton>` enquanto a árvore carrega, então na
   * primeira passagem o palco NÃO EXISTE no DOM. Um efeito com deps vazias roda
   * exatamente aí, encontra `ref.current === null`, desiste — e nunca mais roda,
   * porque as deps não mudam. Resultado: `palco` ficava em 0×0 para sempre e
   * `disporNivel` devolvia lista vazia. O mapa abria sem uma única peça.
   *
   * A ref de callback é chamada quando o nó ENTRA no DOM (e de novo com `null`
   * quando sai), que é precisamente o momento em que há o que medir.
   */
  const prenderPalco = useCallback((alvo: HTMLDivElement | null) => {
    observadorRef.current?.disconnect();
    observadorRef.current = null;
    palcoRef.current = alvo;
    if (!alvo) return;
    // ⚠️ ARREDONDADO A 4px. Sem isso, cada pixel de variação do observador
    // produziria uma medida nova e o layout inteiro seria refeito a cada quadro
    // de um redimensionamento. 4px muda o mapa quando o palco muda, não quando
    // ele treme.
    const medir = () => {
      const w = Math.round(alvo.clientWidth / 4) * 4;
      const h = Math.round(alvo.clientHeight / 4) * 4;
      setPalco((anterior) => (anterior.w === w && anterior.h === h ? anterior : { w, h }));
    };
    medir();
    // Observa o PRÓPRIO palco, e não a janela: o mapa se adapta ao container em
    // que foi montado, que é o que decide o tamanho dele.
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    observadorRef.current = observador;
  }, []);

  useEffect(() => () => observadorRef.current?.disconnect(), []);

  const entrar = useCallback((peca: Peca) => {
    setCaminho((atual) => {
      if (peca.tipo !== "cauda") {
        return [...atual, { tipo: "no", id: peca.no.knowledge_node_id, nome: peca.no.node_name }];
      }

      /**
       * ⚠️ O `desde` É ABSOLUTO, e empilhar cauda sobre cauda fazia um LOOP.
       *
       * `disporNivel` devolve `desde` relativo à lista que ele recebeu — e essa
       * lista já é uma FATIA quando o nível corrente é uma cauda. `filhosDoPasso`
       * aplica o `desde` à lista COMPLETA do pai, então os dois discordavam e o
       * mapa andava para trás:
       *
       *   raiz   → 4 peças + cauda (desde=4)
       *   cauda  → slice(4) = 2 peças, 1 + cauda (desde=1)   ← relativo
       *   cauda  → slice(1) = 5 peças                        ← VOLTOU, e roda
       *
       * Somando a base, o `desde` volta a ser absoluto e o nível só encolhe.
       *
       * E a cauda SUBSTITUI a cauda anterior em vez de empilhar: duas caudas
       * seguidas são o mesmo lugar, mais fundo — "mais 2 › mais 1" no rastro não
       * significa nada e dá dois passos para desfazer um.
       */
      const ultimo = atual[atual.length - 1];
      const base = ultimo?.tipo === "cauda" ? ultimo.desde : 0;
      const semACauda = ultimo?.tipo === "cauda" ? atual.slice(0, -1) : atual;
      return [
        ...semACauda,
        { tipo: "cauda", paiId: peca.paiId, desde: base + peca.desde, nome: "menores" },
      ];
    });
  }, []);

  const irParaNivel = useCallback((nivel: number) => {
    setCaminho((atual) => atual.slice(0, nivel + 1));
  }, []);

  const verTudo = useCallback(() => setCaminho([]), []);

  /**
   * Tocar num item da atenção ENQUADRA ele no mapa.
   *
   * Sem isto a lista diria "olhe para X" sem levar a X — que é a diferença entre
   * um painel de prioridades e uma lista de recados. O caminho para no PAI, para
   * o item aparecer como peça no palco em vez de o palco virar o interior dele.
   *
   * ⚠️ E PRECISA ABRIR A CAUDA quando o alvo está dobrado, senão a promessa
   * falha justo para quem ela serve. Prioridade é urgência, não volume: o tema
   * que o aluno mais precisa ver costuma ser dos que menos ocupam área, e esse
   * está dentro do "Mais N temas menores". Medido em Cirurgia da ENARE, no palco
   * do telemóvel — tocar num tema de 1 questão levava ao nível onde ele é
   * invisível. Por isso `caminhoQueMostra`, que refaz a dobra com a medida do
   * palco e acrescenta o passo da cauda quando é o caso.
   */
  const enquadrar = useCallback(
    (id: string) =>
      setCaminho(
        caminhoQueMostra(
          indice,
          id,
          { x: 0, y: 0, w: palco.w, h: palco.h },
          { ladoMinimo: LADO_MINIMO, maxPecas: MAX_PECAS, vao: VAO },
        ),
      ),
    [indice, palco.w, palco.h],
  );

  /**
   * ⚠️ `LIMITE_DA_ARVORE` é o TETO DO SERVIDOR (`le=1000`), não conforto. Se uma
   * banca tiver mais nós, a resposta vem cortada — e um nó cujo pai ficou de fora
   * é promovido a raiz por `construirIndice`, então o nível 0 deixaria de ser
   * "as especialidades" e viraria um despejo plano, sem nada dizer.
   */
  const truncado = nos.length >= LIMITE_DA_ARVORE;

  if (arvore.isPending) {
    return <Skeleton className="h-64 w-full" rotulo="Carregando o mapa da prova" />;
  }
  if (arvore.isError) {
    return (
      <Alert variant="danger" onRetry={() => void arvore.refetch()}>
        Não consegui carregar o mapa desta banca.
      </Alert>
    );
  }
  if (nos.length === 0) {
    return (
      <p className="text-nota text-muted">
        Ainda não há assuntos catalogados para a {nomeDaBanca}.
      </p>
    );
  }

  const atual = caminho.length > 0 ? caminho[caminho.length - 1] : null;
  const noAtual = atual?.tipo === "no" ? indice.porId.get(atual.id) : undefined;
  const questoesAqui = noAtual?.question_count ?? 0;
  // ⚠️ O QUE DÁ PARA PRATICAR, que desde 2026-09-10 já não é o mesmo número.
  //
  // A árvore passou a medir a PROVA (`population: "exam"`), então `question_count`
  // inclui anulada, duplicata e desatualizada — coisas que a banca cobrou e o
  // Banco não serve. Publicar só o primeiro dimensionaria por um número e
  // ofereceria outro, em silêncio.
  const praticaveisAqui = noAtual?.servable_question_count ?? questoesAqui;
  const anuladasAqui = noAtual?.annulled_question_count ?? 0;
  // O que sobra depois das anuladas: duplicata (o sobrevivente do dedup vive
  // noutra banca) e questão desatualizada. Sai da subtração porque o agregado
  // publica os dois extremos e a anulada, e não uma quarta coluna para o resto.
  const saidasAqui = Math.max(0, questoesAqui - praticaveisAqui - anuladasAqui);

  // A cauda continua sendo MOSAICO — o que muda nela e o peso, que passa a ser
  // uniforme (ver `disporNivel`). Ela ja chegou a ser lista, e o operador
  // apontou que trocar de linguagem visual no meio da navegacao nao compatibiliza.
  const emCauda = atual?.tipo === "cauda";

  return (
    <section aria-label="Mapa navegável da prova" className="ritmo-secao">
      <div className="overflow-hidden rounded-surface border border-edge bg-paper">
        <TrilhaDoTerritorio
          indice={indice}
          caminho={caminho}
          nomeDaBanca={nomeDaBanca}
          onIr={irParaNivel}
          onVerTudo={verTudo}
        />

        {/* `<ul>/<li>` devolve semântica de lista ao mapa — e é o seletor que o
            spec de gate usa para contar as peças de cada nível. */}
        <div ref={prenderPalco} className="relative h-[22rem] sm:h-[30rem]">
            {/* ⚠️ `data-mapa-pecas` existe porque a seção passou a ter DUAS
                listas: as peças do mapa e a lista da atenção. Sem um alvo
                próprio, `li button` deixa de significar "peça do mapa" — e foi
                exatamente assim que o teste do tamanho passou a contar linhas da
                atenção como se fossem peças. */}
            <ul data-mapa-pecas="" className="absolute inset-0 m-0 list-none p-0">
              {pecas.map((peca) => (
                <li
                  key={peca.tipo === "cauda" ? `cauda-${peca.desde}` : peca.no.knowledge_node_id}
                  className="absolute"
                  style={{
                    left: peca.caixa.x,
                    top: peca.caixa.y,
                    width: peca.caixa.w,
                    height: peca.caixa.h,
                  }}
                >
                  <CelulaDoMapa
                    peca={peca}
                    nomeDaBanca={nomeDaBanca}
                    meu={
                      peca.tipo === "no" ? dominioPorNo.get(peca.no.knowledge_node_id) : undefined
                    }
                    marcado={atencaoLigada && pedeAtencao(peca)}
                    onEntrar={entrar}
                    onPraticar={onPraticar}
                  />
                </li>
              ))}
            </ul>
        </div>
      </div>

      {/* ══ O INTERRUPTOR DA ATENÇÃO ═════════════════════════════════════════
          Um controle só, e ele faz uma coisa: põe à frente o que o aluno mais
          precisa ver, e marca esses no mapa.

          ⚠️ Só aparece quando há o que priorizar. `topic_explanation.py` não
          inventa frase sem evidência, então um acervo sobre o qual o produto
          nada tem a dizer não ganha um botão que não faz nada. */}
      {prioritarios.length > 0 ? (
        // ⚠️ CENTRADO ABAIXO DE `md`: medido a 390px, este interruptor ficava
        // a −129px do centro, encostado à margem esquerda por cima do mosaico.
        // É um controlo SOLITÁRIO — não tem rótulo ao lado a que se prender —,
        // então centrar não separa nada. No desktop volta ao início, alinhado
        // com o trilho de abas logo acima.
        //
        // ⚠️ IRONIA MEDIDA: o Mapa e' a referencia de estado do app, e este
        // botao dele era o divergente — `text-primary` em vez de `text-ink`,
        // `min-h-9` em vez do alvo de 44px, e `border-edge bg-surface` em vez de
        // `border-rule bg-transparent` no nao escolhido. Tres desvios do
        // primitivo que as abas logo acima ja usam.
        <div className="flex justify-center md:justify-start">
          <BotaoDeEscolha
            papel="aba"
            escolhido={atencaoLigada}
            onClick={() => setAtencao((ligada) => !ligada)}
            className="gap-2"
          >
            <>
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 ${atencaoLigada ? "bg-primary" : "bg-muted"}`}
              />
              Atenção
            </>
          </BotaoDeEscolha>
        </div>
      ) : null}

      {/* ══ ONDE PRESTAR ATENÇÃO ═════════════════════════════════════════════
          O porquê vem ESCRITO, sem exigir um toque por item — "direta e
          objetiva" foi o pedido. A frase é `recommendation_explanation`, gerada
          por `topic_explanation.py`, que já respeita três regras: sem evidência
          não há frase; nunca afirma prova que o aluno não declarou; e todo
          percentual sai com o denominador à vista.

          ⚠️ A FRASE NÃO É REMONTADA AQUI. Ela é regra de negócio e precisa sair
          igual na sessão, na tela de temas e aqui — é o que o serviço documenta.
          Tocar num item ENQUADRA ele no mapa: prioridade que não leva a lugar
          nenhum é recado, não mapa. */}
      {atencaoLigada && prioritarios.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-px p-0">
          {prioritarios.map((no) => (
            <li key={no.knowledge_node_id}>
              <button
                type="button"
                onClick={() => enquadrar(no.knowledge_node_id)}
                className="paper-control flex w-full items-start gap-2 border-t border-rule py-2 text-left transition-colors hover:bg-surface"
              >
                <span
                  aria-hidden="true"
                  className="mt-1 h-2 w-2 shrink-0 bg-ink"
                />
                <span className="min-w-0">
                  <span className="block font-serif text-nota text-ink">{no.node_name}</span>
                  <span className="mt-0.5 block text-nota text-muted">
                    {no.recommendation_explanation}
                  </span>
                  {/* ⚠️ A FRASE PODE FALAR DE OUTRA BANCA, e sem esta linha isso
                      era invisível.

                      `_apply_target_demand` mede a procura sobre TODAS as provas
                      declaradas (até 3) e, entre elas, "vence a maior"
                      (`bank_demand.py`). Então no mapa da ENARE a frase pode
                      citar a USP-SP — e o próprio `topic_explanation.py` previu
                      a queixa: "na tela de OUTRA banca, porque a evidência é do
                      objetivo do aluno, não do mapa que ele está olhando".

                      Aqui a divergência passa a ser DITA. O escopo de verdade
                      (a Atenção só desta banca) é mudança de backend. */}
                  {evidenciaDeOutraBanca(no, nomeDaBanca) ? (
                    <span className="mt-0.5 block text-micro text-muted">
                      Evidência da {evidenciaDeOutraBanca(no, nomeDaBanca)}, outra prova sua.
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* ⚠️ A LEGENDA NOMEIA O DENOMINADOR UMA VEZ, para o palco inteiro.
          A v2 tinha uma legenda que MUDAVA de frase conforme a fonte do número —
          e decidia isso com `algum`, não `todos`, então anunciava "a demanda
          medida" com parte da árvore em contagem de acervo. Agora há uma fonte
          só, e ela se chama pelo nome.

          ⚠️ NÃO dizer "as fatias somam o total": a contagem é `COUNT(DISTINCT)`
          sobre escopo de subárvore, e a mesma questão pode estar em dois nós. */}
      <p className="text-nota text-muted">
        {noAtual ? (
          <>
            <span className="text-ink">{noAtual.node_name}</span> — {questoesAqui}{" "}
            {questoesAqui === 1 ? "questão" : "questões"} cobradas pela {nomeDaBanca}. O
            tamanho de cada peça é a fatia dela aqui dentro.
            {praticaveisAqui < questoesAqui ? (
              <>
                {" "}
                {praticaveisAqui}{" "}
                {praticaveisAqui === 1 ? "está disponível" : "estão disponíveis"} para
                praticar
                {anuladasAqui > 0
                  ? `, ${anuladasAqui} ${anuladasAqui === 1 ? "foi anulada" : "foram anuladas"}`
                  : ""}
                {saidasAqui > 0
                  ? `, ${saidasAqui} ${saidasAqui === 1 ? "saiu" : "saíram"} do acervo`
                  : ""}
                .
              </>
            ) : null}
          </>
        ) : emCauda ? (
          // A conta FECHA: o número aqui é o mesmo que a peça prometeu. E a
          // frase explica por que estas peças têm todas o mesmo tamanho, em vez
          // de deixar o aluno concluir que a prova cobra os seis igualmente.
          <>
            Os {filhos.length} menores{" "}
            {(() => {
              const pai =
                atual?.tipo === "cauda" && atual.paiId ? indice.porId.get(atual.paiId) : undefined;
              return pai ? <>de {pai.node_name}</> : <>desta prova</>;
            })()}
            , todos do mesmo tamanho — entre eles a diferença é pequena demais
            para a área dizer alguma coisa.
          </>
        ) : (
          <>
            O tamanho de cada peça é quantas questões a {nomeDaBanca} cobrou dela.
            Toque para aproximar; num assunto, a sessão começa.
          </>
        )}
      </p>

      {truncado ? (
        <p className="text-nota text-muted">
          <strong className="font-medium">
            A árvore desta banca passou do teto que o servidor devolve de uma vez, então
            há ramos que não estão aqui.
          </strong>
        </p>
      ) : null}
    </section>
  );
}
