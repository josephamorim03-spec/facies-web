export type StudentIntent =
  | "today"
  | "kros"
  | "bank"
  | "cards"
  | "evolution"
  | "planning"
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

const INTENTS: Record<
  StudentIntent,
  { path: string; label: string; title: string; icon: StudentNavIcon }
> = {
  today: { path: "/hoje", label: "Hoje", title: "Hoje", icon: "today" },
  kros: { path: "/kros", label: "Kros", title: "Kros", icon: "kros" },
  bank: { path: "/banco", label: "Banco", title: "Banco", icon: "bank" },
  cards: { path: "/cards", label: "Cards", title: "Cards", icon: "cards" },
  evolution: {
    path: "/evolucao",
    label: "Evolução",
    title: "Evolução",
    icon: "evolution",
  },
  // `/cronograma` e' a URL canonica: e' o nome que a tela usa com o aluno, e o
  // diretorio real do codigo (`app/cronograma/`). `/planejamento` continua
  // respondendo como alias compativel.
  planning: {
    path: "/cronograma",
    label: "Cronograma",
    title: "Cronograma",
    icon: "planning",
  },
  profile: {
    path: "/preferencias",
    label: "Perfil",
    title: "Perfil",
    icon: "profile",
  },
};

//: Caminhos legados que ainda precisam casar com o estado ativo da navegacao.
//:
//: So entra aqui caminho que o navegador consegue RENDERIZAR. Um 308 declarado em
//: `next.config.js` resolve antes do roteamento de arquivos, entao o aluno nunca
//: para nessa URL e a entrada correspondente nunca casa com nada — era o caso de
//: `/praticar`, `/revisar`, `/acompanhar`, `/planejar`, `/calendario`, `/perfil`,
//: `/banco-de-questoes`, `/revisoes`, `/cards-adaptativos`, `/revisao-turbo`,
//: `/caderno` e `/planejamento`, nenhum deles com diretorio em `src/app`.
//:
//: `/estatisticas` fica: apesar de a raiz ser 308, `/estatisticas/relatorio` e
//: `/estatisticas/graficos` sao paginas reais e dependem do grupo para o estado
//: ativo.
const LEGACY_PATHS: Record<StudentIntent, string[]> = {
  today: ["/today", "/semana"],
  kros: ["/provas"],
  bank: ["/banco"],
  cards: ["/cards", "/cards/registros"],
  evolution: ["/estatisticas"],
  planning: ["/agenda-operacional", "/desempenho"],
  // `/rotina-e-metas` e' 308 para `/preferencias`, entao pertence ao Perfil.
  profile: ["/rotina-e-metas"],
};

function route(path: string, title: string, intent: StudentIntent): StudentRouteConfig {
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
  ...Object.values(INTENTS).map((item) =>
    route(item.path, item.title, item.icon),
  ),
  route("/trilha", "Trilha", "planning"),
  route("/onboarding", "Começar", "planning"),
  ...Object.entries(LEGACY_PATHS).flatMap(([intent, paths]) =>
    paths.map((path) => route(path, INTENTS[intent as StudentIntent].title, intent as StudentIntent)),
  ),
];

function normalizePathname(pathname: string): string {
  const [withoutHash] = pathname.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+$/, "");
}

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

// Content tabs belong to each destination. The global shell no longer creates
// a second navigation hierarchy.
export function getIntentChildren(_pathname: string): NavChildConfig[] {
  return [];
}

export function isNavChildActive(pathname: string, item: NavChildConfig): boolean {
  const normalized = normalizePathname(pathname);
  return item.matches.some((candidate) => {
    const target = normalizePathname(candidate);
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

export function getActiveChildLabel(_pathname: string): string | null {
  return null;
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
    groupPaths: [config.path, ...LEGACY_PATHS[intent]],
    icon: config.icon,
  };
}

// Quatro blocos, separados por divisória, agrupados por PERGUNTA e não por tipo
// de tela: a Kros é o chamariz e fica sozinha; "o que faço agora" (Hoje) com
// "quando" (Cronograma); depois onde o estudo acontece (Banco, Cards); por fim
// olhar para trás e para si (Evolução, Perfil).
//
// Perfil é item de menu, não um botão solto ao lado da foto: uma área de
// destino merece o mesmo peso das outras, e o atalho duplicado obrigava o aluno
// a aprender dois caminhos para a mesma tela.
//
// Alterar esta ordem exige atualizar `tests/unit/navConfig.test.mjs` e
// `PRIMARY_NAV_ROUTES` em `components/AppShell.tsx`.
export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  {
    items: [navItem("kros")],
  },
  {
    items: [navItem("today"), navItem("planning")],
  },
  {
    items: [navItem("bank"), navItem("cards")],
  },
  {
    items: [navItem("evolution"), navItem("profile")],
  },
];
