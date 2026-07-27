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
  route(REVIEW_ROUTES.notebook, "Caderno", "review"),
  route("/acompanhar", "Acompanhar", "track"),
  route("/estatisticas", "Desempenho", "track"),
  route("/dados-e-relatorios", "Dados e relatórios", "track"),
  route(REVIEW_ROUTES.sessionHistory, "Histórico de sessões", "track"),
  route("/provas", "Provas", "track"),
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
