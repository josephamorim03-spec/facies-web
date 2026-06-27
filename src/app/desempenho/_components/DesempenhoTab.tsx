import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import type { StudyPerformanceSummary } from "@/lib/api";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";
import AreaDot from "@/components/AreaDot";
import { AREA_BG_CLASS, AREA_TEXT_CLASS } from "@/lib/areaColors";
import { healthStatement } from "@/lib/guidanceCopy";
import {
  AREA_LABELS,
  AREAS,
  DIAG_MIN_THEME_QUESTIONS,
  DIAG_MIN_TOTAL_QUESTIONS,
  FULL_EXAM_COLOR,
  PERIOD_LABELS,
  sortThemeList,
  type ThemeAreaStat,
  THEME_LIST_LIMIT,
} from "../_lib/perfilAnalytics";
import { Area, Period, ThemeListSort } from "../_lib/perfilShared";


type FullExamResultItem = {
  study_id: string;
  exam_name: string;
  exam_year: number | null;
  exam_type: "acesso_direto" | "r_plus";
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number | null;
  performed_at: string;
};

type FullExamBankSummary = {
  bank_name: string;
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number | null;
  acesso_direto: FullExamResultItem[];
  r_plus: FullExamResultItem[];
};

function IconChevron({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

type PeriodHeaderProps = {
  period: Period;
  periodMenuOpen: boolean;
  setPeriodMenuOpen: Dispatch<SetStateAction<boolean>>;
  changePeriod: (period: Period) => void;
};

function PeriodHeader({
  period,
  periodMenuOpen,
  setPeriodMenuOpen,
  changePeriod,
}: PeriodHeaderProps) {
  const isDesktopNavigation = useDesktopNavigationMode();
  return (
    <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
      <div className="flex justify-start">
        <span className="block h-7 w-7" aria-hidden="true" />
      </div>
      <div className="relative flex justify-center">
        <button
          type="button"
          onClick={() => setPeriodMenuOpen((prev) => !prev)}
          className="inline-flex max-w-[min(78vw,22rem)] items-center justify-center gap-1.5 bg-transparent px-1 py-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-ink"
        >
          <span className="truncate">{period.toUpperCase()}</span>
          <IconChevron className={`h-3.5 w-3.5 shrink-0 transition-transform ${periodMenuOpen ? "rotate-180" : ""}`} />
        </button>
        {periodMenuOpen && (
          <div className="absolute z-20 top-6 min-w-32 border border-edge rounded-xl bg-paper shadow-sm overflow-hidden">
            {(["geral", "semanal", "mensal"] as Period[])
              .filter((p) => p !== period)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    changePeriod(p);
                    setPeriodMenuOpen(false);
                  }}
                  className="block w-full text-center px-3 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-edge"
                >
                  {PERIOD_LABELS[p].toUpperCase()}
                </button>
              ))}
          </div>
        )}
      </div>
      {isDesktopNavigation ? (
        <Link
          href="/dados-e-relatorios/relatorio"
          className="p-1 flex items-center justify-end text-muted hover:text-ink shrink-0"
          aria-label="Relatórios"
          title="Relatórios"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="1" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="16" y2="11" />
            <line x1="8" y1="15" x2="13" y2="15" />
          </svg>
        </Link>
      ) : (
        <span className="block h-7 w-7" aria-hidden="true" />
      )}
    </div>
  );
}

type Props = {
  loading: boolean;
  error: string;
  period: Period;
  changePeriod: (period: Period) => void;
  totalDoneQuestions: number;
  totalTopicQuestions: number;
  totalFullExamQuestions: number;
  goal: number | null;
  pct: number | null;
  byArea: Record<Area, { pending: number; done: number; studyDone: number }>;
  studyAcc: Record<Area, { total: number; correct: number }>;
  areaThemeSummaries: Record<Area, StudyPerformanceSummary["area_summaries"][number]>;
  clickedAreas: Set<Area>;
  themeSort: ThemeListSort;
  setThemeSort: Dispatch<SetStateAction<ThemeListSort>>;
  themeHelpArea: Area | null;
  setThemeHelpArea: Dispatch<SetStateAction<Area | null>>;
  handleBarClick: (area: Area) => void;
  diagnosis: StudyPerformanceSummary["diagnosis"];
  fullExamBanks: FullExamBankSummary[];
  showDiagnosis?: boolean;
  healthScore?: number | null;
};


