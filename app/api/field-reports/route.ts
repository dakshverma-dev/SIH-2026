import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return NextResponse.json({ reports: [] });
  const { data: reports } = await supabase
    .from("field_reports")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ reports: reports || [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return NextResponse.json({ error: "No project" }, { status: 400 });

  const body = await req.json();
  const { report_date, contractor, location, shift, discipline, raw_text } = body;
  if (!raw_text || raw_text.trim().length < 5) {
    return NextResponse.json({ error: "Report text is required." }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("field_reports")
    .insert({
      project_id: project.id,
      report_date: report_date || new Date().toISOString().slice(0, 10),
      contractor: contractor || null,
      location: location || null,
      shift: shift || null,
      discipline: discipline || null,
      author: session.name,
      raw_text,
      status: "SUBMITTED",
      created_by: session.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  await logAudit(supabase, {
    projectId: project.id,
    actor: session.email,
    action: "FIELD_REPORT_SUBMITTED",
    entityType: "field_report",
    entityId: inserted.id,
    after: { raw_text },
    source: "field-updates",
  });

  return NextResponse.json({ id: inserted.id });
}
