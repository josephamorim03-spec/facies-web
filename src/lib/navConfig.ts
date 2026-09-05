export type StudentIntent =
  | "today"
  | "bank"
  | "cards"
  | "profile"
  | "you"
  | "map";

export type StudentNavIcon = StudentIntent;

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
export type NavChildConfig = { href: string; label: string; matches: string[] };

//: Quatro destinos, um verbo cada. Foram cinco: a Rota saiu porque a tela dela
//: era uma PERGUNTA (quanto tempo, com que energia), e a pergunta morreu — o
//: tamanho do dia vem do calendario e do comportamento observado, e aparece como
//: contexto da proxima acao no Hoje. O motor continua se chamando
//: `navigation_route` no backend; o que sumiu foi a aba, nao o mecanismo.
const INTENTS: Record<
  StudentIntent,
  { path: string; label: string; icon: StudentNavIcon }
> = {
  // Os rotulos do desenho sao "hoje", "banco", "evolucao", "rotina", "conta".
  // Ficam em Caixa Alta AQUI porque este campo vira titulo de pagina e
  // breadcrumb (`route()`, abaixo) — "voce esta em hoje" nao se escreve assim.
  // A barra inferior os rebaixa por CSS, que e onde o desenho pede minuscula.
  today: { path: "/hoje", label: "Hoje", icon: "today" },
  // `9a` "O mapa da prova": a facies da banca-alvo do aluno, dentro do app.
  map: { path: "/mapa", label: "Mapa", icon: "map" },
  bank: { path: "/banco", label: "Banco", icon: "bank" },
  cards: { path: "/cards", label: "Cards", icon: "cards" },
  // A aba abre em Evolucao, nao em Preferencias: e a tela que o aluno consulta
  // com frequencia. O rotulo diz "Perfil" porque nomeia a AREA (voce e seus
  // dados), e a linha de filhos resolve a ambiguidade no mesmo olhar.
  // "Evolucao", e nao "Perfil": o desenho nomeia a tela pelo que ela MOSTRA. O
  // "voce e seus dados" que o rotulo antigo cobria virou duas abas — `rotina`
  // (a sua semana) e `conta` (assinatura e provas).
  profile: { path: "/evolucao", label: "Evolução", icon: "profile" },
  // ⚠️ VOCE ABSORVE ROTINA E CONTA, e a barra volta a CINCO destinos.
  //
  // Isto reverte a decisao de 2026-09-02 ("seis, com Conta") e o mapa de
  // destinos do desenho (`Webapp - telas.dc.html:278`). O motivo nao e' gosto:
  //
  // 1. MEDIDA. O item da barra e' `flex-1` e o rotulo e' mono de 11px com
  //    tracking. A 320px, seis abas dao 53px cada, e "EVOLUÇÃO" pede ~60px de
  //    largura minima -- a barra estourava ~40px na horizontal. O e2e media so'
  //    a 390px, entao o caso nunca apareceu. Com cinco sao 64px, a mesma folga
  //    que os seis tinham a 390.
  //
  // 2. A GRAMATICA QUE O ALUNO JA' SABE. Instagram, YouTube e Duolingo poem
  //    quatro destinos de CONTEUDO e um de PESSOA. Rotina e Conta nao sao
  //    conteudo: sao ajuste, e ajuste vive dentro do perfil em toda rede social
  //    que este publico usa todo dia.
  //
  // 3. O PEDIDO EXPLICITO do operador (2026-09-04): a rotina e o calendario
  //    "nao devem brilhar" -- a semana padrao se declara uma vez e o calendario
  //    serve a quem quer previsibilidade. Peso de destino permanente para
  //    tarefa rara e' o oposto disso.
  //
  // Nada perdeu alcance: `/preferencias`, `/cronograma`, `/plano` e `/conta`
  // continuam rotas, continuam no registro, continuam acendendo esta aba, e
  // ganham entrada nomeada em `/voce`. Para voltar aos seis, o filtro e'
  // `INTENTS_VISIVEIS`, abaixo.
  you: { path: "/voce", label: "Você", icon: "you" },
};

