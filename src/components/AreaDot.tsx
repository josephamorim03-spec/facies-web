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
  const border = displayArea === "OU" ? "border border-edge" : "";
  return <span className={`inline-block rounded-full ${dim} ${color} ${border}`} title={displayArea} />;
}
