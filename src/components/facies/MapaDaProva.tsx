"use client";

import { useState } from "react";
import { PISO_N_CELULA } from "@/lib/facies";
import { resolveDisplayArea, type DisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_VAR } from "@/lib/areaIdentity";

/**
 * O mapa da prova — cada célula é um assunto, o tamanho é a incidência.
 *
 * Portado do protótipo (`facies-site-v3.html`, seção "O mapa da prova"), com uma
 * diferença de propósito que muda o que ele encoda.
 *
 * ## O que o protótipo faz, e o que muda aqui
 *
 * Lá o mapa vive DEPOIS do diagnóstico e responde "onde EU estou fraco": o
 * preenchimento que sobe de baixo é o domínio do aluno, e "grande e vazia é a
 * sua maior lacuna". Aqui ele está na página anônima e responde a outra
 * pergunta — "o que ESTA BANCA cobra" — que não depende de dado do aluno
 * nenhum. Mesma forma, outro eixo.
 *
 * Por isso não há preenchimento por domínio: não existe aluno nesta tela. O que
 * sobrevive é o que o protótipo já fazia mais forte, e que a lista numerada não
 * fazia: **tamanho é incidência**, e a prova inteira cabe num olhar.
 *
 * ## A cor vem da MESMA fonte que a barra ao lado
 *
 * Por um tempo ela veio de um dicionário curado no frontend
 * (`lib/areaDoAssunto.ts`, 191 rótulos), porque o dataset não trazia a área do
 * assunto. Funcionava e estava errado por construção: virou uma SEGUNDA fonte de
 * verdade, e ela discordava do grafo do kbank em 12.103 questões.
 *
 * O efeito era visível na mesma tela. "Neoplasias do Sistema Digestivo" saía
 * laranja (Cirurgia) aqui no mapa e contava como Clínica Médica na barra logo
 * abaixo — mesmo assunto, mesma página, duas áreas. O mesmo valia para Esôfago,
 * Estômago, Pâncreas e Intestinos.
 *
 * Agora `build_facies_dataset.py` emite `area` em cada linha de `mais_cai`,
 * lida do `node_path` do nó primário — exatamente o campo que alimenta a
 * distribuição por área. Uma fonte, e o dicionário foi apagado.
 */

/** Quanto da tinta da marca entra na célula mais cobrada. */
const TINTA_MAX = 34;
/** E na menos cobrada, para nenhuma célula sumir no fundo. */
const TINTA_MIN = 8;

export type LinhaDoMapa = {
  rotulo: string;
  n: number;
  exibivel: boolean;
  /** A grande área, vinda do MESMO grafo que alimenta a distribuição do painel
   *  ao lado. Ver o comentário sobre a fonte única, acima.
   *
   *  ⚠️ AUSENTE NA PROVA NACIONAL, e não por descuido: `provas.json` não emite
   *  `area` por assunto — só `facies.json` emite. Sem ela a célula cai na tinta
   *  da marca, e o mapa do ENAMED nasce monocromático. A correção é o
   *  `build_facies_dataset.py` emitir `area` também em `mais_cai` da prova, lida
   *  do `node_path` do nó primário, exatamente como ele já faz do lado da banca.
   *  É trabalho no kbank. */
  area?: string | null;
  /**
   * A SÉRIE POR APLICAÇÃO, quando a leitura é composta.
   *
   * Só a prova nacional a tem: ela soma a própria aplicação direta às provas que
   * substituiu, e sem a série a célula diria "25 questões" sem dizer que 23
   * vieram de outras provas. A banca institucional passa `undefined` — a
   * contagem dela é crua e a posição já basta.
   *
   * ⚠️ É DADO, e não um render prop. `MapaDaProva` é `"use client"` e quem o
   * monta (`ProvaReport`, `FaciesReport`) é server component: função não
   * atravessa essa fronteira — ela chega do outro lado como proxy e explode ao
   * ser chamada. Este repositório já mandou para produção um `TOTAL_DE_MARCAS`
   * serializado como texto de erro em 40px pelo mesmo motivo. Tipo cruza; valor
   * cruza; função, não.
   */
  serie?: {
    /** Uma barra por aplicação, da mais antiga para a mais recente. */
    valores: number[];
    /** Quantas das primeiras são correlatas — o traço separador cai aqui. */
    correlatos: number;
    /** A divisão em palavras: "2 desta prova · 23 de provas parecidas". */
    nota: string;
  } | null;
};

