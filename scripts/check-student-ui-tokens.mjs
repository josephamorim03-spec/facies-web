import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PAPER_SURFACES = [
  "src/components/ui/Button.tsx",
  "src/components/ui/Dialog.tsx",
  "src/components/ui/Drawer.tsx",
  "src/components/ui/EmptyState.tsx",
  "src/components/ui/IconButton.tsx",
  "src/components/ui/OutcomeCard.tsx",
  "src/components/ui/Progress.tsx",
  "src/components/ui/Select.tsx",
  "src/components/ui/StatusBadge.tsx",
  "src/components/ui/StudyActionCard.tsx",
  "src/components/ui/Surface.tsx",
  "src/components/ui/Tabs.tsx",
  "src/components/ui/Tooltip.tsx",
  "src/components/AppShell.tsx",
  "src/components/Nav.tsx",
  "src/components/KrosGlyph.tsx",
  "src/components/charts/studyChartTooltip.ts",
  "src/app/kros/page.tsx",
  "src/app/kros/_components/KrosBaseline.tsx",
  "src/app/kros/_components/KrosSizeChooser.tsx",
  "src/app/kros/loading.tsx",
  "src/components/student/StudentActionSurface.tsx",
  "src/components/student/StudentExperienceUI.tsx",
  "src/app/hoje/_components/BancoSidebarCard.tsx",
  "src/app/hoje/_components/CardsDuePanel.tsx",
  "src/app/hoje/_components/TodayBackupActions.tsx",
  "src/app/hoje/_components/TodayDetails.tsx",
  "src/app/hoje/_components/TodayEmptyState.tsx",
  "src/app/hoje/_components/TodayLoadNote.tsx",
  "src/app/hoje/_components/TodayPrimaryAction.tsx",
  "src/app/hoje/_components/TodayPageSkeleton.tsx",
  "src/app/hoje/_components/TodaySchedulePreview.tsx",
  "src/app/revisar/_components/ReviewQueueClient.tsx",
  "src/app/admin/question-bank/_components/AiReviewPanel.tsx",
];

const rules = [
  { label: "cor Tailwind literal", pattern: /(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/ },
  { label: "cor CSS literal", pattern: /(?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i },
  { label: "raio arbitrário", pattern: /rounded-\[[^\]]+\]/ },
  { label: "sombra arbitrária", pattern: /shadow-\[[^\]]+\]/ },
];

const failures = [];
for (const relativePath of PAPER_SURFACES) {
  const source = readFileSync(resolve(ROOT, relativePath), "utf8");
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    for (const rule of rules) {
      if (rule.pattern.test(line)) failures.push(`${relativePath}:${index + 1} ${rule.label}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Paper UI: use tokens semânticos e geometrias oficiais:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Paper UI: ${PAPER_SURFACES.length} superfícies sem cores, raios ou sombras arbitrárias.`);
