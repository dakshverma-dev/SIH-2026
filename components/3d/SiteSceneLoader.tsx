"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

export interface SiteActivity {
  id: string;
  activity_id: string;
  wbs: string;
  discipline: string;
  description: string;
  location: string | null;
  progress: number | string;
  status: string;
  is_critical: boolean;
  planned_start: string | null;
  planned_finish: string | null;
  duration_days: number;
  contractor: string | null;
}

const SiteScene = dynamic(() => import("./SiteScene"), {
  ssr: false,
  loading: () => (
    <div className="p2r-card p2r-skel" style={{ height: 480 }} aria-busy="true" aria-label="Loading 3D scene" />
  ),
});

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export default function SiteSceneLoader({ activities }: { activities: SiteActivity[] }) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Deferred via setTimeout(0): WebGL/matchMedia detection must stay
    // client-only (this component is SSR'd for its initial HTML), and this
    // satisfies the same set-state-in-effect lint rule handled the same way
    // elsewhere in the shell (CommandPalette, NotificationBell).
    const t = setTimeout(() => {
      setWebglOk(detectWebGL());
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Server-rendered pass + first client paint: unknown yet, show the skeleton
  // rather than guessing — avoids a layout flash either direction.
  if (webglOk === null) {
    return <div className="p2r-card p2r-skel" style={{ height: 480 }} aria-busy="true" aria-label="Checking 3D support" />;
  }

  if (!webglOk) {
    return <Fallback2D activities={activities} reason="This device or browser doesn't support WebGL." />;
  }

  return <SiteScene activities={activities} autoRotate={!reducedMotion} />;
}

function Fallback2D({ activities, reason }: { activities: SiteActivity[]; reason: string }) {
  const byLocation = new Map<string, SiteActivity[]>();
  for (const a of activities) {
    const loc = a.location || "Unassigned";
    byLocation.set(loc, [...(byLocation.get(loc) || []), a]);
  }
  return (
    <div>
      <div className="p2r-card" style={{ padding: 14, marginBottom: 14, fontSize: 12.5, color: "var(--muted)" }}>
        {reason} Showing the same data as a grouped 2D layout instead —{" "}
        <Link href="/activities" className="p2r-link">full Activity Register →</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {Array.from(byLocation.entries()).map(([loc, acts]) => (
          <div key={loc} className="p2r-card" style={{ padding: 16 }}>
            <div className="p2r-eyebrow" style={{ marginBottom: 8 }}>{loc}</div>
            {acts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                <span className="p2r-mono">{a.activity_id}</span>
                <span className={`badge ${a.is_critical ? "badge-low" : "badge-neutral"}`}>{a.progress}%</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
