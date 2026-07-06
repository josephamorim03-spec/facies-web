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

// Fase 3.5: Simulados e uma area canonica de medicao. Historico/Sessoes fica no
// overflow; active-state nunca depende de querystring.
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
        href: "/banco-de-questoes",
        label: "QUESTÕES",
        shortLabel: "Questões",
        groupPaths: ["/banco-de-questoes"],
      },
      {
        href: "/cards-adaptativos",
        label: "REVISÃO",
        shortLabel: "Revisão",
        groupPaths: ["/cards-adaptativos", "/revisao-turbo"],
      },
      {
        href: "/provas",
        label: "SIMULADOS",
        shortLabel: "Simulados",
        groupPaths: ["/provas"],
      },
      {
        // Rotulo "Desempenho" = analise (/estatisticas), nao a rota /desempenho (metas).
        href: "/estatisticas",
        label: "DESEMPENHO",
        shortLabel: "Desempenho",
        groupPaths: [
          "/estatisticas",
          "/estatisticas/graficos",
          "/estatisticas/relatorio",
          "/dados-e-relatorios",
          "/dados-e-relatorios/graficos",
          "/dados-e-relatorios/relatorio",
        ],
      },
    ],
  },
  {
    items: [
      {
        href: "/cronograma",
        label: "CRONOGRAMA",
        shortLabel: "Cronograma",
        groupPaths: ["/cronograma", "/calendario", "/agenda-operacional"],
      },
      {
        href: "/desempenho",
        label: "PLANO",
        shortLabel: "Plano",
        groupPaths: ["/desempenho", "/rotina-e-metas"],
      },
      {
        href: "/revisoes",
        label: "SESSÕES",
        shortLabel: "Sessões",
        groupPaths: ["/revisoes"],
      },
      {
        href: "/caderno",
        label: "CADERNO",
        shortLabel: "Caderno",
        groupPaths: ["/caderno"],
      },
      {
        href: "/perfil",
        label: "PERFIL",
        shortLabel: "Perfil",
        groupPaths: ["/perfil"],
      },
    ],
  },
];
