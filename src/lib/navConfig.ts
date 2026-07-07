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

// Fase 2 — cada tela é uma vista do treinador (agir, revisar, medir, planejar).
// Grupo 1 = ações principais; grupo 2 = itens secundários/overflow do drawer.
// `isNavItemActive` ignora querystring → nunca usar `?tipo=...` em groupPaths.
export const NAV_GROUPS_CONFIG: NavGroupConfig[] = [
  {
    items: [
      {
        href: "/hoje",
        label: "HOJE",
        shortLabel: "Hoje",
        groupPaths: ["/hoje", "/cronograma", "/calendario", "/agenda-operacional"],
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
    ],
  },
  {
    items: [
      {
        // Rótulo "Desempenho" = análise (/estatisticas). NÃO é a rota /desempenho (metas).
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
      {
        // "Histórico" = o log de sessões (treinos + simulados); Simulados é um
        // filtro (?tipo=provas), não um destino. /provas redireciona pra cá.
        href: "/revisoes",
        label: "HISTÓRICO",
        shortLabel: "Histórico",
        groupPaths: ["/revisoes"],
      },
      {
        // "Metas" = metas/rotina — a rota /desempenho (re-exportada por /rotina-e-metas).
        href: "/desempenho",
        label: "METAS",
        shortLabel: "Metas",
        groupPaths: ["/desempenho", "/rotina-e-metas"],
      },
    ],
  },
];
