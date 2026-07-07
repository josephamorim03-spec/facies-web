"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { StudyPerformanceSummary } from "@/lib/api";
import { DesempenhoTab } from "../desempenho/_components/DesempenhoTab";
import {
  AREAS,
  DIAG_MIN_THEME_QUESTIONS,
  filterStudies,
  filterTasks,
} from "../desempenho/_lib/perfilAnalytics";
import { Area, Period } from "../desempenho/_lib/perfilShared";
import { useEstatisticasPageState } from "./_hooks/useEstatisticasPageState";
import { BancoDeQuestoesInsights } from "./_components/BancoDeQuestoesInsights";
import { MetacognitionInsights } from "./_components/MetacognitionInsights";
import { TopBarActionLink } from "@/components/TopBarActionLink";
import { useNavbar } from "@/lib/NavbarContext";
import { useDesktopNavigationMode } from "@/lib/useDesktopNavigationMode";

type FullExamType = "acesso_direto" | "r_plus";

type FullExamResultItem = {
  study_id: string;
  exam_name: string;
  exam_year: number | null;
  exam_type: FullExamType;
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

function HubBlockSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="border border-edge rounded-sm p-3 space-y-2 animate-pulse">
      <div className="h-3 w-32 bg-edge rounded-sm" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`hub-skeleton-row-${index}`} className="h-2.5 w-full bg-edge rounded-sm" />
      ))}
    </div>
  );
}

const GraficosSection = dynamic(
  () => import("./graficos/GraficosSection").then((mod) => mod.GraficosSection),
  { loading: () => <HubBlockSkeleton rows={6} /> },
);

function EstatisticasPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="grid grid-cols-[1.75rem_1fr_1.75rem] items-center gap-2">
          <div className="h-5 w-5 bg-edge rounded-sm" />
          <div className="h-3 w-14 bg-edge rounded-sm mx-auto" />
          <div className="h-5 w-5 bg-edge rounded-sm ml-auto" />
        </div>
        <div className="h-2 w-full bg-edge rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <HubBlockSkeleton rows={4} />
        <HubBlockSkeleton rows={4} />
        <HubBlockSkeleton rows={4} />
      </div>

      <HubBlockSkeleton rows={5} />
      <HubBlockSkeleton rows={4} />
    </div>
  );
}

