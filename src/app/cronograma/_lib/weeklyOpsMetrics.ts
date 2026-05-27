import { DirectedStudyListItem, ReviewTask } from "@/lib/api";

export type WeeklyOpsRiskLevel = "low" | "medium" | "high";

export type WeeklyOpsMetrics = {
  weekStart: string;
  weekEnd: string;
  weeklyGoal: number;
  doneQuestionsWeek: number;
  expectedProgressPctThisWeek: number;
  weeklyGoalRemainingQuestions: number;
  dailyRequiredToHitWeeklyGoal: number;
  showSevereWeeklyGoalDelay: boolean;
  showPaceWeeklyGoalWarning: boolean;
  progressPct: number;
  pendingWeekCount: number;
  pendingWeekQuestions: number;
  overdueCount: number;
  overdueQuestions: number;
  operationalDebtQuestions: number;
  burnDownDoneQuestions: number;
  doneTaskCount: number;
  burnDownTotalQuestions: number;
  burnDownPct: number;
  daysRemainingInWeek: number;
  dailyRequiredQuestions: number;
  riskLevel: WeeklyOpsRiskLevel;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fromIsoLocal(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toLocalDateISO(datetimeIso: string): string {
  const parsed = new Date(datetimeIso);
  if (Number.isNaN(parsed.getTime())) {
    return datetimeIso.slice(0, 10);
  }
  return toIsoLocal(parsed);
}

function getWeekBounds(todayIso: string): { weekStart: string; weekEnd: string } {
  const todayDate = fromIsoLocal(todayIso);
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: toIsoLocal(monday),
    weekEnd: toIsoLocal(sunday),
  };
}

function diffDays(fromIso: string, toIso: string): number {
  const fromDate = fromIsoLocal(fromIso);
  const toDate = fromIsoLocal(toIso);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

function sumExpectedQuestions(tasks: ReviewTask[]): number {
  return tasks.reduce((sum, task) => sum + Math.max(0, Number(task.expected_questions ?? 0)), 0);
}

function resolveRiskLevel(overdueCount: number, dailyRequiredQuestions: number): WeeklyOpsRiskLevel {
  if (overdueCount >= 8 || dailyRequiredQuestions > 50) return "high";
  if (overdueCount >= 4 || dailyRequiredQuestions > 20) return "medium";
  return "low";
}

export function buildWeeklyOpsMetrics(params: {
  weeklyGoal: number;
  pendingTasks: ReviewTask[];
  doneTasks: ReviewTask[];
  studies: DirectedStudyListItem[];
  todayIso: string;
}): WeeklyOpsMetrics {
  const { weeklyGoal, pendingTasks, doneTasks, studies, todayIso } = params;
  const safeWeeklyGoal = Math.max(0, Math.round(Number(weeklyGoal) || 0));
  const { weekStart, weekEnd } = getWeekBounds(todayIso);

  const doneQuestionsWeek = studies
    .filter((study) => {
      const performedDay = toLocalDateISO(study.performed_at ?? "");
      return performedDay >= weekStart && performedDay <= weekEnd;
    })
    .reduce((sum, study) => sum + Math.max(0, Number(study.total_questions ?? 0)), 0);

  const weeklyGoalRemainingQuestions = Math.max(0, safeWeeklyGoal - doneQuestionsWeek);
  const elapsedDaysInWeek = Math.min(7, Math.max(1, diffDays(weekStart, todayIso) + 1));

  const progressPct =
    safeWeeklyGoal > 0
      ? Math.min(100, Math.round((doneQuestionsWeek / safeWeeklyGoal) * 100))
      : 0;
  const expectedProgressPctThisWeek =
    safeWeeklyGoal > 0
      ? Math.round((100 * elapsedDaysInWeek) / 7)
      : 0;

  const pendingWeekTasks = pendingTasks.filter(
    (task) => !task.is_overdue && task.due_date >= todayIso && task.due_date <= weekEnd,
  );
  const overdueTasks = pendingTasks.filter((task) => task.is_overdue);

  const pendingWeekCount = pendingWeekTasks.length;
  const pendingWeekQuestions = sumExpectedQuestions(pendingWeekTasks);
  const overdueCount = overdueTasks.length;
  const overdueQuestions = sumExpectedQuestions(overdueTasks);
  const operationalDebtQuestions = pendingWeekQuestions + overdueQuestions;

  const doneWeekTasks = doneTasks.filter(
    (task) => task.due_date >= weekStart && task.due_date <= weekEnd,
  );
  const doneTaskCount = doneWeekTasks.length;
  const burnDownDoneQuestions = sumExpectedQuestions(doneWeekTasks);

  const burnDownTotalQuestions = burnDownDoneQuestions + operationalDebtQuestions;
  const burnDownPct =
    burnDownTotalQuestions > 0
      ? Math.round((100 * burnDownDoneQuestions) / burnDownTotalQuestions)
      : 100;

  const daysRemainingInWeek = Math.max(1, diffDays(todayIso, weekEnd) + 1);
  const dailyRequiredQuestions =
    operationalDebtQuestions > 0
      ? Math.ceil(operationalDebtQuestions / daysRemainingInWeek)
      : 0;
  const dailyRequiredToHitWeeklyGoal =
    weeklyGoalRemainingQuestions > 0
      ? Math.ceil(weeklyGoalRemainingQuestions / daysRemainingInWeek)
      : 0;
  const progressLagPct = expectedProgressPctThisWeek - progressPct;
  const riskLevel = resolveRiskLevel(overdueCount, dailyRequiredQuestions);
  const isAfter20h = new Date().getHours() >= 20;
  const showSevereWeeklyGoalDelay =
    isAfter20h && progressLagPct >= 40 && weeklyGoalRemainingQuestions > 0 && safeWeeklyGoal > 0;
  const showPaceWeeklyGoalWarning =
    isAfter20h
      && safeWeeklyGoal > 0
      && weeklyGoalRemainingQuestions > 0
      && progressLagPct >= 15;

  return {
    weekStart,
    weekEnd,
    weeklyGoal: safeWeeklyGoal,
    doneQuestionsWeek,
    expectedProgressPctThisWeek,
    weeklyGoalRemainingQuestions,
    dailyRequiredToHitWeeklyGoal,
    showSevereWeeklyGoalDelay,
    showPaceWeeklyGoalWarning,
    progressPct,
    pendingWeekCount,
    pendingWeekQuestions,
    overdueCount,
    overdueQuestions,
    operationalDebtQuestions,
    burnDownDoneQuestions,
    doneTaskCount,
    burnDownTotalQuestions,
    burnDownPct,
    daysRemainingInWeek,
    dailyRequiredQuestions,
    riskLevel,
  };
}
