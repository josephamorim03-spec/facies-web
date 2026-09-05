"use client";

import {
  Calendar as CalendarDays,
  ChartLine as ChartLine,
  CircleUser as CircleUserRound,
  Compass as Compass,
  House as House,
  Library as LibraryBig,
  NotepadText as Layers3,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type { StudentNavIcon } from "@/lib/navConfig";

/**
 * Um icone por destino -- e UM MAPA SO'.
 *
 * Existiam dois, e eles divergiam: o da barra inferior estava completo, o da
 * sidebar nao tinha `map`, `routine` nem `account` e caia no fallback. No
 * desktop, "Mapa" e "Rotina" saiam com o icone de BIBLIOTECA (o mesmo de
 * "Banco") e "Evolucao" com o de pessoa. O mesmo destino tinha dois simbolos
 * conforme a largura da tela, que e' exatamente o que um icone existe para
 * evitar.
 *
 * A sidebar ainda carregava `evolution`, `planning` e `settings`, chaves que
 * nenhum `NavItemConfig` produz desde a taxonomia por verbos. Sairam.
 *
 * O tipo e' `StudentNavIcon`, entao destino novo sem icone passa a ser erro de
 * compilacao em vez de fallback silencioso.
 */
export const ICON_MAP: Record<StudentNavIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  today: House,
  bank: LibraryBig,
  cards: Layers3,
  // A pessoa saiu da Evolucao e foi para a Conta, que e onde ela significa
  // alguma coisa (assinatura, provas, dados). Evolucao passa a ser o grafico,
  // que e o que a tela mostra.
  profile: ChartLine,
  map: Compass,
  routine: CalendarDays,
  account: CircleUserRound,
};

export function NavIcon({
  icon,
  className,
}: {
  icon: StudentNavIcon;
  className?: string;
}) {
  const Icon = ICON_MAP[icon];
  return <Icon className={className} />;
}
