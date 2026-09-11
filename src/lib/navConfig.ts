/**
 * A taxonomia da navegação do aluno — CINCO destinos, organizados pelo que o
 * aluno faz, e não pelo que o produto tem.
 *
 * ## A mudança de 2026-09-10, e o que ela troca
 *
 * O operador pediu a jornada do app de xadrez: uma home que é RESUMO, duas abas
 * de estudo ativo, o explorar, e um "Mais" que guarda o resto.
 *
 * | aba | a pergunta |
 * | --- | --- |
 * | Início | o que importa agora — resumo, sequência, o que está quente |
 * | Cards | (estudo ativo: recuperar da memória) |
 * | Banco | (estudo ativo: resolver questão) |
 * | Mapa | como é o território |
 * | Mais | tudo o que se visita poucas vezes |
 *
 * ⚠️ **O eixo mudou, e é isso que justifica reescrever a barra.** A taxonomia
 * anterior era o prontuário — EXAMINA, decide o PLANO, acompanha a EVOLUÇÃO —,
 * e ela descrevia bem o raciocínio clínico. O que ela não fazia era separar o
 * que se usa TODO DIA do que se usa por mês: "Plano", "Evolução" e "Você"
 * ocupavam três dos cinco pesos permanentes, e nenhum deles é onde o aluno
 * passa o tempo. As duas abas de estudo ativo ficavam espremidas numa só
 * ("Prática"), com flashcards escondidos atrás de uma chave.
 *
 * A língua do prontuário **não morreu**: ela continua nomeando as telas
 * (Plano, Evolução, Rotina) — só deixou de decidir a barra. Nomear as telas é
 * onde ela é exata; decidir os cinco pesos permanentes é onde a frequência de
 * uso manda.
 *
 * As três taxonomias anteriores, e o erro de cada uma:
 *
 * - "Hoje · Banco · Evolução · Rotina · Conta" nomeava a NOSSA arquitetura.
 *   "Banco" é o acervo, não o que se faz com ele; "Rotina" e "Conta" eram a
 *   mesma pergunta ocupando dois pesos permanentes.
 * - "Rota · Treino · Mapa · Dados · Você" pedia emprestada uma metáfora de GPS
 *   que só cobria DUAS das cinco abas. Metáfora que não fecha vira tema.
 * - "Plano · Prática · Mapa · Evolução · Você" acertou a língua e errou a
 *   frequência: três das cinco abas eram tarefas de mês.
 *
 * ⚠️ **"Banco" volta como rótulo, e isto reverte uma decisão registada.** A
 * taxonomia anterior proibia-o em texto (`navConfig.test.mjs` tinha uma prova
 * dedicada), com o argumento de que ele nomeia o acervo e não o ato. O
 * argumento continua correto — e deixou de decidir: com Cards ao lado, o par
 * precisa de nomear os dois OBJETOS ("cartão" e "banco de questões"), porque é
 * o objeto que os separa, não o ato. Os dois são "praticar". Reversão pedida
 * pelo operador, registada aqui em vez de feita em silêncio.
 *
 * O Mapa continua no lugar de explorar, entre o estudo ativo e o "Mais".
 */
export type StudentIntent =
  | "inicio"
  | "cards"
  | "banco"
  | "mapa"
  | "mais";

/**
 * Os ícones — os cinco da barra MAIS os das telas que o "Mais" lista.
 *
 * ⚠️ Deixou de ser `= StudentIntent`. Enquanto as cinco abas eram os cinco
 * destinos, a igualdade era verdade; agora Plano, Evolução e Conta são telas
 * que a barra não mostra e a lista do "Mais" mostra — precisam de ícone sem
 * precisar de aba. Manter a igualdade obrigaria a lista a inventar símbolos
 * fora do conjunto, que é como este produto já teve DOIS mapas de ícone.
 *
 * Continua um `Record` exaustivo em `navIcons.tsx`: destino novo sem ícone é
 * erro de compilação, não fallback silencioso.
 */
export type StudentNavIcon =
  | StudentIntent
  | "plano"
  | "evolucao"
  | "conta"
  // Promovidos ao menu do DESKTOP em 2026-09-10 — ver `NAV_ITEMS_DESKTOP`. No
  // telemóvel continuam a ser linhas da lista do "Mais".
  | "calendario"
  | "rotina";

