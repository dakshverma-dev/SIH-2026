import { SupabaseClient } from "@supabase/supabase-js";

export const DEMO_PROJECT = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "North Basin Process Expansion — EPC Package",
  code: "NBPE-2026",
  description:
    "Greenfield process unit expansion. EPC scope covering piping, mechanical, electrical, instrumentation, civil and structural disciplines.",
  data_status: "DEMO",
};

export async function getDefaultProject(supabase: SupabaseClient) {
  try {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) {
      return data as { id: string; name: string; code: string; description: string; data_status: string };
    }
  } catch {}
  return DEMO_PROJECT;
}

