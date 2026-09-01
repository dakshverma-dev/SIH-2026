import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// Real global search: hits the same RLS-scoped tables every page reads from.
// No client-side fake matching, no hardcoded result lists.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const like = `%${q}%`;

  const [activities, reports, conflicts] = await Promise.all([
    supabase
      .from("schedule_activities")
      .select("id, activity_id, description, wbs, discipline")
      .or(`activity_id.ilike.${like},description.ilike.${like},engineering_tag.ilike.${like}`)
      .limit(6),
    supabase
      .from("field_reports")
      .select("id, contractor, location, report_date")
      .or(`contractor.ilike.${like},location.ilike.${like},raw_text.ilike.${like}`)
      .limit(6),
    supabase
      .from("conflicts")
      .select("id, conflict_type, description")
      .or(`conflict_type.ilike.${like},description.ilike.${like}`)
      .limit(6),
  ]);

  const results = [
    ...(activities.data || []).map((a) => ({
      group: "Activities",
      id: a.id,
      title: a.activity_id,
      subtitle: a.description,
      href: `/schedule#${a.id}`,
    })),
    ...(reports.data || []).map((r) => ({
      group: "Field Updates",
      id: r.id,
      title: `${r.report_date} — ${r.contractor || "Unattributed"}`,
      subtitle: r.location || "",
      href: `/field-updates/${r.id}`,
    })),
    ...(conflicts.data || []).map((c) => ({
      group: "Conflicts",
      id: c.id,
      title: c.conflict_type.replace(/_/g, " "),
      subtitle: c.description,
      href: `/conflicts#${c.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