export type StudentRouteConfig = {
  path: string;
  title: string;
  shortLabel: string;
  intent: StudentIntent;
  intentPath: string;
  breadcrumb: string[];
  warmup: StudentIntent;
  icon: StudentNavIcon;
};

export type NavItemConfig = {
  href: string;
  label: string;
  shortLabel: string;
  groupPaths: string[];
  icon: StudentNavIcon;
};

export type NavGroupConfig = { items: NavItemConfig[] };
export type NavChildConfig = {
  href: string;
  label: string;
  /**
   * Rótulo da LINHA de seções, quando o título da página não cabe nela.
   *
   * `label` continua sendo o título (topo do celular, breadcrumb); este campo é
   * só a etiqueta do botão. Existe por medida: a linha de filhos do mobile é
   * `flex-1` sem rolagem, então em 390px três botões têm ~120px cada — "O plano
   * até a prova" não cabe, "Plano" cabe. Quem lê a linha já sabe em que aba
   * está; quem lê o título pode ter chegado por link.
   */
  shortLabel?: string;
  matches: string[];
};

/**
 * ✅ OS FLASHCARDS VOLTARAM (2026-09-10, a pedido do operador), e agora são uma
 * ABA — não um link escondido dentro da Prática.
 *
 * `NEXT_PUBLIC_FLASHCARDS` (default **"1"**, declarado em `next.config.js`)
 * continua a existir como interruptor. O par obrigatório é `FLASHCARDS_ENABLED`
 * no backend, que solta o bloco "Revisar cards no ponto" da agenda — uma chave
 * sem a outra deixa metade da feature ligada.
 *
 * ⚠️ Com a chave desligada, `/cards` deixa de ter ROTA no registo, e não só
 * link: ele é 307 para `/hoje` em `next.config.js`, então ninguém para nele e
 * uma rota registada só serviria para o menu acender estado ativo de uma URL
 * inalcançável. É por isso que `INTENT_ORDER` também a omite, e a barra fica com
 * quatro abas em vez de cinco.
 */
// A chave mora em `flags.ts` e e' IMPORTADA, nao redeclarada. Seis modulos
// ja' a consomem de la' (`PostExamReview`, `dayActivitySummary`,
// `GraficosSection`, `useGraficosData`, `preferencias/page`, e este) -- uma
// copia local aqui seria a setima definicao da mesma flag, e duas fontes
// para a mesma verdade divergem no dia em que uma delas muda.
//
// ⚠️ Import RELATIVO E COM EXTENSAO. Este modulo e' lido pelo runner de
// testes (`node --test --experimental-strip-types`), que NAO resolve o alias
// `@/` -- sem a extensao, `navConfig.test.mjs` morre inteiro em
// ERR_MODULE_NOT_FOUND antes de correr um assert.
import { FLASHCARDS_LIGADOS } from "./flags.ts";

const INTENTS: Record<
  StudentIntent,
  { path: string; label: string; icon: StudentNavIcon }
