import { resolveDisplayArea, type DisplayArea } from "@/lib/areaDisplay";
import { AREA_BG_CLASS } from "@/lib/areaIdentity";

type Area = "GO" | "OB" | "PD" | "MP" | "CG" | "CM" | "OU";

interface AreaDotProps {
  area: Area | string | null | undefined;
  size?: "sm" | "md";
}

export default function AreaDot({ area, size = "sm" }: AreaDotProps) {
  const displayArea = resolveDisplayArea(area);
  const dim = size === "md" ? "w-4 h-4" : "w-3 h-3";
  const color = AREA_BG_CLASS[displayArea as DisplayArea] ?? "bg-edge";
  // OU tinha um anel `border border-edge` so' seu. Ele nao era decoracao: o
  // cinza de "Outras" era o mesmo hex de `--color-muted` e o ponto sumia no
  // papel. Com o violeta (2026-09-06) o ponto se ve sozinho, e manter o anel
  // faria de OU a unica das sete com contorno — inconsistencia visivel numa
  // fileira de pontos, que e' exatamente onde este componente vive.
  return <span className={`inline-block ${dim} ${color}`} title={displayArea} />;
}