/**
 * A série por aplicação. Correlatas em cinza e finas, diretas em petróleo e
 * grossas, com um traço entre as duas.
 *
 * A separação carrega informação: sem ela a barra sugeriria que a prova tem nove
 * aplicações próprias, quando tem uma.
 */
function Serie({ valores, correlatos }: { valores: number[]; correlatos: number }) {
  const maximo = Math.max(1, ...valores);
  return (
    <span className="flex h-6 items-end gap-[2px]" aria-hidden="true">
      {valores.map((valor, indice) => {
        const direta = indice >= correlatos;
        return (
          <span key={indice} className="flex items-end">
            {indice === correlatos ? (
              <span className="mr-[3px] h-6 w-px self-stretch bg-edge" />
            ) : null}
            <span
              className={direta ? "w-2 bg-primary" : "w-[5px] bg-muted opacity-40"}
              style={{ height: `${Math.max(3, (valor / maximo) * 24)}px` }}
            />
          </span>
        );
      })}
    </span>
  );
}

/**
 * O tamanho da célula, por posição no ranking.
 *
 * Por RANKING e não por valor absoluto: bancas têm bases de tamanhos muito
 * diferentes (90 questões no ENAMED, 2.483 na USP) e uma escala por `n` faria o
 * mapa da prova pequena nascer todo miúdo. O que o mapa compara é a prova
 * consigo mesma.
 */
function tamanho(indice: number): string {
  if (indice < 2) return "col-span-3 row-span-2 sm:col-span-2";
  if (indice < 6) return "col-span-3 sm:col-span-2";
  return "col-span-3 sm:col-span-1";
}

/**
 * Quantos assuntos a home mostra.
 *
 * O botão "Ver a fácies completa da USP-SP" levava a uma página com o laudo
 * IDÊNTICO ao da home — medido byte a byte: 1808 caracteres dos dois lados. A
 * palavra "completa" não entregava nada, e clicar era perda de tempo.
 *
 * O dataset tem 15 assuntos por banca e nem um a mais, então "completa" não pode
 * significar mais dado. Significa o RESTO do que já existe: a home mostra os 8
 * que decidem o estudo e a página da banca mostra os 15. É o mesmo corte que o
 * protótipo fazia com o botão "Ver as 15".
 */
const NA_HOME = 8;

