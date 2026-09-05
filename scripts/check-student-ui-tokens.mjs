import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PAPER_SURFACES = [
  "src/components/ui/Button.tsx",
  "src/components/ui/Dialog.tsx",
  "src/components/ui/Drawer.tsx",
  "src/components/ui/Sheet.tsx",
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
  "src/components/AlvoEContagem.tsx",
  "src/components/facies/BuscaDeProva.tsx",
  "src/components/facies/ContagemGigante.tsx",
  "src/components/facies/QuestaoAnotada.tsx",
  "src/components/facies/RotuloSecao.tsx",
  "src/components/AppShell.tsx",
  "src/components/Nav.tsx",
  "src/components/MobileTabBar.tsx",
  "src/components/UserAvatar.tsx",
  "src/app/voce/page.tsx",
  "src/components/navIcons.tsx",
  "src/app/banco/guardadas/page.tsx",
  "src/app/banco/_components/iconesDoBanco.tsx",
  "src/app/banco/_components/QuestionList.tsx",
  "src/app/banco/sessao/[sessionId]/_components/iconesDaSessao.tsx",
  "src/app/banco/sessao/[sessionId]/_components/grifos.tsx",
  "src/app/banco/historico/page.tsx",
  "src/app/preferencias/_components/ContaSection.tsx",
  "src/components/charts/studyChartTooltip.ts",
  "src/components/student/StudentActionSurface.tsx",
  "src/components/student/StudentExperienceUI.tsx",
  "src/app/banco/sessao/[sessionId]/_components/SaidaDaSessao.tsx",
  "src/app/hoje/_components/TodayBackupActions.tsx",
  "src/app/hoje/_components/TodayEmptyState.tsx",
  "src/app/hoje/_components/TodayPrimaryAction.tsx",
  "src/app/hoje/_components/TodayDimensioning.tsx",
  "src/app/hoje/_components/TodayPageSkeleton.tsx",
  "src/app/admin/question-bank/_components/AiReviewPanel.tsx",
  // O admin ficou 1500 cores literais fora de token justamente por estar fora
  // desta lista: sem guarda, a paleta antiga sobreviveu ali enquanto o resto do
  // app migrava. Entra agora para nao regredir de novo.
  "src/app/admin/layout.tsx",
  "src/app/admin/page.tsx",
  "src/app/conta/page.tsx",
  "src/app/conta/_components/SecaoAcesso.tsx",
  "src/app/plano/PlanoClientPage.tsx",
  "src/app/preferencias/_components/MinhaSemana.tsx",
  "src/app/hoje/_components/ContinuarDeOndeParou.tsx",
  "src/app/admin/acessos/page.tsx",
  "src/app/admin/audit/page.tsx",
  "src/app/admin/question-bank/page.tsx",
  "src/app/admin/question-bank/_components/AdminOverview.tsx",
  "src/app/admin/question-bank/_components/QuestionsManager.tsx",
  "src/app/admin/question-bank/_components/AiResolutionPanel.tsx",
  "src/app/admin/question-bank/_components/PipelineDiagnosticsPanel.tsx",
  "src/app/admin/question-bank/_components/ImportWorkspace.tsx",
  "src/app/admin/question-bank/_components/CandidatesPanel.tsx",
];

const rules = [
  { label: "cor Tailwind literal", pattern: /(?:bg|text|border|ring|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}/ },
  { label: "cor CSS literal", pattern: /(?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i },
  { label: "raio arbitrário", pattern: /rounded-\[[^\]]+\]/ },
  { label: "sombra arbitrária", pattern: /shadow-\[[^\]]+\]/ },
];

const failures = [];
for (const relativePath of PAPER_SURFACES) {
  let source;
  try {
    source = readFileSync(resolve(ROOT, relativePath), "utf8");
  } catch {
    console.error(
      `Paper UI: ${relativePath} esta em PAPER_SURFACES mas nao existe mais.\n` +
        "Se a superficie foi removida, tire-a da lista; se foi movida, atualize o caminho.\n" +
        "A lista e' fixa de proposito: sair dela e' sair da cobertura, e isso precisa ser deliberado.",
    );
    process.exit(1);
  }
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