> = {
  // ⚠️ `/inicio`, e não `/hoje` nem `/rota` — as duas URLs óbvias estão
  // queimadas ou ocupadas.
  //
  // `/rota` é 308 PERMANENTE para `/hoje` em `next.config.js`, e o navegador de
  // quem já visitou guarda 308 sem voltar a perguntar: reaproveitá-la prenderia
  // em `/hoje` exatamente o aluno antigo. E `/hoje` é uma TELA que continua a
  // existir — a agenda do dia —, não o resumo. O Início mostra o dia como um
  // bloco entre outros; herdar a URL faria a tela antiga responder pelo nome da
  // nova.
  //
  // `/hoje` fica como caminho legado desta aba: quem tem link antigo aterra numa
  // tela viva, com a aba certa acesa.
  inicio: { path: "/inicio", label: "Início", icon: "inicio" },
  // ⚠️ ESTUDO ATIVO SÃO DUAS ABAS, e não uma. "Prática" era o guarda-chuva de
  // questão + flashcard + guardadas + histórico, e o guarda-chuva escondia que
  // recuperar da memória e resolver questão são gestos diferentes, com sessões
  // diferentes e ritmos diferentes. Enquanto foram a mesma aba, o flashcard
  // ficou atrás de uma chave desligada e ninguém sentiu falta na barra.
  cards: { path: "/cards", label: "Cards", icon: "cards" },
  // "Banco" nomeia o OBJETO, e é isso que o separa do Cards ao lado — os dois
  // são "praticar". Ver a ressalva no topo: é uma reversão declarada.
  banco: { path: "/banco", label: "Banco", icon: "banco" },
  // `9a` "O mapa da prova": a fácies da banca-alvo do aluno, dentro do app.
  mapa: { path: "/mapa", label: "Mapa", icon: "mapa" },
  // ⚠️ "Mais" é ROTA REAL (`/mais`), e não só uma folha que abre um painel.
  //
  // Os seis consumidores deste config chaveiam por `href` — `isNavItemActive`,
  // `getStudentRoute`, `data-nav-item-href`, `PRIMARY_NAV_ROUTES`, a
  // `CommandBar` (que tem invariante explícito de não divergir do menu) e o
  // pré-aquecimento. Uma aba sem URL exigiria um ramo novo em cada um deles.
  //
  // O `/voce` de hoje já É, na prática, esta tela: o hub agrupado com Conta,
  // rotina e preferências. `/mais` herda esse conteúdo e ganha as telas que
  // saíram da barra (Plano, Evolução).
  mais: { path: "/mais", label: "Mais", icon: "mais" },
};

/**
 * Filhos de cada aba. São eles que dão título à página: com o Cronograma
 * morando sob o Plano, o título não pode mais vir do rótulo da aba pai.
 *
 * `matches` só aceita caminho que o navegador consegue RENDERIZAR. Um 308 de
 * `next.config.js` resolve antes do roteamento de arquivos, então o aluno nunca
 * para nessas URLs e a entrada nunca casaria com nada.
 */
const CHILDREN: Record<StudentIntent, NavChildConfig[]> = {
  /**
   * TRÊS DISTÂNCIAS DO MESMO PLANO: agora, esta semana, este mês.
   *
   * A aba deixou de misturar naturezas. Antes ela juntava o dia (`/hoje`), o
   * FORMULÁRIO da rotina (`/preferencias`) e a leitura das fases (`/plano`) —
   * uma tela de fazer, uma de configurar e uma de ler, na mesma fileira. A
   * fileira só faz sentido quando os botões são o MESMO conteúdo visto de outra
   * distância, que é o que "Hoje · Semana · Mês" é.
   *
   * O formulário da rotina saiu para a aba Você, onde moram os ajustes; a
   * leitura das fases (`/plano`) continua existindo e é alcançada por link, de
   * dentro do Hoje e do Você.
   */
  // Sem seções: o Início É o resumo, e a decisão de o que mostrar é do sistema
  // (escolha do operador — sem tela de configuração). Dar-lhe sub-abas seria
  // devolver ao aluno a escolha que ele pediu para não ter.
  //
  // ⚠️ A agenda do dia (`/hoje`) não é filha, é legado: ela continua a ser uma
  // tela inteira, e o Início mostra um RESUMO dela. Duas telas, não duas vistas.
  inicio: [],
  // ✅ O CADERNO GANHOU PORTA. `navConfig.ts` registava isto como decisão em
  // aberto — "quando os flashcards voltarem, o Caderno precisa de porta DENTRO
  // de `/cards`" — porque ele só era alcançável pelo `matches`, sem botão.
  // Com Cards como aba própria, a linha de seções tem dois botões e sobra
  // espaço em 390px, que era o constrangimento que impedia.
  //
  // ⚠️ AS SECÇÕES NOMEIAM O ATO; a ABA nomeia o objeto. A aba continua "Cards"
  // (é o que se guarda), e as secções passaram de "Cards | Caderno" para
  // "Praticar | Registros" a pedido do operador (2026-09-10). "Cards | Cards"
  // — aba e primeira secção com o mesmo nome — não dizia ao aluno o que
  // mudava ao tocar.
  cards: [
    { href: "/cards", label: "Praticar", matches: ["/cards"] },
    { href: "/cards/registros", label: "Registros", matches: ["/cards/registros"] },
  ],
  banco: [
    { href: "/banco", label: "Questões", matches: ["/banco"] },
    // Guardadas é uma forma de olhar o acervo, não um lugar diferente dele.
    { href: "/banco/guardadas", label: "Guardadas", matches: ["/banco/guardadas"] },
    { href: "/banco/historico", label: "Histórico", matches: ["/banco/historico"] },
  ],
  // Sem seções por decisão, não por omissão: o Mapa é superfície de exploração
  // livre, e dar sub-abas a ele seria transformar navegação em menu.
  mapa: [],
  // Sem seções: a tela do "Mais" JÁ É a lista agrupada. Uma fileira de botões
  // por cima de uma lista dos mesmos destinos seria o mesmo menu duas vezes —
  // e são nove destinos, que não cabem numa fileira de 390px.
  mais: [],
};

