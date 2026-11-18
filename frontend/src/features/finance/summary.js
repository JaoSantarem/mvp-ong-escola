export function filterSummaryRows(rows, { from = "", until = "", project = "" } = {}) {
  if (from && until && from > until) return [];
  return rows.filter(
    (row) =>
      (!from || row.date >= from) &&
      (!until || row.date <= until) &&
      (!project ||
        (project === "none" ? row.projectId == null : String(row.projectId) === String(project))),
  );
}

export function cashSummary(rows, { project = "", from = "", until = "" } = {}) {
  const totals = { received: 0, paid: 0, toReceive: 0, toPay: 0, cash: 0, forecast: 0 };
  const inPeriod = (date) =>
    (!from || (date && date >= from)) && (!until || (date && date <= until));
  for (const row of filterSummaryRows(rows, { project })) {
    const expense = row.type === "EXPENSE";
    for (const event of row.history || []) {
      if (event.amount != null && inPeriod(event.movementDate))
        totals[expense ? "paid" : "received"] += Math.round(Number(event.amount) * 100);
    }
    if (inPeriod(row.dueDate))
      totals[expense ? "toPay" : "toReceive"] += Math.round(Number(row.openAmount || 0) * 100);
  }
  totals.cash = totals.received - totals.paid;
  totals.forecast = totals.cash + totals.toReceive - totals.toPay;
  return totals;
}
