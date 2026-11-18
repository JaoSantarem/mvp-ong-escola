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