/**
 * Caminhos que o navegador ainda RENDERIZA e que precisam acender a aba certa.
 *
 * `/kros` e `/rota` NÃO entram: os dois são 308 para `/hoje`, então ninguém
 * para neles. `/provas` também sai — ele redireciona por conta própria para o
 * histórico. `/agenda-operacional` idem (307 para `/cronograma/mes`).
 *
 * ⚠️ **A FORMA COM TÍTULO EXISTE DESDE QUE O "MAIS" ABSORVEU TELAS INTEIRAS.**
 * Enquanto cada entrada era um alias da própria aba (`/estatisticas` sob
 * Evolução), herdar o rótulo do pai era exato. O "Mais" não é isso: ele guarda
 * nove telas com nomes próprios, e herdar daria a todas o título "Mais" — no
 * topo do telemóvel e no breadcrumb. Um alias herda; um destino tem nome.
 */
type LegacyPath = string | { path: string; title: string };

/** O caminho de uma entrada, seja ela alias simples ou destino com nome. */
function caminhoLegado(entrada: LegacyPath): string {
  return typeof entrada === "string" ? entrada : entrada.path;
}

const LEGACY_PATHS: Record<StudentIntent, LegacyPath[]> = {
  inicio: [
    // ⚠️ `/hoje` É UMA TELA VIVA, não um redirect. O Início resume o dia; a
    // agenda inteira continua aqui. Sem esta linha, quem chega por link antigo
    // fica sem aba acesa e sem título — o defeito exato que `/voce` já teve.
    { path: "/hoje", title: "Hoje" },
    // ⚠️ CINCO ENTRADAS SAIRAM DESTA LISTA, e a regra que as tirou é a do topo:
    // só entra caminho que o navegador consegue RENDERIZAR. `/today`,
    // `/semana`, `/desempenho` e `/rotina-e-metas` viraram redirect, e
    // `/trilha` perdeu até o diretório. O redirect resolve ANTES do roteamento
    // de ficheiros, então o aluno nunca para nessas URLs.
    "/onboarding",
  ],
  cards: [],
  banco: [],
  mapa: [],
  /**
   * As nove telas que saíram da barra. Nenhuma foi apagada — mudaram de porta.
   *
   * ⚠️ Cada uma com o SEU título: ver a ressalva no tipo `LegacyPath`.
   */
  mais: [
    // O hub de hoje. `/mais` herda o conteúdo dele; a URL antiga continua a
    // abrir e a acender a aba certa, porque é ela que está em links e no avatar.
    { path: "/voce", title: "Você" },
    // 🚨 "ROTINA", e era "Minha semana" — um nome só, em todo o lado.
    //
    // A tela dimensiona o dia: quanto dá para estudar em cada tipo de dia. Ela
    // chamava-se "Minha semana" aqui e no hub, e o operador pediu "Rotina" no
    // menu do desktop (2026-09-10). Três nomes para uma tela é o defeito que
    // esta base já combateu ("dois nomes, duas portas"), então o nome mudou nos
    // TRÊS sítios em vez de só no menu.
    //
    // ⚠️ ISTO REVERTE UMA PROIBIÇÃO REGISTADA. "Rotina" estava na lista de
    // nomes mortos de `navConfig.test.mjs` e `navigation.shell.spec.ts` — mas
    // como nome de ABA, na taxonomia "Hoje · Banco · Evolução · Rotina · Conta",
    // onde ela gastava um dos cinco pesos permanentes numa tarefa de mês. O
    // argumento era sobre o PESO na barra, não sobre a palavra; como nome de
    // tela ela sempre foi exata.
    { path: "/preferencias", title: "Rotina" },
    { path: "/conta/preferencias", title: "Preferências" },
    { path: "/conta", title: "Conta" },
    // ⚠️ O CALENDÁRIO INTEIRO VEIO PARA CÁ, e com ele a leitura das fases.
    // Eram as três seções da aba Plano (Hoje · Semana · Mês); o "Hoje" ficou no
    // Início, e estas duas passaram a ser destinos do "Mais". Continuam
    // alcançáveis por link de dentro do Início.
    { path: "/plano", title: "O plano até a prova" },
    { path: "/cronograma/mes", title: "Mês" },
    { path: "/cronograma", title: "Semana" },
    { path: "/evolucao", title: "Evolução" },
    // Alias antigo da Evolução, que continua a renderizar.
    { path: "/estatisticas", title: "Evolução" },
  ],
};

