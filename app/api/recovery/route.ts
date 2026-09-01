import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession, can } from "@/lib/auth";
import { runRecoverySimulation } from "@/lib/engine/schedule";
import { logAudit } from "@/lib/audit";
import { getDefaultProject } from "@/lib/project";
import { RecoveryRequestSchema, zodErrorResponse } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "recovery:run")) {
    return NextResponse.json({ error: `Role '${session.role}' cannot run recovery simulations.` }, { status: 403 });
  }
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return NextResponse.json({ error: "No project" }, { status: 400 });

  const raw = await req.json().catch(() => null);
  if (raw === null) return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  const parsed = RecoveryRequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 });
  const { activityId } = parsed.data;

  const result = await runRecoverySimulation(supabase, project.id, activityId);
  if (!result) return NextResponse.json({ error: "Activity not found or not permitted." }, { status: 403 });

  await logAudit(supabase, {
    projectId: project.id,
    actor: session.email,
    action: "RECOVERY_SIMULATION_RUN",
    entityType: "schedule_activity",
    entityId: activityId,
    after: result,
    source: "recovery-simulator",
    reason: "Prototype scenario assumptions — not a real-world optimized recommendation.",
  });

  return NextResponse.json(result);
}
