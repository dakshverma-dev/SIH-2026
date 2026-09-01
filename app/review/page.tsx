import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDefaultProject } from "@/lib/project";
import Shell from "@/components/Shell";
import ReviewCard from "./ReviewCard";
import EmptyState from "@/components/shared/EmptyState";

export default async function ReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const supabase = await createClient();
  const project = await getDefaultProject(supabase);
  if (!project) return null;

  const { data: matchesData } = await supabase
    .from("activity_matches")
    .select("*, field_events(evidence_span, activity_description, engineering_tag, location, discipline, progress)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const matches = matchesData || [];

  const enriched = [];
  for (const m of matches) {
    const { data: candidatesData } = await supabase
      .from("match_candidates")
      .select("*, schedule_activities(activity_id, description, wbs, discipline, location, engineering_tag)")
      .eq("field_event_id", m.field_event_id)
      .order("rank", { ascending: true });

    const candidates = (candidatesData || []).map((c) => ({
      id: c.id,
      score: c.score,
      reasons: c.reasons,
      activity_id: c.activity_id,
      sched_activity_id: c.schedule_activities?.activity_id,
      sched_description: c.schedule_activities?.description,
      wbs: c.schedule_activities?.wbs,
      discipline: c.schedule_activities?.discipline,
      location: c.schedule_activities?.location,
    }));

    enriched.push({
      ...m,
      evidence_span: m.field_events?.evidence_span,
      candidates,
    });
  }

  const pending = enriched.filter((m) => m.status === "PENDING");
  const decided = enriched.filter((m) => m.status !== "PENDING");

  return (
    <Shell active="/review" user={session} projectName={project.name}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Review Queue</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
        {pending.length} pending · High confidence auto-eligible for approval, medium requires review, low/unmatched never force a match.
      </p>

      {pending.length === 0 && decided.length === 0 && (
        <EmptyState
          title="No matches yet"
          body="Submit a field report to run capture → understand → match → trust and generate the first review item."
          action={{ href: "/field-updates", label: "Submit a Field Update" }}
        />
      )}

      {pending.map((m) => <ReviewCard key={m.id} match={m} canReview={session.role !== "VIEWER" && session.role !== "SUPERVISOR"} />)}

      {decided.length > 0 && (
        <>
          <div style={{ fontWeight: 600, margin: "20px 0 10px" }}>Decided</div>
          {decided.map((m) => <ReviewCard key={m.id} match={m} canReview={false} />)}
        </>
      )}
    </Shell>
  );
}
