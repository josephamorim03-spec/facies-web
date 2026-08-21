import { AREA_FULL_LABELS, type DisplayArea } from "./areaIdentity.ts";
export type { DisplayArea } from "@/lib/areaIdentity";

export const DISPLAY_AREA_FULL_LABELS = AREA_FULL_LABELS;

const VALID_AREAS = new Set<DisplayArea>(["GO", "OB", "PD", "MP", "CG", "CM", "OU"]);

// Padroes com sufixo aberto (`\w*`) onde o termo tem flexao de genero/numero em
// pt-BR. A versao anterior fechava prefixos com `\b` — `\bcirurgic\b` so casa a
// palavra "cirurgic", que nao existe. Efeito pratico: "Clinica Cirurgica" caia
// em OU (CG falhava no prefixo, CM falhava porque "clinica medica" e "clinico"
// nao casam "clinica cirurgica"), e o mesmo valia para
// gastroenterologia/nefrologia/endocrinologia/reumatologia/infectologia/
// dermatologia/ginecologica/pediatrica.
//
// `normalizeText` ja tirou acento, entao `\w` basta.
const AREA_TEXT_PATTERNS: Array<[DisplayArea, RegExp[]]> = [
  [
    "CG",
    [
      /\b(cg|cirurgia|cirurgic\w*|trauma|ortopedia|urologia|anestesiologia|anestesia)\b/,
      /\b(pre|pos|intra|peri)[- ]?operatori[ao]s?\b/,
      /\boperatori[ao]s?\b/,
      /\bavaliacao pre[- ]?operatoria\b/,
      /\b(laparotomia|laparoscopia|abdome agudo|apendicite|colecistite|hernia|obstrucao intestinal)\b/,
    ],
  ],
  [
    "CM",
    [
      /\b(cm|clinica medica|medicina interna|clinico)\b/,
      /\b(cardiologia|pneumologia|gastro\w*|nefro\w*|endocrino\w*|reumato\w*|infecto\w*|hematologia|neurologia|dermato\w*)\b/,
      /\b(hipertensao|diabetes|insuficiencia cardiaca|pneumonia|sepse|fibrilacao atrial|infarto)\b/,
    ],
  ],
  [
    "PD",
    [
      /\b(pd|pediatria|pediatric\w*|lactente|neonato|neonatal|recem[- ]?nascido|crianca|adolescente|puericultura)\b/,
      /\b(imunizacao infantil|crescimento e desenvolvimento)\b/,
    ],
  ],
  [
    "MP",
    [
      /\b(mp|preventiva|saude coletiva|saude publica|epidemiologia|bioestatistica|sus|medicina de familia|mfc)\b/,
      /\b(vigilancia sanitaria|vigilancia epidemiologica|notificacao compulsoria|inquerito epidemiologico)\b/,
    ],
  ],
  [
    "GO",
    [
      /\b(go|ginecologia|ginecologic\w*|ciclo menstrual|amenorreia|endometriose|sangramento uterino)\b/,
    ],
  ],
  [
    "OB",
    [
      /\b(ob|obstetricia|obstetra|gestante|gestacao|gravidez|pre[- ]?natal|parto|puerperio|puerpera)\b/,
      /\b(eclampsia|pre[- ]?eclampsia|placenta)\b/,
    ],
  ],
];

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeCode(value: string | null | undefined): DisplayArea | null {
  const code = String(value ?? "").trim().toUpperCase();
  return VALID_AREAS.has(code as DisplayArea) ? (code as DisplayArea) : null;
}

/** A sigla solta no texto ("... de GO"), que so aparece se alguem a escreveu. */
const EXPLICIT_CODE = /\b(go|ob|pd|mp|cg|cm)\b/;

function matchAreas(text: string): DisplayArea[] {
  return AREA_TEXT_PATTERNS
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
    .map(([area]) => area);
}

function resolveFromSingleText(text: string): DisplayArea | null {
  if (!text) return null;

  // 1. Sigla explicita vence tudo. "Resolver bloco clinico de GO" acionava GO
  //    (a sigla), CM ("clinico") e OB ("pre-eclampsia" na justificativa) ao
  //    mesmo tempo — tres empates viravam "Outras", num titulo que dizia GO com
  //    todas as letras. Sigla escrita a mao e sinal AUTORAL; palavra tematica e
  //    inferencia. O autoral ganha.
  const explicit = normalizeCode(EXPLICIT_CODE.exec(text)?.[1]);
  if (explicit) return explicit;

  const matches = matchAreas(text);
  if (matches.length === 1) return matches[0] ?? null;
  // 2. GO e OB sao a mesma especialidade; competirem entre si nao e ambiguidade.
  if (matches.includes("GO") && matches.includes("OB") && matches.every((area) => area === "GO" || area === "OB")) {
    return "GO";
  }
  return null;
}

export function inferAreaFromText(...values: Array<string | null | undefined>): DisplayArea | null {
  const labels = values.filter(Boolean).map((value) => normalizeText(value));
  if (labels.length === 0) return null;

  // 3. Rotulo por rotulo, na ORDEM em que chegam — titulo antes de justificativa.
  //    Antes tudo era concatenado num texto so, e uma palavra da justificativa
  //    ("pre-eclampsia") empatava com o tema do titulo. O titulo e mais
  //    especifico por construcao; se ele decide sozinho, a justificativa nao vota.
  for (const label of labels) {
    const resolved = resolveFromSingleText(label);
    if (resolved) return resolved;
  }

  // 4. So entao o texto inteiro, para o caso em que o sinal esta espalhado.
  return resolveFromSingleText(labels.join(" "));
}

export function resolveDisplayArea(
  area: string | null | undefined,
  ...labels: Array<string | null | undefined>
): DisplayArea {
  const normalized = normalizeCode(area);
  if (normalized && normalized !== "OU") return normalized;
  return inferAreaFromText(...labels) ?? normalized ?? "OU";
}

export function displayAreaLabel(area: string | null | undefined, ...labels: Array<string | null | undefined>): string {
  const resolved = resolveDisplayArea(area, ...labels);
  return DISPLAY_AREA_FULL_LABELS[resolved] ?? resolved;
}
