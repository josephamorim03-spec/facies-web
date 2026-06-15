import { useState } from "react";
import AreaDot from "@/components/AreaDot";
import { DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { IconCritical } from "../CronogramaIcons";
import { Area, displayDate } from "../../_lib/cronogramaShared";
import { TaskDetail } from "./TaskDetail";
import { ReviewSignalChips } from "../ReviewSignalChips";
export function TaskRow({ task, token, studies, studyMap, overdue, onRefresh, logDateISO }: {
  task: ReviewTask; token: string; studies: DirectedStudyListItem[];
  studyMap: Map<string, DirectedStudyListItem>; overdue?: boolean; onRefresh: () => void; logDateISO?: string | null;
}) {
  const isDone = task.status === "done";
  const [expanded, setExpanded] = useState(false);

  if (isDone) {
    return (
      <li className="py-2 border-b border-edge last:border-0">
        <TaskDetail task={task} token={token} studies={studies} studyMap={studyMap}
          onRefresh={onRefresh} onClose={() => {}} logDateISO={logDateISO} />
      </li>
    );
  }

  return (
    <li className="py-2 border-b border-edge last:border-0">
      <button className="w-full flex items-center gap-3 text-left" onClick={() => setExpanded((v) => !v)}>
        <AreaDot area={task.area as Area} size="md" />
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <span className={`text-sm ${overdue ? "italic text-muted" : ""}`}>{task.theme}</span>
            <span className="text-xs text-muted ml-2">{task.expected_questions}q</span>
            {task.is_critical && <IconCritical className="w-3 h-3 inline ml-1 align-middle" />}
            {overdue && <span className="text-xs text-muted ml-1">(vence {displayDate(task.due_date)})</span>}
          </div>
          <ReviewSignalChips task={task} compact className="mt-1" />
        </div>
        <span className="text-xs text-muted shrink-0">{expanded ? "^" : "v"}</span>
      </button>
      {expanded && (
        <div className="mt-2 pl-7">
          <TaskDetail task={task} token={token} studies={studies} studyMap={studyMap}
            onRefresh={onRefresh} onClose={() => setExpanded(false)} logDateISO={logDateISO} />
        </div>
      )}
    </li>
  );
}

