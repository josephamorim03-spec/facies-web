# Calendar Internal Architecture

This folder contains the internal implementation of `CronogramaCalendarView`.
The public import path remains stable through the facade:
`_components/CronogramaCalendarView.tsx`.

## Module boundaries

- `CronogramaCalendarViewCore.tsx`
  - Thin orchestrator: wires state, hooks, and render components.
  - Should avoid domain-heavy business rules.
- `CalendarGrid.tsx`
  - Calendar month grid rendering and pointer/touch wiring for cells.
- `CalendarSections.tsx`
  - Reusable visual sections and modal shells used by the core.
- `hooks/useCalendarMonthNavigation.ts`
  - Month/year state and swipe navigation behavior.
- `hooks/useTaskDragReschedule.ts`
  - Task drag/drop lifecycle and reschedule warning flow.
- `hooks/useEventDragAndMutation.ts`
  - Event drag/drop, delete-zone interactions, and event move/delete mutations.
- `derived.ts`
  - Pure derived builders for cells, day collections, and search highlights.
- `eventRules.ts`
  - Pure rules for event collision/load checks and drag metadata.
- `constants.ts`
  - Calendar interaction thresholds and shared tuning constants.

## Refactor guardrails

- Keep external props/contract of `CronogramaCalendarView` unchanged.
- Prefer pure functions for date/rule derivations before adding hook state.
- Keep API side effects inside hooks, not inside presentational components.
- Add or update Playwright coverage when changing drag/drop semantics.
