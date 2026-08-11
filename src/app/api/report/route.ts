import { jsonOk, withAuth } from "@/lib/api";
import { loadReport, parseRange } from "@/lib/reportService";

export const GET = withAuth(async ({ user, req }) => {
  const range = parseRange(new URL(req.url));
  const report = await loadReport(user.id, range);
  return jsonOk({
    ...report,
    conventions: {
      missingActual: "treated-as-zero",
      variancePctWhenPlanZero: null,
      lockGranularity: "month",
      currency: "USD",
      amounts: "integer cents",
    },
  });
});
