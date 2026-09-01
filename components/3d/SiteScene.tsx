"use client";
import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Edges } from "@react-three/drei";
import type { SiteActivity } from "./SiteSceneLoader";

const STATUS_COLOR: Record<string, string> = {
  COMPLETE: "#5c6b3f", // moss
  IN_PROGRESS: "#0f6e64", // teal accent
  NOT_STARTED: "#a89c81", // muted
  DELAYED: "#99392c", // danger
};

interface ZonedActivity extends SiteActivity {
  x: number;
  z: number;
  zoneLabel: string;
}

function layout(activities: SiteActivity[]): { zones: { label: string; x: number; z: number }[]; placed: ZonedActivity[] } {
  const locations = Array.from(new Set(activities.map((a) => a.location || "Unassigned"))).sort();
  const cols = Math.ceil(Math.sqrt(locations.length || 1));
  const spacing = 13;
  const zonePositions = new Map<string, { x: number; z: number }>();
  locations.forEach((loc, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    zonePositions.set(loc, { x: (col - (cols - 1) / 2) * spacing, z: (row - (Math.ceil(locations.length / cols) - 1) / 2) * spacing });
  });

  const countPerZone = new Map<string, number>();
  const placed: ZonedActivity[] = activities.map((a) => {
    const loc = a.location || "Unassigned";
    const zone = zonePositions.get(loc)!;
    const idx = countPerZone.get(loc) || 0;
    countPerZone.set(loc, idx + 1);
    return {
      ...a,
      zoneLabel: loc,
      x: zone.x + idx * 2.3 - 4, // laid left-to-right within the zone pad
      z: zone.z,
    };
  });

  return { zones: locations.map((label) => ({ label, ...zonePositions.get(label)! })), placed };
}

function ActivityBlock({ a, selected, onSelect }: { a: ZonedActivity; selected: boolean; onSelect: (a: ZonedActivity) => void }) {
  const height = Math.max(0.6, Math.min(6, Number(a.duration_days || 4) / 3));
  const color = STATUS_COLOR[a.status] || "#a89c81";
  return (
    <group position={[a.x, height / 2, a.z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(a);
        }}
        castShadow
      >
        <boxGeometry args={[1.6, height, 1.6]} />
        <meshStandardMaterial color={color} opacity={selected ? 1 : 0.88} transparent roughness={0.55} metalness={0.05} />
        {a.is_critical && <Edges color="#99392c" linewidth={2} />}
        {selected && <Edges color="#0f6e64" linewidth={3} />}
      </mesh>
      {/* progress cap — a thin lighter slab showing % complete, purely visual encoding of real data */}
      <mesh position={[0, height / 2 + 0.03, 0]}>
        <boxGeometry args={[1.6 * (Number(a.progress) / 100 || 0.001), 0.06, 1.6]} />
        <meshStandardMaterial color="#efe9db" />
      </mesh>
    </group>
  );
}

function Scene({ activities, autoRotate, onSelect, selectedId }: {
  activities: ZonedActivity[];
  autoRotate: boolean;
  onSelect: (a: ZonedActivity) => void;
  selectedId: string | null;
}) {
  const zones = useMemo(() => Array.from(new Map(activities.map((a) => [a.zoneLabel, a])).values()), [activities]);
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[12, 18, 8]} intensity={1.1} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#e8e1d0" />
      </mesh>
      {zones.map((z) => (
        <group key={z.zoneLabel} position={[z.x, 0, z.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[10, 8]} />
            <meshStandardMaterial color="#fffdf8" />
          </mesh>
          <Text position={[0, 0.02, -4.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#8a7f68" anchorX="center">
            {z.zoneLabel}
          </Text>
        </group>
      ))}
      {activities.map((a) => (
        <ActivityBlock key={a.id} a={a} selected={a.id === selectedId} onSelect={onSelect} />
      ))}
      <OrbitControls autoRotate={autoRotate} autoRotateSpeed={0.6} enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.1} minDistance={8} maxDistance={60} />
    </>
  );
}

export default function SiteScene({ activities, autoRotate }: { activities: SiteActivity[]; autoRotate: boolean }) {
  const { placed } = useMemo(() => layout(activities), [activities]);
  const [selected, setSelected] = useState<ZonedActivity | null>(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 300px" : "1fr", gap: 14 }}>
      <div className="p2r-card" style={{ height: 480, overflow: "hidden", position: "relative" }}>
        <Canvas shadows camera={{ position: [22, 18, 22], fov: 42 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <Scene activities={placed} autoRotate={autoRotate} onSelect={setSelected} selectedId={selected?.id ?? null} />
          </Suspense>
        </Canvas>
        <div style={{ position: "absolute", left: 14, bottom: 12, display: "flex", gap: 10, fontSize: 10.5, background: "rgba(255,253,248,0.9)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <span key={status} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 9, height: 9, background: color, borderRadius: 2, display: "inline-block" }} />
              {status.replace("_", " ")}
            </span>
          ))}
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 9, height: 9, border: "2px solid #99392c", borderRadius: 2, display: "inline-block" }} />
            Critical
          </span>
        </div>
      </div>

      {selected && (
        <div className="p2r-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="p2r-mono" style={{ color: "var(--accent)", fontSize: 12.5 }}>{selected.activity_id}</span>
            <button onClick={() => setSelected(null)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>✕</button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selected.description}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, fontSize: 12.5 }}>
            <Row label="WBS" value={selected.wbs} />
            <Row label="Discipline" value={selected.discipline} />
            <Row label="Location" value={selected.location} />
            <Row label="Contractor" value={selected.contractor} />
            <Row label="Progress" value={`${selected.progress}%`} />
            <Row label="Status" value={selected.status.replace("_", " ")} />
            <Row label="Planned finish" value={selected.planned_finish} />
            <Row label="Critical path" value={selected.is_critical ? "Yes" : "No"} />
          </div>
          <a href={`/activity/${selected.id}`} className="p2r-link" style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, fontWeight: 600 }}>
            Open full activity detail →
          </a>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );
}
