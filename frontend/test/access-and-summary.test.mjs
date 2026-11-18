import "./api-and-data.test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { filterSummaryRows } from "../src/features/finance/summary.js";
import { visibleCategories, canAccessPage, firstPage } from "../src/navigation/catalog.js";
const rows = [
  { id: 1, projectId: 10, project: "Mesmo nome", date: "2026-11-10", amount: 10 },
  { id: 2, projectId: 20, project: "Mesmo nome", date: "2026-11-10", amount: 20 },
  { id: 3, projectId: null, date: "2026-11-11", amount: 30 },
  { id: 4, projectId: 10, date: "2026-11-12", amount: 40 },
];
test("resumo filtra por identidade do projeto e inclui os limites do período", () => {
  assert.deepEqual(
    filterSummaryRows(rows, { project: "10", from: "2026-11-10", until: "2026-11-12" }).map(
      (r) => r.id,
    ),
    [1, 4],
  );
  assert.deepEqual(
    filterSummaryRows(rows, { project: "10", until: "2026-11-10" }).map((r) => r.id),
    [1],
  );
  assert.deepEqual(
    filterSummaryRows(rows, { project: "none" }).map((r) => r.id),
    [3],
  );
  assert.deepEqual(filterSummaryRows(rows, { from: "2026-11-12", until: "2026-11-10" }), []);
  assert.equal(filterSummaryRows(rows).length, 4);
});
test("áreas ocultas não podem ser abertas por navegação interna", () => {
  const day = { role: "INSTRUCTOR", dayToDayAccess: true, managementAccess: false };
  const management = { role: "INSTRUCTOR", dayToDayAccess: false, managementAccess: true };
  assert.deepEqual(
    visibleCategories(day).map((c) => c.id),
    ["operation"],
  );
  assert.equal(canAccessPage("finance:summary", day), false);
  assert.equal(canAccessPage("project:3", day), false);
  assert.equal(canAccessPage("classroom:2", day), true);
  assert.deepEqual(
    visibleCategories(management).map((c) => c.id),
    ["management"],
  );
  assert.equal(canAccessPage("people", management), false);
  assert.equal(canAccessPage("project:3", management), true);
  assert.equal(firstPage(management), "projects");
  assert.equal(
    firstPage({ role: "INSTRUCTOR", dayToDayAccess: false, managementAccess: false }),
    "no-access",
  );
  assert.equal(
    visibleCategories({ role: "ADMIN", dayToDayAccess: false, managementAccess: false }).length,
    2,
  );
});