//: Filhos de cada aba. Sao eles que dao titulo a pagina: com o Cronograma
//: morando sob INICIO, o titulo nao pode mais vir do rotulo da aba pai.
//:
//: `matches` so aceita caminho que o navegador consegue RENDERIZAR. Um 308 de
//: `next.config.js` resolve antes do roteamento de arquivos, entao o aluno nunca
//: para nessas URLs e a entrada nunca casaria com nada.
const CHILDREN: Record<StudentIntent, NavChildConfig[]> = {
  // O Hoje ficou SEM filhos: o Cronograma mudou para `routine`, junto com a
  // semana padrao, que e como o `14a` os apresenta — as duas abas de dentro de
  // "Minha rotina". O Hoje volta a ser um destino so, que e o que o `8b` mostra.
  today: [],
  map: [],
  bank: [
    { href: "/banco", label: "Montar sessão", matches: ["/banco"] },
    // A lista de guardadas mora sob o Banco, e nao na barra: o desenho fixa
    // SEIS destinos e o setimo nao caberia em 390px. E guardadas e' uma forma
    // de olhar o Banco, nao um lugar diferente dele.
    { href: "/banco/guardadas", label: "Guardadas", matches: ["/banco/guardadas"] },
    { href: "/banco/historico", label: "Histórico", matches: ["/banco/historico"] },
  ],
  cards: [
    { href: "/cards", label: "Montar sessão", matches: ["/cards"] },
    { href: "/cards/registros", label: "Pesquisar", matches: ["/cards/registros"] },
  ],
  // Sem filhos: `/preferencias` saiu para `routine`, e `/estatisticas` e
  // caminho legado da propria Evolucao (fica em LEGACY_PATHS).
  profile: [],
  you: [
    // ⚠️ `/voce` NAO E' FILHO DE SI MESMO, e isso e' o que apaga a linha de
    // secoes na propria tela.
    //
    // `hasChildRow` so' desenha a linha quando ha >= 2 filhos E um deles esta
    // ativo. Com `/voce` na lista, abrir a aba acendia um filho e a linha
    // aparecia -- quatro botoes de chrome permanente logo acima da barra, com
    // "O plano até a prova" truncado no meio, para repetir o menu que a PAGINA
    // ja e'. Era o oposto do pedido: a rotina e o calendario nao devem brilhar.
    //
    // Sem ele, `/voce` abre limpa e a linha so' aparece DENTRO das telas de
    // ajuste, onde ela serve para andar entre irmas.
    // Os rotulos das duas abas do artboard `14a`.
    { href: "/preferencias", label: "Minha semana", matches: ["/preferencias", "/rotina-e-metas"] },
    {
      // O `9c` e' a LEITURA do plano (fases, o que nao coube, quanto a rotina
      // comporta). `/cronograma` continua existindo e continua sendo onde se
      // arrasta atividade entre dias -- ele vira ferramenta, e nao destino.
      href: "/plano",
      label: "O plano até a prova",
      matches: ["/plano", "/cronograma", "/agenda-operacional", "/desempenho", "/trilha"],
    },
    { href: "/conta", label: "Conta", matches: ["/conta"] },
  ],
};

//: Caminhos legados que o navegador ainda RENDERIZA e que precisam acender a
//: aba certa. `/kros` e `/rota` NAO entram: os dois sao 308 para `/hoje`, entao
//: ninguem para neles. `/provas` tambem sai — ele redireciona por conta propria
//: para o historico.
const LEGACY_PATHS: Record<StudentIntent, string[]> = {
  // `/agenda-operacional`, `/desempenho` e `/trilha` mudaram de aba junto com o
  // Cronograma: eles sao o plano, e o plano agora mora em Rotina.
  today: ["/today", "/semana", "/onboarding"],
  map: [],
  bank: [],
  cards: [],
  profile: ["/estatisticas"],
  you: ["/cronograma", "/agenda-operacional", "/desempenho", "/trilha", "/rotina-e-metas"],
};