export function MapaDaProva({
  linhas,
  limite,
  preOrdenado = false,
  pisoDeObservacao = 5,
  onSelecionar,
  dominio = null,
}: {
  linhas: LinhaDoMapa[];
  /** Sem limite, mostra tudo — é o que a página da banca faz. */
  limite?: number;
  /**
   * A ordem JÁ VEIO DECIDIDA por quem chamou, e o mapa não pode mexer nela.
   *
   * ⚠️ Existe por causa da prova nacional. A banca ordena por contagem crua, e
   * ordenar aqui por `n` reproduz isso. A prova ordena por `score` — um peso que
   * conta MAIS o que caiu na própria aplicação direta e menos o que veio das
   * provas correlatas — então uma linha pode e deve ficar acima de outra com
   * total maior. Reordenar por `n` apagaria em silêncio a única coisa que a
   * série composta acrescenta, e a nota de rodapé do painel viraria mentira.
   */
  preOrdenado?: boolean;
  /**
   * Quantas respostas separam `estimado` de `medido`.
   *
   * Vem do contrato (`CompetencyMasteryOut.observation_floor`) e não de um
   * literal aqui: foi escrevendo o piso da PROVA em três lugares que ele
   * acabou divergindo. O default existe só para quem monta o mapa sem o eixo
   * do aluno, onde ele não é lido.
   */
  pisoDeObservacao?: number;
  /**
   * O seu domínio por subtema — o eixo "A prova e você" do artboard `12b`.
   *
   * A regra do desenho é uma linha: **"tamanho é incidência · preenchimento é
   * você"**. O tamanho da célula continua vindo do posto no ranking da banca; o
   * que muda é de onde sai a tinta. Sem isto, a grade responde "o que a prova
   * cobra" e nada mais.
   *
   * A chave é `primary_subtheme`, e ela casa por construção, não por
   * semelhança: o gerador do dataset preenche `mais_cai` com
   * `r.primary_subtheme AS subtema`, e é a MESMA coluna que
   * `competency_mastery` lê. Verificado nos dois lados antes de existir.
   *
   * ⚠️ Ausência não é zero. Subtema que você nunca respondeu fica no piso de
   * tinta e diz isso no rótulo acessível — pintá-lo claro como quem vai mal
   * seria transformar "não sei" em "você é ruim nisto", que é a mentira mais
   * cara que um mapa de estudo pode contar.
   */
  dominio?: Map<
    string,
    {
      mastery: number;
      attempts: number;
      /**
       * Os TRÊS estados da certeza do aluno (`competency-mastery-v1`).
       *
       * Opcional para não quebrar quem já passa o mapa sem ele: ausente, a
       * célula com dado pinta como `medido`, que é o comportamento anterior.
       */
      certeza?: "medido" | "estimado" | "nao_avaliado";
    }
  > | null;
  /**
   * Avisa quem monta o mapa qual assunto esta aberto — para ele oferecer uma
   * acao sobre o assunto (praticar, por exemplo).
   *
   * ⚠️ OPCIONAL, E FUNCAO. Este componente e' `"use client"` e alguns dos seus
   * pais sao SERVER components (`FaciesReport`, `ProvaReport`): funcao nao
   * atravessa essa fronteira. Eles simplesmente nao passam esta prop, e o mapa
   * continua sendo leitura pura la'. Quem passa e' `MapaClientPage`, que e'
   * cliente.
   */
  onSelecionar?: (rotulo: string | null) => void;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  /**
   * A EXPLORACAO POR AREA.
   *
   * O mosaico mostrava os 15 assuntos mais cobrados de uma vez, e o unico gesto
   * era abrir a leitura de um deles. Explorar por area faz duas coisas que a
   * lista chapada nao faz: mostra que a area TEM peso (quantos dos 15 sao dela)
   * e deixa o medico responder "e dentro de cirurgia, o que cai?" sem ler a
   * grade inteira procurando o filete laranja.
   *
   * ⚠️ O FILTRO USA A MESMA FONTE do resto do mapa -- `linha.area`, que vem do
   * `facies.json`. Nao ha segunda consulta, e por isso nao ha segundo
   * denominador: o "8" ao lado de Cirurgia sao 8 DESTES 15, e nao 8 do acervo.
   * Misturar as duas contagens ja custou 12.103 questoes a este componente --
   * ver o comentario da fonte unica, no topo.
   */
  const [areaAberta, setAreaAberta] = useState<string | null>(null);

  const todas = preOrdenado ? linhas : [...linhas].sort((a, b) => b.n - a.n);
  const noLimite = limite ? todas.slice(0, limite) : todas;

  /** Quantos dos assuntos exibidos pertencem a cada area, na ordem do peso. */
  const areas = new Map<string, number>();
  for (const linha of noLimite) {
    if (!linha.area) continue;
    const codigo = resolveDisplayArea(null, linha.area);
    areas.set(codigo, (areas.get(codigo) ?? 0) + 1);
  }

  const ordenadas = areaAberta
    ? noLimite.filter((linha) => linha.area && resolveDisplayArea(null, linha.area) === areaAberta)
    : noLimite;
  const escondidas = todas.length - noLimite.length;
  if (noLimite.length === 0) return null;

  const maior = ordenadas[0].n || 1;
  const escolhida = ordenadas.find((l) => l.rotulo === aberta) ?? null;
  const posicao = escolhida ? ordenadas.indexOf(escolhida) + 1 : 0;

  function escolher(rotulo: string | null) {
    setAberta(rotulo);
    onSelecionar?.(rotulo);
  }

  return (
    <div>
      {/* A NAVEGACAO POR AREA.
          So aparece com mais de uma area na grade -- com uma so, o filtro nao
          filtra nada e seria chrome puro. A contagem ao lado do nome e' o que
          torna o chip informativo antes de ser tocado: ele ja diz quanto a
          area pesa nos assuntos mostrados. */}
      {areas.size > 1 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={areaAberta === null}
            onClick={() => {
              setAreaAberta(null);
              escolher(null);
            }}
            className={`paper-control min-h-9 rounded-control border px-3 text-nota transition-colors ${
              areaAberta === null
                ? "border-ink bg-ink text-paper"
                : "border-edge bg-surface text-muted hover:text-ink"
            }`}
          >
            Tudo
          </button>
          {[...areas.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([codigo, quantos]) => {
              const escolhida = areaAberta === codigo;
              return (
                <button
                  key={codigo}
                  type="button"
                  aria-pressed={escolhida}
                  onClick={() => {
                    setAreaAberta(escolhida ? null : codigo);
                    escolher(null);
                  }}
                  className="paper-control flex min-h-9 items-center gap-2 rounded-control border border-edge bg-surface px-3 text-nota text-ink transition-colors"
                  style={
                    escolhida
                      ? {
                          // A area escolhida acende NA PROPRIA COR dela — a
                          // mesma do filete das celulas que vao ficar. E' o que
                          // amarra o chip a grade sem uma seta ou um rotulo
                          // dizendo "filtrando por".
                          background: `color-mix(in srgb, ${AREA_VAR[codigo as DisplayArea]} 18%, var(--color-surface))`,
                          borderColor: AREA_VAR[codigo as DisplayArea],
                        }
                      : undefined
                  }
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-[3px] shrink-0"
                    style={{ background: AREA_VAR[codigo as DisplayArea] }}
                  />
                  {AREA_FULL_LABELS[codigo as DisplayArea] ?? codigo}
                  <span className="font-mono tabular-nums text-muted">{quantos}</span>
                </button>
              );
            })}
        </div>
      ) : null}

      {/* `auto-rows` fixo e `dense`: sem altura de linha fixa as células grandes
          esticariam o grid inteiro, e sem `dense` os buracos deixados pelas
          células de 2×2 não seriam preenchidos pelas pequenas. */}
      <ul className="grid grid-cols-6 gap-1 [grid-auto-flow:dense] [grid-auto-rows:4.5rem] sm:[grid-auto-rows:5rem]">
        {ordenadas.map((linha, indice) => {
          const area = linha.area ? resolveDisplayArea(null, linha.area) : null;
          const cor = area ? AREA_VAR[area] : "var(--color-primary)";
          // ── A TINTA QUER DIZER ATENÇÃO, nos dois eixos ──────────────────
          //
          // No eixo da prova ela é a incidência: mais tinta, mais a banca cobra.
          // No eixo "você" ela é o que FALTA (`1 - mastery`), não o domínio.
          //
          // O desenho não decide isto — o `12b` usa placeholders e nenhuma
          // palavra de direção. Mas pintar o domínio inverteria o sentido da
          // tinta entre duas abas da MESMA grade: o leitor teria de reaprender a
          // codificação ao trocar de aba, e a célula mais escura passaria a ser
          // a que ele já sabe. Num mapa que existe para decidir o que estudar, o
          // peso visual pertence à lacuna.
          //
          // ⚠️ SEM registro a fração é ZERO, e não `1 - 0`. Este é o ponto onde
          // a conta quase mentiu: com `mastery` ausente valendo 0, "o que falta"
          // daria 100% e o subtema nunca respondido viraria a célula mais escura
          // da grade — exatamente o "não sei" virando "você é péssimo nisto".
          const meu = dominio ? dominio.get(linha.rotulo) : undefined;
          const fracao = dominio ? (meu ? 1 - meu.mastery : 0) : linha.n / maior;
          const intensidade = TINTA_MIN + fracao * (TINTA_MAX - TINTA_MIN);

          // ── OS TRÊS ESTADOS DO EIXO "VOCÊ" ────────────────────────────
          //
          // O `12b` os separa por FORMA, não por cor: medido é preenchimento
          // liso, estimado é trama a 135°, e não avaliado é tracejado sem
          // preenchimento. A cor continua reservada à grande área.
          //
          // O componente pintava os dois primeiros igual e a página descartava
          // o terceiro — então "respondi 2 questões e vou bem" e "nunca abri
          // este assunto" chegavam à tela com o mesmo tom, e o aluno decidia o
          // que estudar com base numa diferença que a grade não mostrava.
          const estadoDoAluno = dominio
            ? !meu || meu.certeza === "nao_avaliado"
              ? "nao_avaliado"
              : meu.certeza === "estimado"
                ? "estimado"
                : "medido"
            : null;

          const preenchimento = `color-mix(in srgb, ${cor} ${intensidade}%, var(--color-surface))`;
          // A trama usa a MESMA tinta do liso, alternada com a superfície: o
          // estimado tem de ler como "o mesmo valor, com menos certeza", e não
          // como outro valor.
          const fundo =
            estadoDoAluno === "nao_avaliado"
              ? "var(--color-surface)"
              : estadoDoAluno === "estimado"
                ? `repeating-linear-gradient(135deg, ${preenchimento} 0 3px, var(--color-surface) 3px 6px)`
                : preenchimento;
          const estaAberta = linha.rotulo === aberta;
          const grande = indice < 6;

          return (
            <li
              key={`${areaAberta ?? "tudo"}-${linha.rotulo}`}
              className={tamanho(indice)}
              /* A ENTRADA ESCALONADA, e a razao dela e' a do handoff: "os nove
                 valores trocam de leitura com 26ms de atraso por linha, para o
                 olho ver que a mudanca e' a mesma nas nove". Aqui ela mostra
                 que as celulas que ficaram sao um SUBCONJUNTO das que estavam,
                 na mesma ordem de peso — sem isso, filtrar por area parece
                 trocar de tela.

                 `key` inclui a area aberta de proposito: sem isso o React
                 reusa o `<li>` e a animacao nao reinicia.

                 Estilo em linha, e nao classe `animate-*`: o invariante de
                 arquitetura reprova qualquer `animate-` que nao seja de
                 carregamento, e com razao — o keyframe aqui e' o mesmo
                 `surgir-na-lista` que a lista de sessoes ja usa. O bloco global
                 de `prefers-reduced-motion` zera duracao E atraso. */
              style={{
                animation: "surgir-na-lista 320ms var(--ease-cozy) both",
                animationDelay: `${Math.min(indice, 12) * 26}ms`,
              }}
            >
              <button
                type="button"
                aria-expanded={estaAberta}
                onClick={() => escolher(estaAberta ? null : linha.rotulo)}
                /* `aria-label` e nao `title`. O handoff nomeia este caso: "a
                   leitura do mapa fica FORA da grade; balao sobre grade some
                   atras do dedo no celular". O rotulo acessivel entrega a area
                   a quem ouve, e a cor do filete a entrega a quem ve — sem
                   caixa nenhuma por cima da celula. */
                /* A leitura do eixo "você" entra aqui porque a TINTA é a única
                   coisa que a carrega, e tinta não se ouve. Sem esta linha, a
                   aba inteira seria invisível para quem usa leitor de tela. */
                aria-label={[
                  linha.rotulo,
                  area ? AREA_FULL_LABELS[area] : null,
                  // A forma (liso, trama, tracejado) nao se ouve: quem usa
                  // leitor de tela recebe o estado por extenso.
                  estadoDoAluno === "nao_avaliado"
                    ? "não avaliado — você ainda não respondeu isto"
                    : estadoDoAluno
                      ? `${estadoDoAluno} — você acerta ${Math.round((meu?.mastery ?? 0) * 100)}% em ${meu?.attempts ?? 0} respostas`
                      : null,
                ]
                  .filter(Boolean)
                  .join(" — ")}
                className={`paper-control flex h-full w-full flex-col overflow-hidden rounded-control border p-2 text-left transition ${
                  // Tracejada = abaixo do piso, e é o mesmo estado que o
                  // protótipo usa para "ainda não avaliado". Aqui significa
                  // "não temos base para publicar o número", que é a mesma
                  // honestidade pelo outro lado.
                  // Dois eixos, dois tracejados, e eles NAO se encontram: no
                  // eixo da prova ele diz "menos de 5 questoes desta banca"; no
                  // eixo "voce", "nunca respondeu". Cada aba mostra um so'.
                  estadoDoAluno === "nao_avaliado" || !linha.exibivel
                    ? "border-dashed border-edge"
                    : "border-edge"
                } ${estaAberta ? "outline outline-2 -outline-offset-2 outline-accent" : ""}`}
                style={{
                  background: fundo,
                  // O filete cheio na borda esquerda é o unico lugar onde a cor
                  // da area aparece SATURADA: como limite grafico o piso e 3:1,
                  // que a paleta entrega com folga. No preenchimento ela fica
                  // lavada, porque ali por cima vai texto.
                  borderLeftColor: cor,
                  borderLeftWidth: "3px",
                  // ⚠️ O FILETE NUNCA TRACEJA.
                  //
                  // `border-dashed` vale para a caixa inteira, e isso partia
                  // tambem a unica linha onde a cor da area aparece saturada —
                  // a identidade da area virava pontilhado justo nas celulas
                  // sem dado, que sao as que o aluno mais precisa localizar.
                  // O tracejado diz "sem medida"; a cor diz "de que area e'".
                  // Sao informacoes diferentes e nao podem degradar juntas.
                  borderLeftStyle: "solid",
                }}
              >
                {/* ⚠️ SEM `block` AQUI, e a razão é a mesma armadilha de sempre.
                    `block` e `line-clamp-*` definem os DOIS a propriedade
                    `display` — o clamp precisa de `-webkit-box`. Com as duas
                    classes na mesma lista, a que vier depois na folha ganha, e
                    na primeira renderização o clamp ficou inerte: "Complicações
                    da Insuficiência Hepática" ocupou três linhas e empurrou o
                    número para fora da célula, cortado ao meio.

                    O `min-h-0` é o par obrigatório do `flex-1`: item de flex
                    nasce com `min-height:auto` e se recusa a encolher abaixo do
                    conteúdo, então sem ele o clamp resolveria e o overflow
                    voltaria pelo outro lado. */}
                <span
                  className={`min-h-0 flex-1 hyphens-auto font-serif font-semibold leading-tight text-ink ${
                    grande
                      ? "line-clamp-3 text-sm sm:text-base"
                      : "line-clamp-2 text-micro sm:text-sm"
                  }`}
                >
                  {linha.rotulo}
                </span>
                {/* `shrink-0`: o número é a única coisa que não pode sumir —
                    ele é o dado, o resto é rótulo. */}
                {linha.exibivel ? (
                  <span className="mt-1 block shrink-0 font-mono text-micro tabular-nums text-ink">
                    {linha.n}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* A legenda dos três estados, e só no eixo "você".
          O `12b` a desenha logo abaixo da grade: sem ela, trama e tracejado são
          duas texturas que o aluno tem de adivinhar. O piso vem do contrato
          (`observation_floor`), não de um número escrito aqui. */}
      {dominio ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-nota text-muted">
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-6 shrink-0 rounded-control border border-edge"
              style={{
                background: `color-mix(in srgb, var(--color-primary) ${TINTA_MAX}%, var(--color-surface))`,
              }}
            />
            medido
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-6 shrink-0 rounded-control border border-edge"
              style={{
                background: `repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-primary) ${TINTA_MAX}%, var(--color-surface)) 0 3px, var(--color-surface) 3px 6px)`,
              }}
            />
            estimado · 1 a {pisoDeObservacao - 1}
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-6 shrink-0 rounded-control border border-dashed border-edge bg-surface"
            />
            não avaliado
          </li>
        </ul>
      ) : null}

      {/* A leitura fica FORA do mapa, como o `.mapa-read` do protótipo: dentro
          da célula não caberia, e balão sobre grade some atrás do dedo no
          celular — que é onde esta página é lida. */}
      <div
        aria-live="polite"
        className="mt-3 min-h-[3rem] border-t border-rule pt-3"
      >
        {escolhida ? (
          <>
          <p className="text-sm text-ink">
            <b className="font-semibold">{escolhida.rotulo}</b>{" "}
            {escolhida.area ? (
              <span className="text-muted">
                · {AREA_FULL_LABELS[resolveDisplayArea(null, escolhida.area)]}
              </span>
            ) : null}{" "}
            <span className="text-muted">
              · {posicao}º assunto mais cobrado ·{" "}
              {/* A GRAFIA É ÚNICA no produto inteiro, e há um guard sobre ela:
                  "menos de 5", "<5" e "3 de 5" já conviveram para a MESMA regra
                  e quem lia não tinha como saber que eram a mesma coisa.
                  A forma canônica é esta, em JSX — escrita dentro de template
                  literal (`${PISO_N_CELULA}`) ela deixa de casar com o guard,
                  que foi exatamente o que aconteceu aqui. */}
              {escolhida.exibivel ? (
                `${escolhida.n} questões`
              ) : (
                <>menos de {PISO_N_CELULA} questões — poucas para mostrar o número</>
              )}
            </span>
          </p>
          {/* A COMPOSIÇÃO DA SÉRIE, e só quando ela existe.
              Sem esta linha a célula do ENAMED diria "25 questões" sobre uma
              prova que teve UMA aplicação — e quem lê concluiria, com razão, que
              alguém inflou a contagem. As barrinhas mostram de onde veio cada
              uma; a nota diz em palavras. */}
          {escolhida.serie ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <Serie
                valores={escolhida.serie.valores}
                correlatos={escolhida.serie.correlatos}
              />
              <span>{escolhida.serie.nota}</span>
            </p>
          ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">
            O tamanho de cada bloco é o quanto o assunto cai nesta prova. Toque
            para ver quantas questões. Bloco tracejado apareceu poucas vezes.
            {escondidas > 0 ? (
              <>
                {" "}
                Há mais {escondidas} assuntos na leitura completa.
              </>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}