export default function EstatisticasClientPage() {
  const isDesktopNavigation = useDesktopNavigationMode();
  const { setActions } = useNavbar();
  const {
    pending,
    done,
    studies,
    performanceSummary,
    longitudinal,
    backgroundLoading,
    loading,
    error,
    period,
    clickedAreas,
    themeSort,
    themeHelpArea,
    weeklyGoal,
    setThemeSort,
    setThemeHelpArea,
    changePeriod,
    handleBarClick,
  } = useEstatisticasPageState();

  useEffect(() => {
    if (isDesktopNavigation) return;
    setActions(
      <TopBarActionLink href="/estatisticas/relatorio" label="Relatórios" title="Relatórios">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="1" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="13" y2="15" />
        </svg>
      </TopBarActionLink>,
    );
    return () => { setActions(null); };
  }, [isDesktopNavigation, setActions]);

  function buildSnapshot(targetPeriod: Period) {
    const doneTasks = filterTasks(done, targetPeriod);
    const pendingTasks = filterTasks(pending, targetPeriod);
    const periodStudies = filterStudies(studies, targetPeriod);
    const periodDoneTaskIds = new Set(doneTasks.map((task) => task.task_id));
    const countableStudies = periodStudies.filter(
      (study) =>
        !study.is_review ||
        !study.origin_review_task_id ||
        periodDoneTaskIds.has(study.origin_review_task_id),
    );
    const topicStudies = countableStudies.filter((study) => study.study_kind !== "full_exam");
    const fullExamStudies = countableStudies.filter((study) => study.study_kind === "full_exam");
    const initialStudies = topicStudies.filter((study) => !study.is_review);
    return {
      doneTasks,
      pendingTasks,
      countableStudies,
      topicStudies,
      fullExamStudies,
      initialStudies,
    };
  }

  const currentSnapshot = buildSnapshot(period);

  const diagnosis: StudyPerformanceSummary["diagnosis"] = useMemo(
    () =>
      performanceSummary?.diagnosis ?? {
        ready: false,
        reason: "insufficient_total",
        total_questions: 0,
        min_theme_questions: DIAG_MIN_THEME_QUESTIONS,
        strengths: [],
        weaknesses: [],
      },
    [performanceSummary],
  );

  const {
    totalDoneQuestions,
    totalTopicQuestions,
    totalFullExamQuestions,
    goal,
    pct,
    byArea,
    studyAcc,
    fullExamBanks,
    areaThemeSummaries,
  } = useMemo(() => {
    const doneQuestions = currentSnapshot.countableStudies.reduce(
      (sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)),
      0,
    );
    const topicQuestions = currentSnapshot.topicStudies.reduce(
      (sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)),
      0,
    );
    const fullExamQuestions = currentSnapshot.fullExamStudies.reduce(
      (sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)),
      0,
    );
    const targetGoal = period === "semanal" ? weeklyGoal : period === "mensal" ? weeklyGoal * 4 : null;
    const goalPct = targetGoal ? Math.min(100, Math.round((doneQuestions / Math.max(1, targetGoal)) * 100)) : null;

    const areaAggregates: Record<Area, { pending: number; done: number; studyDone: number }> =
      Object.fromEntries(AREAS.map((area) => [area, { pending: 0, done: 0, studyDone: 0 }])) as Record<Area, { pending: number; done: number; studyDone: number }>;
    currentSnapshot.pendingTasks.forEach((task) => {
      if (task.area in areaAggregates) areaAggregates[task.area as Area].pending++;
    });
    currentSnapshot.doneTasks.forEach((task) => {
      if (task.area in areaAggregates) areaAggregates[task.area as Area].done++;
    });
    currentSnapshot.initialStudies.forEach((study) => {
      if (study.area in areaAggregates) areaAggregates[study.area as Area].studyDone++;
    });

    const areaAccuracy: Record<Area, { total: number; correct: number }> =
      Object.fromEntries(AREAS.map((area) => [area, { total: 0, correct: 0 }])) as Record<Area, { total: number; correct: number }>;
    for (const study of currentSnapshot.topicStudies) {
      const area = study.area as Area;
      if (area in areaAccuracy) {
        areaAccuracy[area].total += study.total_questions ?? 0;
        areaAccuracy[area].correct += study.correct_questions ?? 0;
      }
    }

    const fullExamBanksMap = new Map<
      string,
      { bank_name: string; total_questions: number; correct_questions: number; items: FullExamResultItem[] }
    >();
    for (const study of currentSnapshot.fullExamStudies) {
      const bankName = String(study.full_exam_name ?? study.theme ?? "Prova").trim() || "Prova";
      const examType: FullExamType = study.full_exam_type === "r_plus" ? "r_plus" : "acesso_direto";
      const examYear = typeof study.full_exam_year === "number" ? study.full_exam_year : null;
      const totalQuestions = Math.max(0, Number(study.total_questions ?? 0));
      const correctQuestions = Math.max(0, Number(study.correct_questions ?? 0));
      const item: FullExamResultItem = {
        study_id: study.study_id,
        exam_name: bankName,
        exam_year: examYear,
        exam_type: examType,
        total_questions: totalQuestions,
        correct_questions: correctQuestions,
        accuracy_pct: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : null,
        performed_at: study.performed_at,
      };
      const bucket = fullExamBanksMap.get(bankName) ?? {
        bank_name: bankName,
        total_questions: 0,
        correct_questions: 0,
        items: [],
      };
      bucket.total_questions += totalQuestions;
      bucket.correct_questions += correctQuestions;
      bucket.items.push(item);
      fullExamBanksMap.set(bankName, bucket);
    }

    const sortExamItemsByYearDesc = (a: FullExamResultItem, b: FullExamResultItem) => {
      const yearA = a.exam_year ?? 0;
      const yearB = b.exam_year ?? 0;
      if (yearA !== yearB) return yearB - yearA;
      return b.performed_at.localeCompare(a.performed_at);
    };

    const examBanks: FullExamBankSummary[] = Array.from(fullExamBanksMap.values())
      .map((bucket) => {
        const acessoDireto = bucket.items
          .filter((item) => item.exam_type === "acesso_direto")
          .sort(sortExamItemsByYearDesc);
        const rPlus = bucket.items
          .filter((item) => item.exam_type === "r_plus")
          .sort(sortExamItemsByYearDesc);
        return {
          bank_name: bucket.bank_name,
          total_questions: bucket.total_questions,
          correct_questions: bucket.correct_questions,
          accuracy_pct:
            bucket.total_questions > 0
              ? Math.round((bucket.correct_questions / bucket.total_questions) * 100)
              : null,
          acesso_direto: acessoDireto,
          r_plus: rPlus,
        };
      })
      .sort((a, b) => {
        const accA = a.accuracy_pct ?? -1;
        const accB = b.accuracy_pct ?? -1;
        if (accA !== accB) return accB - accA;
        if (a.total_questions !== b.total_questions) return b.total_questions - a.total_questions;
        return a.bank_name.localeCompare(b.bank_name, "pt-BR");
      });

    const areaSummariesByArea = new Map(
      (performanceSummary?.area_summaries ?? []).map((summary) => [summary.area, summary]),
    );
    const summaries = Object.fromEntries(
      AREAS.map((area) => [
        area,
        areaSummariesByArea.get(area) ?? {
          area,
          area_accuracy_pct: null,
          total_questions: 0,
          themes: [],
        },
      ]),
    ) as Record<Area, StudyPerformanceSummary["area_summaries"][number]>;

    return {
      totalDoneQuestions: doneQuestions,
      totalTopicQuestions: topicQuestions,
      totalFullExamQuestions: fullExamQuestions,
      goal: targetGoal,
      pct: goalPct,
      byArea: areaAggregates,
      studyAcc: areaAccuracy,
      fullExamBanks: examBanks,
      areaThemeSummaries: summaries,
    };
  }, [currentSnapshot, performanceSummary, period, weeklyGoal]);

  if (loading) {
    return <EstatisticasPageSkeleton />;
  }
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <DesempenhoTab
        loading={false}
        error=""
        period={period}
        changePeriod={changePeriod}
        totalDoneQuestions={totalDoneQuestions}
        totalTopicQuestions={totalTopicQuestions}
        totalFullExamQuestions={totalFullExamQuestions}
        goal={goal}
        pct={pct}
        byArea={byArea}
        studyAcc={studyAcc}
        areaThemeSummaries={areaThemeSummaries}
        clickedAreas={clickedAreas}
        themeSort={themeSort}
        setThemeSort={setThemeSort}
        themeHelpArea={themeHelpArea}
        setThemeHelpArea={setThemeHelpArea}
        handleBarClick={handleBarClick}
        diagnosis={diagnosis}
        fullExamBanks={fullExamBanks}
        showDiagnosis={false}
        healthScore={performanceSummary?.health_score_pct ?? null}
      />

      <hr className="border-edge" />
      <BancoDeQuestoesInsights
        longitudinal={longitudinal}
        loading={backgroundLoading.longitudinal}
      />
      <MetacognitionInsights longitudinal={longitudinal} performanceSummary={performanceSummary} />
      <GraficosSection />
    </div>
  );
}
