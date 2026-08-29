export type StudentIntent =
  | "today"
  | "bank"
  | "cards"
  | "profile";

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
  today: { path: "/hoje", label: "Início", icon: "today" },
  bank: { path: "/banco", label: "Banco", icon: "bank" },
  cards: { path: "/cards", label: "Cards", icon: "cards" },
  // A aba abre em Evolucao, nao em Preferencias: e a tela que o aluno consulta
  // com frequencia. O rotulo diz "Perfil" porque nomeia a AREA (voce e seus
  // dados), e a linha de filhos resolve a ambiguidade no mesmo olhar.
  profile: { path: "/evolucao", label: "Perfil", icon: "profile" },
};

//: Filhos de cada aba. Sao eles que dao titulo a pagina: com o Cronograma
//: morando sob INICIO, o titulo nao pode mais vir do rotulo da aba pai.
//:
//: `matches` so aceita caminho que o navegador consegue RENDERIZAR. Um 308 de
//: `next.config.js` resolve antes do roteamento de arquivos, entao o aluno nunca
//: para nessas URLs e a entrada nunca casaria com nada.
const CHILDREN: Record<StudentIntent, NavChildConfig[]> = {
  today: [
    { href: "/hoje", label: "Hoje", matches: ["/hoje", "/today", "/semana"] },
    // Rotulo "Cronograma" e nao "Calendario": e o nome que a tela usa com o
    // aluno e o diretorio real da rota. `/calendario` e 308 desde antes.
    {
      href: "/cronograma",
      label: "Cronograma",
      matches: ["/cronograma", "/agenda-operacional", "/desempenho", "/trilha"],
    },
  ],
  bank: [
    { href: "/banco", label: "Montar sessão", matches: ["/banco"] },
    { href: "/banco/historico", label: "Histórico", matches: ["/banco/historico"] },
  ],
  cards: [
    { href: "/cards", label: "Montar sessão", matches: ["/cards"] },
    { href: "/cards/registros", label: "Pesquisar", matches: ["/cards/registros"] },
  ],
  profile: [
    { href: "/evolucao", label: "Evolução", matches: ["/evolucao", "/estatisticas"] },
    { href: "/preferencias", label: "Preferências", matches: ["/preferencias", "/rotina-e-metas"] },
  ],
};

//: Caminhos legados que o navegador ainda RENDERIZA e que precisam acender a
//: aba certa. `/kros` e `/rota` NAO entram: os dois sao 308 para `/hoje`, entao
//: ninguem para neles. `/provas` tambem sai — ele redireciona por conta propria
//: para o historico.
const LEGACY_PATHS: Record<StudentIntent, string[]> = {
  today: ["/today", "/semana", "/agenda-operacional", "/desempenho", "/trilha", "/onboarding"],
  bank: [],
  cards: [],
  profile: ["/estatisticas", "/rotina-e-metas"],
};

const INTENT_ORDER: StudentIntent[] = ["today", "bank", "cards", "profile"];

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
  // Abas sem filho carregam o proprio rotulo.
  ...INTENT_ORDER.filter((intent) => CHILDREN[intent].length === 0).map((intent) =>
    route(INTENTS[intent].path, INTENTS[intent].label, intent),
  ),
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

const INTENTS_VISIVEIS: StudentIntent[] = INTENT_ORDER.filter(
  (intent) => intent !== "cards" || FLASHCARDS_LIGADOS,
);

export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  { items: INTENTS_VISIVEIS.map(navItem) },
];

export const NAV_ITEMS: NavItemConfig[] = NAV_GROUPS_CONFIG[0].items;
