import { buildRuleCoverageAudit } from "../../../../lib/rules/rule-coverage-audit.ts";

export function GET() {
  return Response.json(buildRuleCoverageAudit());
}