// A ordem e a do desenho: hoje · mapa · banco · evolucao · rotina · conta.
//
// `mapa` (artboard `9a`) JA' ENTROU: `/mapa` existe e mostra a facies da
// banca-alvo. A ponte que eu tinha dado como incerta e' direta --
// `StudentTargetExamItem.institution_key` e `Banca.institution_key` sao o mesmo
// vocabulario, validado no onboarding.
//
// `cards` fica na lista para as ROTAS continuarem resolvendo; quem o tira da
// barra e `INTENTS_VISIVEIS`, mais abaixo.
const INTENT_ORDER: StudentIntent[] = [
  "today",
  "map",
  "bank",
  "cards",
  "profile",
  "you",
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
  // Um filho por rota real: o titulo vem do filho, nao do pai.
  ...INTENT_ORDER.flatMap((intent) =>
    CHILDREN[intent].map((child) => route(child.href, child.label, intent)),
  ),
  // ⚠️ TODA aba registra o proprio caminho, TENHA OU NAO filhos.
  //
  // A condicao era `CHILDREN[intent].length === 0`, e ela funcionava enquanto o
  // caminho da aba fosse tambem o de um filho: `/banco` e o filho "Montar
  // sessão" apontam para o mesmo lugar, e o titulo vinha do filho.
  //
  // "Você" quebrou a coincidencia. Ela tem tres filhos e nenhum deles e' ela
  // mesma -- de proposito, para a linha de secoes nao aparecer na propria tela.
  // Resultado: `/voce` ficou fora do registro, sem titulo, e a barra de topo do
  // celular abriu em branco.
  //
  // Vem DEPOIS dos filhos: `getStudentRoute` ordena por comprimento e fica com
  // o primeiro empate, entao o filho continua ganhando onde os dois existem, e
  // `/banco` segue titulado "Montar sessão".
  ...INTENT_ORDER.map((intent) => route(INTENTS[intent].path, INTENTS[intent].label, intent)),
  ...INTENT_ORDER.flatMap((intent) =>
    LEGACY_PATHS[intent].map((path) => route(path, INTENTS[intent].label, intent)),
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

export function getStudentPageTitle(pathname: string): string {
  return getStudentRoute(pathname)?.title ?? "";
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
      ...LEGACY_PATHS[intent],
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

/**
 * Filho ativo por casamento MAIS ESPECIFICO.
 *
 * Prefixo simples nao serve aqui: `/banco/historico` casa com `/banco` e com
 * `/banco/historico` ao mesmo tempo, e as duas abas acenderiam. Vence o alvo
 * mais longo. Mesmo caso em `/cards` e `/cards/registros`.
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
    label: config.label.toUpperCase(),
    shortLabel: config.label,
    groupPaths: [
      config.path,
      ...LEGACY_PATHS[intent],
      ...CHILDREN[intent].map((child) => child.href),
    ],
    icon: config.icon,
  };
}

// Uma barra so, sem divisorias: no mobile isto e a barra inferior de 5 abas e no
// desktop e o menu bar horizontal. A taxonomia e a MESMA nos dois — menu, titulo
// e URL dizem a mesma coisa.
//
// Alterar esta ordem exige atualizar `tests/unit/navConfig.test.mjs` e
// `PRIMARY_NAV_ROUTES` em `components/AppShell.tsx`.
/**
 * Os flashcards estao fora de producao, e saem SO DA PORTA.
 *
 * `NEXT_PUBLIC_FLASHCARDS` (default "0", declarado em `next.config.js`) esconde
 * a aba. O par obrigatorio e `FLASHCARDS_ENABLED` no backend, que impede a
 * agenda de oferecer o bloco "Revisar cards no ponto" -- uma chave sem a outra
 * deixa metade da feature ligada.
 *
 * ⚠️ O FILTRO E AQUI, e nao em `INTENT_ORDER`. Aquela lista tambem monta a
 * tabela de rotas (`STUDENT_ROUTES`, linhas 127-136): tirar `cards` dela faria
 * `/cards` deixar de RESOLVER, e o redirect que existe para ela dependeria de
 * uma rota que o mapa nao conhece mais. As rotas continuam existindo; o que
 * some e o caminho ate elas.
 *
 * Religar e virar a env. Nao ha codigo a reescrever, que era a condicao do
 * "deixar de molho" -- 30 arquivos no front e 62 no backend citam flashcards.
 */
const FLASHCARDS_LIGADOS = process.env.NEXT_PUBLIC_FLASHCARDS === "1";

/**
 * CINCO destinos: hoje · mapa · banco · evolucao · voce.
 *
 * Quatro de conteudo e um de pessoa -- ver o comentario de `you` em `INTENTS`
 * para os tres motivos (a medida a 320px, a gramatica das redes, o pedido de
 * nao dar peso permanente a ajuste raro).
 *
 * O avatar no rodape da sidebar continua levando ao mesmo lugar; agora ele e'
 * a MESMA porta que a aba, e nao uma segunda.
 */
const INTENTS_VISIVEIS: StudentIntent[] = INTENT_ORDER.filter(
  (intent) => intent !== "cards" || FLASHCARDS_LIGADOS,
);

export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  { items: INTENTS_VISIVEIS.map(navItem) },
];

export const NAV_ITEMS: NavItemConfig[] = NAV_GROUPS_CONFIG[0].items;
