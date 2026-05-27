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
        href: "/agenda-operacional",
        label: "AGENDA OPERACIONAL",
        shortLabel: "Agenda Operacional",
        groupPaths: ["/agenda-operacional", "/cronograma", "/semana", "/today"],
      },
      {
        href: "/cards-adaptativos",
        label: "CARDS ADAPTATIVOS",
        shortLabel: "Cards Adaptativos",
        groupPaths: ["/cards-adaptativos", "/revisao-turbo", "/caderno"],
      },
    ],
  },
  {
    items: [
      {
        href: "/dados-e-relatorios",
        label: "DADOS E RELATÓRIOS",
        shortLabel: "Dados e Relatórios",
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
        label: "ROTINA E METAS",
        shortLabel: "Rotina e Metas",
        groupPaths: ["/rotina-e-metas", "/rotina"],
      },
    ],
  },
];