/**
 * A ordem da barra: início · cards · banco · mapa · mais.
 *
 * Ela também monta a tabela de rotas (`STUDENT_ROUTES`): tirar uma intenção
 * daqui faz as URLs dela deixarem de RESOLVER, e não só sumirem do menu.
 *
 * ⚠️ **`cards` sai da barra quando a chave está desligada, e a barra fica com
 * quatro.** Não é elegante, e é o comportamento honesto: com
 * `NEXT_PUBLIC_FLASHCARDS=0`, `next.config.js` emite `/cards → /hoje`, então
 * uma aba permanente seria uma porta para lado nenhum. Uma aba não é uma
 * feature flag — mas enquanto a chave existir, ela tem de valer para a barra
 * também, senão desligar os flashcards deixa um destino morto no rodapé.
 *
 * Alterar esta ordem exige atualizar `tests/unit/navConfig.test.mjs` e
 * `tests/e2e/navigation.shell.spec.ts`.
 */
const INTENT_ORDER: StudentIntent[] = [
  "inicio",
  ...(FLASHCARDS_LIGADOS ? (["cards"] as StudentIntent[]) : []),
  "banco",
  "mapa",
  "mais",
];

function normalizePathname(pathname: string): string {
  const [withoutHash] = pathname.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+$/, "");
}

function matchLength(pathname: string, candidate: string): number {
  const normalized = normalizePathname(pathname);
  const target = normalizePathname(candidate);
  if (normalized === target || normalized.startsWith(`${target}/`)) return target.length;
  return -1;
}

function route(
  path: string,
  title: string,
  intent: StudentIntent,
): StudentRouteConfig {
  const parent = INTENTS[intent];
  return {
    path,
    title,
    shortLabel: title,
    intent,
    intentPath: parent.path,
    breadcrumb: [parent.label],
    warmup: intent,
    icon: parent.icon,
  };
}

export const STUDENT_ROUTES: StudentRouteConfig[] = [
  // Um filho por rota real: o título vem do filho, não do pai.
  ...INTENT_ORDER.flatMap((intent) =>
    CHILDREN[intent].map((child) => route(child.href, child.label, intent)),
  ),
  // Abas sem filho carregam o próprio rótulo.
  ...INTENT_ORDER.filter((intent) => CHILDREN[intent].length === 0).map((intent) =>
    route(INTENTS[intent].path, INTENTS[intent].label, intent),
  ),
  ...INTENT_ORDER.flatMap((intent) =>
    // Alias simples herda o rotulo da aba; destino com nome traz o seu -- ver a
    // ressalva no tipo `LegacyPath`.
    LEGACY_PATHS[intent].map((entrada) =>
      typeof entrada === "string"
        ? route(entrada, INTENTS[intent].label, intent)
        : route(entrada.path, entrada.title, intent),
    ),
  ),
];

export function getStudentRoute(pathname: string): StudentRouteConfig | null {
  const normalized = normalizePathname(pathname);
  return (
    STUDENT_ROUTES.slice()
      .sort((a, b) => b.path.length - a.path.length)
      .find(
        (item) =>
          normalized === item.path || normalized.startsWith(`${item.path}/`),
      ) ?? null
  );
}

