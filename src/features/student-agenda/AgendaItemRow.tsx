"use client";

import Link from "next/link";
import {
  SquareAlert as AlertTriangle,
  BookOpen,
  Calendar,
  CheckDouble as CheckCircle2,
  Clock as Clock3,
  Copy,
  ListBox,
  Repeat,
} from "pixelarticons/react";

import AreaDot from "@/components/AreaDot";
import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";
import type { StudentAgendaItem } from "@/lib/api";

/**
 * Icone por TIPO de item, nao por status.
 *
 * O fallback anterior era um relogio para tudo que nao tinha area — e revisao de
 * flashcards e transversal, nao tem area. Resultado: "Cards no ponto" aparecia
 * com mostrador de relogio, que e' o que o aluno reportou.
 *
 * O relogio sobra so para `calendar_event`, onde ele e' literal: um bloco de
 * tempo reservado na agenda.
 */
const KIND_ICON: Record<StudentAgendaItem["kind"], typeof Copy> = {
  flashcard_review: Copy,
  question_session: ListBox,
  review_task: Repeat,
  directed_study: BookOpen,
  plan_activity: BookOpen,
  calendar_event: Clock3,
};

const STATUS_LABEL: Record<StudentAgendaItem["status"], string> = {
  scheduled: "Prevista",
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
  overdue: "Atrasada",
  skipped: "Ignorada",
};

export function AgendaItemRow({ item }: { item: StudentAgendaItem }) {
  const area = item.area ? resolveDisplayArea(item.area, item.title, item.rationale) : null;
  const manageHref = `/cronograma?view=month&anchor=${item.date}&day=${item.date}`;
  const KindIcon = KIND_ICON[item.kind] ?? Clock3;

  return (
    <li data-agenda-occurrence-id={item.occurrence_id} className="py-3">
      <div className="flex min-w-0 items-center gap-3">
      {area ? (
        <AreaDot area={area} size="md" />
      ) : item.status === "done" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      ) : item.status === "overdue" ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      ) : (
        <KindIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        {item.href ? (
          <Link href={item.href} className="block truncate text-sm font-semibold text-ink hover:text-primary hover:underline">
            {item.title}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
        )}
        <p className="mt-0.5 truncate text-xs text-muted">
          {area ? `${displayAreaLabel(area)} · ` : ""}
          {item.expected_questions > 0 ? `${item.expected_questions} questões · ` : ""}
          {item.estimated_minutes > 0 ? `${item.estimated_minutes} min` : "Agenda"}
        </p>
      </div>
      <span
        className={`shrink-0 text-xs font-semibold ${
          item.status === "overdue"
            ? "text-warning"
            : item.status === "done"
              ? "text-success"
              : item.status === "in_progress"
                ? "text-primary"
                : "text-muted"
        }`}
      >
        {STATUS_LABEL[item.status]}
      </span>
      </div>
      {item.capabilities.can_start || item.capabilities.can_edit || item.capabilities.can_reschedule ? (
        <div className="mt-2 flex flex-wrap justify-end gap-x-4 gap-y-2 text-xs font-semibold">
          {item.capabilities.can_start && item.href ? (
            <Link href={item.href} className="text-primary hover:underline" aria-label={`${item.status === "in_progress" ? "Continuar" : "Iniciar"} ${item.title}`}>
              {item.status === "in_progress" ? "Continuar" : "Iniciar"}
            </Link>
          ) : null}
          {item.capabilities.can_edit ? (
            <Link href={manageHref} className="text-primary hover:underline" aria-label={`Editar ${item.title}`}>
              Editar
            </Link>
          ) : null}
          {item.capabilities.can_reschedule ? (
            <Link href={manageHref} className="text-primary hover:underline" aria-label={`Reagendar ${item.title}`}>
              Reagendar
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
