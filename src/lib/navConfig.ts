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

// A navegação expõe intenções; os módulos continuam como ferramentas internas.
export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  {
    items: [
      {
        href: "/hoje",
        label: "HOJE",
        shortLabel: "Hoje",
        groupPaths: ["/hoje"],
      },
      {
        href: "/praticar",
        label: "PRATICAR",
        shortLabel: "Praticar",
        groupPaths: ["/praticar", "/banco-de-questoes"],
      },
      {
        href: "/revisar",
        label: "REVISAR",
        shortLabel: "Revisar",
        groupPaths: ["/revisar", "/cards-adaptativos", "/revisao-turbo", "/caderno"],
      },
    ],
  },
  {
    items: [
      {
        href: "/acompanhar",
        label: "ACOMPANHAR",
        shortLabel: "Acompanhar",
        groupPaths: [
          "/acompanhar",
          "/estatisticas",
          "/estatisticas/graficos",
          "/estatisticas/relatorio",
          "/dados-e-relatorios",
          "/dados-e-relatorios/graficos",
          "/dados-e-relatorios/relatorio",
          "/revisoes",
          "/provas",
        ],
      },
      {
        href: "/planejar",
        label: "PLANEJAR",
        shortLabel: "Planejar",
        groupPaths: [
          "/planejar",
          "/desempenho",
          "/rotina-e-metas",
          "/cronograma",
          "/calendario",
          "/agenda-operacional",
        ],
      },
    ],
  },
];
