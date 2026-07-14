import { resolveDisplayArea, type DisplayArea } from "@/lib/areaDisplay";

type Area = "GO" | "OB" | "PD" | "MP" | "CG" | "CM" | "OU";

const AREA_COLORS: Record<DisplayArea, string> = {
  GO: "bg-area-go",
  OB: "bg-area-go",
  PD: "bg-area-ped",
  MP: "bg-area-mp",
  CG: "bg-area-cg",
  CM: "bg-area-cm",
  OU: "bg-area-ou",
};

interface AreaDotProps {
  area: Area | string | null | undefined;
  size?: "sm" | "md";
}

export default function AreaDot({ area, size = "sm" }: AreaDotProps) {
  const displayArea = resolveDisplayArea(area);
  const dim = size === "md" ? "w-4 h-4" : "w-3 h-3";
  const color = AREA_COLORS[displayArea] ?? "bg-edge";
  const border = displayArea === "OU" ? "border border-[#BEBEB4]" : "";
  return <span className={`inline-block rounded-full ${dim} ${color} ${border}`} title={displayArea} />;
}
