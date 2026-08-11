import { withAuth } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { fromCents } from "@/lib/money";
import { loadReport, parseRange } from "@/lib/reportService";

export const GET = withAuth(async ({ user, req }) => {
  const range = parseRange(new URL(req.url));
  const report = await loadReport(user.id, range);

  const csv = toCsv(
    ["month", "category", "plan", "actual", "variance", "variance_pct", "has_actual_entries", "locked"],
    report.rows.map((r) => [
      r.month,
      r.categoryName,
      fromCents(r.planCents).toFixed(2),
      fromCents(r.actualCents).toFixed(2),
      fromCents(r.varianceCents).toFixed(2),
      r.variancePct === null ? "N/A" : r.variancePct.toFixed(2),
      r.hasActualEntries ? "yes" : "no",
      r.locked ? "yes" : "no",
    ]),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="plan-vs-actual-${range.from}_to_${range.to}.csv"`,
    },
  });
});