export function DesempenhoTab({
  loading,
  error,
  period,
  changePeriod,
  totalDoneQuestions,
  totalTopicQuestions,
  totalFullExamQuestions,
  goal,
  pct,
  byArea,
  studyAcc,
  areaThemeSummaries,
  clickedAreas,
  themeSort,
  setThemeSort,
  themeHelpArea,
  setThemeHelpArea,
  handleBarClick,
  diagnosis,
  fullExamBanks,
  showDiagnosis = true,
  healthScore = null,
}: Props) {
  const [performanceMode, setPerformanceMode] = useState<"area" | "full_exam">("area");
  const [expandedBanks, setExpandedBanks] = useState<Set<string>>(new Set());
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);

  function toggleBank(bankName: string) {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(bankName)) next.delete(bankName);
      else next.add(bankName);
      return next;
    });
  }

  return (
    <>
      {(loading || Boolean(error)) && (
        <section className="space-y-2">
          <PeriodHeader
            period={period}
            periodMenuOpen={periodMenuOpen}
            setPeriodMenuOpen={setPeriodMenuOpen}
            changePeriod={changePeriod}
          />
        </section>
      )}
      {loading && <p className="text-sm text-muted">Carregando...</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          <section className="space-y-2">
            <PeriodHeader
              period={period}
              periodMenuOpen={periodMenuOpen}
              setPeriodMenuOpen={setPeriodMenuOpen}
              changePeriod={changePeriod}
            />
            <div className="mt-2.5 flex justify-between text-xs text-muted">
              <span>{totalDoneQuestions} questões feitas</span>
              <div className="flex items-center gap-3">
                {healthScore !== null && healthScore !== undefined && (() => {
                  const h = healthStatement(healthScore);
                  const toneClass =
                    h.tone === "positive" ? "text-success"
                    : h.tone === "attention" ? "text-warning"
                    : h.tone === "critical" ? "text-danger"
                    : "text-muted";
                  return (
                    <span className="font-medium" title={`Saúde do estudo: ${Math.round(healthScore)}% · ${h.phrase}`}>
                      saúde <span className={toneClass}>{h.label.toLowerCase()}</span>
                    </span>
                  );
                })()}
                {goal && <span>meta {goal}</span>}
              </div>
            </div>
            {goal !== null && pct !== null && (
              <>
                <div className="h-2 bg-edge rounded-full overflow-hidden">
                  <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted">{pct}%</p>
              </>
            )}
          </section>

          <hr className="border-edge" />

          {performanceMode === "area" && (
            <section className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif">Desempenho por Área</h2>
                <button
                  type="button"
                  onClick={() => setPerformanceMode("full_exam")}
                  className="text-xs text-muted hover:text-ink leading-none"
                >
                  · ver provas ›
                </button>
              </div>
              <p className="text-xs text-muted">total: {totalTopicQuestions}</p>
              {AREAS.map((a) => {
                const s = byArea[a];
                const st = studyAcc[a];
                const summary = areaThemeSummaries[a];
                const accFromFiltered = st.total > 0 ? Math.round((st.correct / st.total) * 100) : null;
                const acc = period === "geral"
                  ? (summary.area_accuracy_pct === null ? null : Math.round(summary.area_accuracy_pct))
                  : accFromFiltered;
                const isClicked = period === "geral" && clickedAreas.has(a);
                const areaDone = s.done + s.studyDone;
                const themeCount = summary.themes.length;
                const showThemeSorter = themeCount > THEME_LIST_LIMIT;
                const rankedThemes = sortThemeList(summary.themes as unknown as ThemeAreaStat[], themeSort);
                const visibleThemes = showThemeSorter ? rankedThemes.slice(0, THEME_LIST_LIMIT) : rankedThemes;
                const hasConsistencyData = rankedThemes.some((item) => item.consistency_score !== null);
                const canExpand = period === "geral" && acc !== null && themeCount > 0;
                return (
                  <div key={a} className="py-3 border-b border-edge last:border-0 space-y-2">
                    <div
                      className={`flex items-center gap-2 ${canExpand ? "cursor-pointer" : ""}`}
                      onClick={canExpand ? () => handleBarClick(a) : undefined}
                    >
                      <AreaDot area={a} size="md" />
                      <span className="text-sm font-medium">{a}</span>
                      <span className="text-xs text-muted">{AREA_LABELS[a]}</span>
                      {period === "geral" && summary.trend && summary.trend !== "flat" && (
                        <span className={`text-xs font-medium ${summary.trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                          {summary.trend === "up" ? "\u2191" : "\u2193"}
                        </span>
                      )}
                    </div>
                    <div
                      className={`group relative pt-4 ${canExpand ? "cursor-pointer" : ""}`}
                      onClick={canExpand ? () => handleBarClick(a) : undefined}
                    >
                      {acc !== null && (
                        <span className={`absolute top-0 left-0 text-xs font-medium transition-opacity pointer-events-none ${isClicked ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"} ${AREA_TEXT_CLASS[a] ?? "text-ink"}`}>
                          {acc}%
                        </span>
                      )}
                      <div className="h-1.5 bg-edge rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${AREA_BG_CLASS[a] ?? "bg-edge"}`}
                          style={{ width: `${acc ?? 0}%` }} />
                      </div>
                    </div>
                    {period !== "geral" && (
                      <div className="flex gap-3 text-xs text-muted">
                        <span>{s.pending} pend.</span>
                        <span>{areaDone} feitas</span>
                      </div>
                    )}
                    {period === "geral" && isClicked && (
                      <div className="border border-edge rounded-xl p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted">Temas em {AREA_LABELS[a]}</p>
                          <div className="flex items-center gap-2">
                            {showThemeSorter && (
                              <span className="text-xs text-muted">
                                {visibleThemes.length}/{themeCount}
                              </span>
                            )}
                            {hasConsistencyData && (
                              <div className="relative">
                                <button
                                  type="button"
                                  className="w-4 h-4 rounded-full border border-edge text-muted text-[10px] leading-none flex items-center justify-center hover:border-ink"
                                  onMouseEnter={() => setThemeHelpArea(a)}
                                  onMouseLeave={() => setThemeHelpArea((prev) => (prev === a ? null : prev))}
                                  onClick={() => setThemeHelpArea((prev) => (prev === a ? null : a))}
                                >
                                  ?
                                </button>
                                {themeHelpArea === a && (
                                  <div className="absolute right-0 top-5 z-30 w-64 bg-paper border border-edge p-2 text-xs text-muted shadow-sm">
                                    Estabilidade do tema ao longo do tempo. Só aparece a partir de 2 revisões realizadas.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {showThemeSorter && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted">Ordenar</span>
                              <select
                                value={themeSort}
                                onChange={(e) => setThemeSort(e.target.value as ThemeListSort)}
                                className="text-xs border border-edge bg-paper px-1.5 py-0.5"
                              >
                                <option value="consistency">Estabilidade do tema</option>
                                <option value="accuracy_high">Taxa alta</option>
                                <option value="accuracy_low">Taxa baixa</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <ul className="space-y-1">
                          {visibleThemes.map((item, idx) => (
                            <li key={item.key} className="flex items-start justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{idx + 1}. {item.theme}</p>
                                <p className="text-muted">
                                  {item.total_questions} questões · {item.review_count} rev.
                                  {item.days_since_last_study !== null && item.days_since_last_study !== undefined && (
                                    <> · há {item.days_since_last_study}d</>
                                  )}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-sm font-medium ${AREA_TEXT_CLASS[a] ?? "text-ink"}`}>
                                  {Math.round(item.accuracy_pct)}%
                                </p>
                                {item.consistency_score !== null && (
                                  <p className="text-xs text-muted">
                                    estabilidade {Math.round(item.consistency_score)}%
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>

                        {showThemeSorter && (
                          <p className="text-xs text-muted">
                            Exibindo {visibleThemes.length} de {themeCount} temas.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {performanceMode === "full_exam" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif">Desempenho por Provas</h2>
                <button
                  type="button"
                  onClick={() => setPerformanceMode("area")}
                  className="text-xs text-muted hover:text-ink leading-none"
                >
                  · ver área ›
                </button>
              </div>
              <p className="text-xs text-muted">total: {totalFullExamQuestions}</p>

              {fullExamBanks.length === 0 && (
                <p className="text-xs text-muted">Nenhuma prova registrada no período.</p>
              )}

              {fullExamBanks.map((bank) => {
                const isOpen = expandedBanks.has(bank.bank_name);
                return (
                  <div key={bank.bank_name} className="py-3 border-b border-edge last:border-0 space-y-2">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleBank(bank.bank_name)}
                    >
                      <div className="w-3 h-3 rounded-[2px] shrink-0" style={{ backgroundColor: FULL_EXAM_COLOR }} />
                      <span className="text-sm font-medium">{bank.bank_name}</span>
                      <span className="text-xs text-muted">{bank.total_questions} questões</span>
                    </div>

                    <div
                      className="group relative pt-4 cursor-pointer"
                      onClick={() => toggleBank(bank.bank_name)}
                    >
                      {bank.accuracy_pct !== null && (
                        <span
                          className={`absolute top-0 left-0 text-xs font-medium transition-opacity pointer-events-none ${isOpen ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
                          style={{ color: FULL_EXAM_COLOR }}
                        >
                          {bank.accuracy_pct}%
                        </span>
                      )}
                      <div className="h-1.5 bg-edge rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${bank.accuracy_pct ?? 0}%`, backgroundColor: FULL_EXAM_COLOR }}
                        />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border border-edge rounded-sm p-2 space-y-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium" style={{ color: FULL_EXAM_COLOR }}>Acesso Direto</p>
                          {bank.acesso_direto.length === 0
                            ? <p className="text-xs text-muted">Nenhuma prova registrada.</p>
                            : <ul className="space-y-1">
                                {bank.acesso_direto.map((item) => (
                                  <li key={item.study_id} className="flex items-start justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {item.exam_name}{item.exam_year ? ` · ${item.exam_year}` : ""}
                                      </p>
                                      <p className="text-muted">{item.correct_questions}/{item.total_questions} questões</p>
                                    </div>
                                    <p className="shrink-0 font-medium" style={{ color: FULL_EXAM_COLOR }}>
                                      {item.accuracy_pct !== null ? `${item.accuracy_pct}%` : "-"}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                          }
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium" style={{ color: FULL_EXAM_COLOR }}>R+</p>
                          {bank.r_plus.length === 0
                            ? <p className="text-xs text-muted">Nenhuma prova registrada.</p>
                            : <ul className="space-y-1">
                                {bank.r_plus.map((item) => (
                                  <li key={item.study_id} className="flex items-start justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">
                                        {item.exam_name}{item.exam_year ? ` · ${item.exam_year}` : ""}
                                      </p>
                                      <p className="text-muted">{item.correct_questions}/{item.total_questions} questões</p>
                                    </div>
                                    <p className="shrink-0 font-medium" style={{ color: FULL_EXAM_COLOR }}>
                                      {item.accuracy_pct !== null ? `${item.accuracy_pct}%` : "-"}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          <hr className="border-edge" />

          {showDiagnosis && period === "geral" && performanceMode === "area" && (
            <section className="space-y-2">
              <h2 className="text-base font-serif">Diagnóstico</h2>

              {!diagnosis.ready && diagnosis.reason === "insufficient_total" && (
                <p className="text-xs text-muted">
                  Disponível com pelo menos {DIAG_MIN_TOTAL_QUESTIONS} questões registradas no total.
                  Atualmente: {diagnosis.total_questions}.
                </p>
              )}

              {!diagnosis.ready && diagnosis.reason === "insufficient_themes" && (
                <p className="text-xs text-muted">
                  Nenhum tema atingiu {diagnosis.min_theme_questions} questões
                  (faixa dinâmica entre 9% e 10% do total, mínimo de {DIAG_MIN_THEME_QUESTIONS}).
                </p>
              )}

              {diagnosis.ready && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="border rounded-sm p-3 space-y-2 border-green-300/70 bg-green-50 dark:border-green-800/60 dark:bg-green-950/30">
                    <p className="text-xs uppercase tracking-wide text-muted">Pontos fortes</p>
                    <ul className="space-y-1">
                      {diagnosis.strengths.map((item) => (
                        <li key={`strong-${item.key}`} className="text-xs">
                          <p className="text-sm font-medium">{item.area} · {item.theme}</p>
                          <p className="text-muted">
                            {item.dominant_signal ?? "Desempenho forte e estável."}
                          </p>
                          <p className="text-muted">
                            Confiança do sistema {item.system_confidence_pct !== null && item.system_confidence_pct !== undefined ? `${Math.round(item.system_confidence_pct)}%` : "—"}
                            {" · "}Risco de regressão {item.regression_risk_pct !== null && item.regression_risk_pct !== undefined ? `${Math.round(item.regression_risk_pct)}%` : "—"}
                            {" · "}Impacto {item.impact_score_pct !== null && item.impact_score_pct !== undefined ? `${Math.round(item.impact_score_pct)}%` : "—"}
                          </p>
                          <p className="text-muted">
                            Acerto {Math.round(item.accuracy_pct)}%
                            {item.consistency_pct !== null ? ` · estabilidade ${Math.round(item.consistency_pct)}%` : ""}
                            {item.retention_pct !== null && item.retention_pct !== undefined ? ` · retenção ${Math.round(item.retention_pct)}%` : ""}
                            {" · "}Tendência {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "estável"}
                            {" · "}{item.total_questions} questões
                          </p>
                          <p className="text-muted">
                            Ação: {item.action_hint ?? "Manter revisão espaçada e incluir itens não triviais."}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border rounded-sm p-3 space-y-2 border-red-300/70 bg-red-50 dark:border-red-800/60 dark:bg-red-950/30">
                    <p className="text-xs uppercase tracking-wide text-muted">Pontos fracos</p>
                    <ul className="space-y-1">
                      {diagnosis.weaknesses.map((item) => (
                        <li key={`weak-${item.key}`} className="text-xs">
                          <p className="text-sm font-medium">{item.area} · {item.theme}</p>
                          <p className="text-muted">
                            {item.dominant_signal ?? "Fraqueza recorrente com impacto relevante."}
                          </p>
                          <p className="text-muted">
                            Impacto {item.impact_score_pct !== null && item.impact_score_pct !== undefined ? `${Math.round(item.impact_score_pct)}%` : "—"}
                            {" · "}Confiança do sistema {item.system_confidence_pct !== null && item.system_confidence_pct !== undefined ? `${Math.round(item.system_confidence_pct)}%` : "—"}
                            {" · "}Tendência {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "estável"}
                          </p>
                          <p className="text-muted">
                            Acerto {Math.round(item.accuracy_pct)}%
                            {item.consistency_pct !== null ? ` · estabilidade ${Math.round(item.consistency_pct)}%` : ""}
                            {item.retention_pct !== null && item.retention_pct !== undefined ? ` · retenção ${Math.round(item.retention_pct)}%` : ""}
                            {" · "}{item.total_questions} questões
                          </p>
                          <Link
                            href={`/banco-de-questoes?area=${encodeURIComponent(item.area)}&theme=${encodeURIComponent(item.theme)}&answer_status=unanswered_or_wrong`}
                            className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            {item.action_hint ?? "Reforçar este tema no banco"}
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
                              <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
                            </svg>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
