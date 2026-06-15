import { buildAiCertificatePlanCheck } from "@/lib/plan/ai-certificate-plan-check";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(buildAiCertificatePlanCheck());
}
