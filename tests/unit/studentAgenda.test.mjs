import assert from "node:assert/strict";
import test from "node:test";

import { uniqueAgendaItems } from "../../src/features/student-agenda/agendaSelectors.ts";
import { shiftISO, weekRange } from "../../src/features/student-agenda/dateRange.ts";

function item(occurrenceId, title = occurrenceId) {
  return { occurrence_id: occurrenceId, title };
}

test("today excludes the primary occurrence and never repeats an occurrence", () => {
  const result = uniqueAgendaItems(
    [item("plan:1"), item("review:2"), item("review:2", "duplicada")],
    "plan:1",
  );
  assert.deepEqual(result.map((entry) => entry.occurrence_id), ["review:2"]);
  assert.equal(result[0].title, "review:2");
});

test("week range is Monday through Sunday across month boundaries", () => {
  assert.deepEqual(weekRange("2026-08-06"), {
    start: "2026-08-03",
    end: "2026-08-09",
  });
  assert.equal(shiftISO("2026-08-31", 7), "2026-09-07");
});