/**
 * Título da tela: o rótulo da SEÇÃO ativa primeiro, o da rota depois.
 *
 * A ordem importa desde que o calendário virou seção. `/cronograma` herdando o
 * rótulo do pai chamaria a semana de "Plano" — que não é nem verdade nem útil.
 * A seção ativa dele é "Semana", que é o que ele de fato mostra.
 */
export function getStudentPageTitle(pathname: string): string {
  return getActiveChildLabel(pathname) ?? getStudentRoute(pathname)?.title ?? "";
}

export function getStudentWarmupIntent(pathname: string): StudentIntent | null {
  return getStudentRoute(pathname)?.warmup ?? null;
}

function intentForPathname(pathname: string): StudentIntent | null {
  let best: StudentIntent | null = null;
  let bestLen = -1;
  for (const intent of INTENT_ORDER) {
    const candidates = [
      INTENTS[intent].path,
      ...LEGACY_PATHS[intent].map(caminhoLegado),
      ...CHILDREN[intent].flatMap((child) => child.matches),
    ];
    for (const candidate of candidates) {
      const len = matchLength(pathname, candidate);
      if (len > bestLen) {
        bestLen = len;
        best = intent;
      }
    }
  }
  return best;
}

export function getIntentChildren(pathname: string): NavChildConfig[] {
  const intent = intentForPathname(pathname);
  return intent ? CHILDREN[intent] : [];
}

/** Etiqueta do botão na linha de seções; cai no título quando não há versão curta. */
export function navChildShortLabel(item: NavChildConfig): string {
  return item.shortLabel ?? item.label;
}

/**
 * Filho ativo por casamento MAIS ESPECÍFICO.
 *
 * Prefixo simples não serve aqui: `/banco/historico` casa com `/banco` e com
 * `/banco/historico` ao mesmo tempo, e as duas seções acenderiam. Vence o alvo
 * mais longo.
 */
function activeChild(pathname: string): NavChildConfig | null {
  const children = getIntentChildren(pathname);
  let best: NavChildConfig | null = null;
  let bestLen = -1;
  for (const child of children) {
    for (const candidate of child.matches) {
      const len = matchLength(pathname, candidate);
      if (len > bestLen) {
        bestLen = len;
        best = child;
      }
    }
  }
  return best;
}

export function isNavChildActive(pathname: string, item: NavChildConfig): boolean {
  return activeChild(pathname)?.href === item.href;
}

export function getActiveChildLabel(pathname: string): string | null {
  return activeChild(pathname)?.label ?? null;
}

