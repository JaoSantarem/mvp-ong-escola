import "./api-and-data.test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { filterSummaryRows, cashSummary } from "../src/features/finance/summary.js";
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

test("fluxo de caixa separa aprovação, baixa parcial, vencimento e estorno", () => {
  const rows = [
    {
      projectId: 1,
      type: "EXPENSE",
      dueDate: "2026-02-10",
      openAmount: 65,
      history: [{ movementDate: "2026-03-01", amount: 35 }],
    },
    {
      projectId: 1,
      type: "DONATION",
      dueDate: "2026-02-12",
      openAmount: 40,
      history: [
        { movementDate: "2026-02-28", amount: 80 },
        { movementDate: "2026-03-02", amount: -20 },
      ],
    },
    { projectId: 2, type: "EXPENSE", openAmount: 500, history: [] },
  ];
  assert.deepEqual(cashSummary(rows, { project: "1", from: "2026-02-01", until: "2026-02-28" }), {
    received: 8000,
    paid: 0,
    toReceive: 4000,
    toPay: 6500,
    cash: 8000,
    forecast: 5500,
  });
  assert.deepEqual(cashSummary(rows, { project: "1", from: "2026-03-01", until: "2026-03-02" }), {
    received: -2000,
    paid: 3500,
    toReceive: 0,
    toPay: 0,
    cash: -5500,
    forecast: -5500,
  });
  assert.equal(cashSummary(rows).toPay, 56500);
});
