import { REVIEW_ROUTES } from "./reviewRoutes.ts";

export type StudentIntent = "today" | "practice" | "review" | "track" | "plan";
export type StudentNavIcon = "today" | "practice" | "review" | "track" | "plan";

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

/**
 * Subnavegação: os destinos reais de cada intenção. Sem isto o menu expõe só
 * os 5 verbos e páginas como Sessões, Cards, Caderno, Gráficos, Relatórios e
 * Metas ficam inalcançáveis — foi o que levou cada tela a improvisar a própria
 * barra de abas. `matches` cobre os apelidos da mesma página.
 */
export type NavChildConfig = {
  href: string;
  label: string;
  matches: string[];
};

function child(href: string, label: string, ...aliases: string[]): NavChildConfig {
  return { href, label, matches: [href, ...aliases] };
}

const INTENT_CHILDREN: Record<StudentIntent, NavChildConfig[]> = {
  // Hoje é tela única: a próxima ação não tem irmãs.
  today: [],
  practice: [
    child("/praticar", "Banco", "/banco-de-questoes"),
    // Simulados é um filtro daqui (ver provas/page.tsx), não um destino irmão.
    child(REVIEW_ROUTES.sessionHistory, "Sessões", "/provas"),
  ],
  review: [
    child(REVIEW_ROUTES.activeReview, "Fila"),
    child(REVIEW_ROUTES.adaptiveCards, "Cards", REVIEW_ROUTES.turboCompatibility),
    child(REVIEW_ROUTES.notebook, "Caderno"),
  ],
  track: [
    child("/acompanhar", "Desempenho", "/estatisticas"),
    child("/estatisticas/graficos", "Gráficos", "/dados-e-relatorios/graficos"),
    child("/estatisticas/relatorio", "Relatórios", "/dados-e-relatorios/relatorio", "/dados-e-relatorios"),
  ],
  plan: [
    child("/cronograma", "Calendário", "/calendario", "/agenda-operacional"),
    child("/rotina-e-metas", "Metas", "/perfil"),
  ],
};

const INTENTS: Record<StudentIntent, { path: string; label: string; title: string; icon: StudentNavIcon }> = {
  today: { path: "/hoje", label: "Hoje", title: "Hoje", icon: "today" },
  practice: { path: "/praticar", label: "Praticar", title: "Praticar", icon: "practice" },
  review: { path: REVIEW_ROUTES.activeReview, label: "Revisar", title: "Revisar", icon: "review" },
  track: { path: "/acompanhar", label: "Acompanhar", title: "Acompanhar", icon: "track" },
  plan: { path: "/planejar", label: "Planejar", title: "Planejar", icon: "plan" },
};

function route(path: string, title: string, intent: StudentIntent): StudentRouteConfig {
  const parent = INTENTS[intent];
  return {
    path,
    title,
    shortLabel: title,
    intent,
    intentPath: parent.path,
    breadcrumb: path === parent.path ? [parent.label] : [parent.label, title],
    warmup: intent,
    icon: parent.icon,
  };
}

export const STUDENT_ROUTES: StudentRouteConfig[] = [
  route("/hoje", "Hoje", "today"),
  route("/praticar", "Praticar", "practice"),
  route("/banco-de-questoes", "Banco de questões", "practice"),
  route(REVIEW_ROUTES.activeReview, "Revisar", "review"),
  route(REVIEW_ROUTES.adaptiveCards, "Cards adaptativos", "review"),
  // Apelido histórico da mesma tela de cards; sem registro, o menu não
  // destacava nada quando o aluno caía aqui.
  route(REVIEW_ROUTES.turboCompatibility, "Cards adaptativos", "review"),
  route(REVIEW_ROUTES.notebook, "Caderno", "review"),
  route("/acompanhar", "Acompanhar", "track"),
  route("/estatisticas", "Desempenho", "track"),
  route("/dados-e-relatorios", "Relatórios", "track"),
  // Sessões vive em Praticar: é onde se retoma uma sessão inacabada.
  route(REVIEW_ROUTES.sessionHistory, "Sessões", "practice"),
  route("/provas", "Simulados", "practice"),
  route("/planejar", "Planejar", "plan"),
  route("/desempenho", "Plano de estudo", "plan"),
  route("/rotina-e-metas", "Rotina e metas", "plan"),
  route("/cronograma", "Cronograma", "plan"),
  route("/calendario", "Calendário", "plan"),
  route("/agenda-operacional", "Agenda", "plan"),
  route("/perfil", "Perfil", "plan"),
];

function normalizePathname(pathname: string): string {
  const [withoutHash] = pathname.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+$/, "");
}

export function getStudentRoute(pathname: string): StudentRouteConfig | null {
  const normalized = normalizePathname(pathname);
  return STUDENT_ROUTES
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => normalized === item.path || normalized.startsWith(`${item.path}/`)) ?? null;
}

export function getStudentPageTitle(pathname: string): string {
  return getStudentRoute(pathname)?.title ?? "";
}

export function getStudentWarmupIntent(pathname: string): StudentIntent | null {
  return getStudentRoute(pathname)?.warmup ?? null;
}

/** Sub-abas da intenção a que o caminho pertence (vazio quando é tela única). */
export function getIntentChildren(pathname: string): NavChildConfig[] {
  const current = getStudentRoute(pathname);
  if (!current) return [];
  return INTENT_CHILDREN[current.intent] ?? [];
}

export function isNavChildActive(pathname: string, item: NavChildConfig): boolean {
  const normalized = normalizePathname(pathname);
  return item.matches.some((candidate) => {
    const target = normalizePathname(candidate);
    return normalized === target || normalized.startsWith(`${target}/`);
  });
}

/** Rótulo da sub-aba ativa — usado como subtítulo/breadcrumb. */
export function getActiveChildLabel(pathname: string): string | null {
  const found = getIntentChildren(pathname).find((item) => isNavChildActive(pathname, item));
  return found?.label ?? null;
}

export function isNavItemActive(pathname: string, item: NavItemConfig): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return item.groupPaths.some((groupPath) => {
    const normalizedGroupPath = normalizePathname(groupPath);
    return normalizedPathname === normalizedGroupPath || normalizedPathname.startsWith(`${normalizedGroupPath}/`);
  });
}

function navItem(intent: StudentIntent): NavItemConfig {
  const config = INTENTS[intent];
  return {
    href: config.path,
    label: config.label.toUpperCase(),
    shortLabel: config.label,
    groupPaths: STUDENT_ROUTES.filter((item) => item.intent === intent).map((item) => item.path),
    icon: config.icon,
  };
}

export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  { items: [navItem("today"), navItem("practice"), navItem("review")] },
  { items: [navItem("track"), navItem("plan")] },
];