export function isNavItemActive(pathname: string, item: NavItemConfig): boolean {
  const normalized = normalizePathname(pathname);
  return item.groupPaths.some((groupPath) => {
    const target = normalizePathname(groupPath);
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

function navItem(intent: StudentIntent): NavItemConfig {
  const config = INTENTS[intent];
  return {
    href: config.path,
    // ⚠️ A VERSAL É DO CSS, e este campo existe porque `label` também vira
    // título de página e breadcrumb — "você está em PLANO" não se escreve
    // assim. O checker de copy pt-BR lê o DOM, que segue acentuado.
    label: config.label.toUpperCase(),
    shortLabel: config.label,
    groupPaths: [
      config.path,
      ...LEGACY_PATHS[intent].map(caminhoLegado),
      ...CHILDREN[intent].map((child) => child.href),
    ],
    icon: config.icon,
  };
}

// Uma barra só, sem divisórias: no mobile isto é a barra inferior de cinco abas
// e no desktop é o menu bar horizontal. A taxonomia é a MESMA nos dois — menu,
// título e URL dizem a mesma coisa.
export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  { items: INTENT_ORDER.map(navItem) },
];

/**
 * 🚨 O DESKTOP MOSTRA MAIS, E É A PRIMEIRA VEZ QUE AS DUAS LARGURAS DIVERGEM.
 *
 * Até 2026-09-10 a lista era a MESMA nas duas — o comentário acima dizia-o, e
 * era verdade. O operador pediu que no desktop apareçam Evolução, Calendário e
 * Rotina antes do "Mais". A razão é de espaço, não de taxonomia: a barra do
 * telemóvel tem cinco pesos e 78px por aba; a rail do desktop é uma coluna que
 * rola (`Nav.tsx`, `flex-1 overflow-y-auto`) e não tem esse teto.
 *
 * ## Promoção, e não uma segunda taxonomia
 *
 * Os três destinos JÁ EXISTEM como caminhos legados do "Mais"
 * (`LEGACY_PATHS.mais`), cada um com título próprio. Aqui eles são PROMOVIDOS a
 * item — o mesmo `href`, o mesmo título, o mesmo destino. Nada é inventado, e
 * `/mais` continua a listá-los, porque no telemóvel é por lá que se chega.
 *
 * ## ⚠️ A SUBTRAÇÃO É O PONTO DELICADO
 *
 * `isNavItemActive` casa por PREFIXO sobre `groupPaths`. Sem tirar os promovidos
 * do "Mais", em `/evolucao` acendiam DOIS itens ao mesmo tempo — e há prova a
 * exigir exatamente um (`navConfig.test.mjs`, "deveria acender UMA aba").
 *
 * `/estatisticas` viaja com `/evolucao` porque é alias dela e o prefixo não o
 * cobre; `/cronograma/mes` não precisa de linha própria porque o prefixo de
 * `/cronograma` já o apanha.
 */
const PROMOVIDOS_NO_DESKTOP: ReadonlyArray<{
  path: string;
  rotulo: string;
  icon: StudentNavIcon;
  /** Caminhos que acendem este item além do próprio `path`. */
  tambem?: readonly string[];
}> = [
  { path: "/evolucao", rotulo: "Evolução", icon: "evolucao", tambem: ["/estatisticas"] },
  { path: "/cronograma", rotulo: "Calendário", icon: "calendario" },
  { path: "/preferencias", rotulo: "Rotina", icon: "rotina" },
];

function itemPromovido(
  promovido: (typeof PROMOVIDOS_NO_DESKTOP)[number],
): NavItemConfig {
  return {
    href: promovido.path,
    label: promovido.rotulo.toUpperCase(),
    shortLabel: promovido.rotulo,
    groupPaths: [promovido.path, ...(promovido.tambem ?? [])],
    icon: promovido.icon,
  };
}

export const NAV_ITEMS_DESKTOP: NavItemConfig[] = (() => {
  /**
   * ⚠️ A SUBTRAÇÃO É POR PREFIXO, e não por igualdade — a igualdade deixou
   * `/cronograma/mes` a acender DUAS abas.
   *
   * `LEGACY_PATHS.mais` lista `/cronograma` e `/cronograma/mes` como entradas
   * separadas (cada uma com o seu título, "Semana" e "Mês"). Promover
   * `/cronograma` tirava só essa, e a filha continuava no "Mais" — que passava a
   * acender ao lado do item promovido.
   *
   * A regra vem do próprio comparador (`isNavItemActive`: igual, ou debaixo
   * dele). Repeti-la à mão numa lista era como isto se partia de novo no dia em
   * que alguém promovesse outro caminho com filhos.
   */
  const cobertoPorPromovido = (caminho: string): boolean => {
    const alvo = normalizePathname(caminho);
    return PROMOVIDOS_NO_DESKTOP.some((p) =>
      [p.path, ...(p.tambem ?? [])].some((raiz) => {
        const base = normalizePathname(raiz);
        return alvo === base || alvo.startsWith(`${base}/`);
      }),
    );
  };
  const semOsPromovidos = (item: NavItemConfig): NavItemConfig =>
    item.href === INTENTS.mais.path
      ? { ...item, groupPaths: item.groupPaths.filter((p) => !cobertoPorPromovido(p)) }
      : item;

  const base = INTENT_ORDER.map(navItem).map(semOsPromovidos);
  const indiceDoMais = base.findIndex((item) => item.href === INTENTS.mais.path);
  const novos = PROMOVIDOS_NO_DESKTOP.map(itemPromovido);

  // Os promovidos entram ANTES do "Mais", que fica sempre por último: ele é a
  // gaveta, e gaveta no meio da lista deixa de se ler como gaveta.
  return indiceDoMais < 0
    ? [...base, ...novos]
    : [...base.slice(0, indiceDoMais), ...novos, ...base.slice(indiceDoMais)];
})();

export const NAV_ITEMS: NavItemConfig[] = NAV_GROUPS_CONFIG[0].items;
