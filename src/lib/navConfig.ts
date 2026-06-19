export type NavItemConfig = {
  href: string;
  label: string;
  shortLabel: string;
  /** All pathnames that should keep this nav item visually active. */
  groupPaths: string[];
};

export type NavGroupConfig = {
  items: NavItemConfig[];
};

function normalizePathname(pathname: string): string {
  const [withoutHash] = pathname.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  if (!withoutQuery || withoutQuery === "/") return "/";
  return withoutQuery.replace(/\/+$/, "");
}

export function isNavItemActive(pathname: string, item: NavItemConfig): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return item.groupPaths.some((groupPath) => {
    const normalizedGroupPath = normalizePathname(groupPath);
    return (
      normalizedPathname === normalizedGroupPath ||
      normalizedPathname.startsWith(`${normalizedGroupPath}/`)
    );
  });
}

export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  {
    items: [
      {
        href: "/hoje",
        label: "HOJE",
        shortLabel: "Hoje",
        groupPaths: ["/hoje", "/today", "/calendario", "/agenda-operacional", "/cronograma", "/semana"],
      },
      {
        href: "/banco-de-questoes",
        label: "QUESTÕES",
        shortLabel: "Questões",
        groupPaths: ["/banco-de-questoes"],
      },
      {
        href: "/cards-adaptativos",
        label: "CARDS",
        shortLabel: "Cards",
        groupPaths: ["/cards-adaptativos", "/revisao-turbo", "/caderno"],
      },
      {
        href: "/revisoes",
        label: "REVISÕES",
        shortLabel: "Revisões",
        groupPaths: ["/revisoes"],
      },
    ],
  },
  {
    items: [
      {
        href: "/dados-e-relatorios",
        label: "DESEMPENHO",
        shortLabel: "Desempenho",
        groupPaths: [
          "/dados-e-relatorios",
          "/dados-e-relatorios/graficos",
          "/dados-e-relatorios/relatorio",
          "/estatisticas",
          "/estatisticas/graficos",
          "/estatisticas/relatorio",
        ],
      },
      {
        href: "/rotina-e-metas",
        label: "PLANO",
        shortLabel: "Plano",
        // /desempenho renders the plan/goals UI (re-exported by /rotina-e-metas) — group it here.
        groupPaths: ["/rotina-e-metas", "/desempenho"],
      },
    ],
  },
];
