import { Canvas } from "@react-three/fiber";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import type { ScheduleActivity } from "@/lib/domain/types";

const STATUS_COLOR: Record<string, string> = {
  NOT_STARTED: "#c9bc9c",
  IN_PROGRESS: "#0f6e64",
  COMPLETED: "#5c6b3f",
  DELAYED: "#99392c",
  ON_HOLD: "#9c6b1f",
};

export interface SceneProps {
  activities: ScheduleActivity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
}

export default function SiteScene({ activities, selectedId, onSelect, reducedMotion }: SceneProps) {
  const locations = Array.from(
    new Set(activities.map((a) => a.location ?? "Unassigned")),
  ).sort();

  return (
    <Canvas camera={{ position: [14, 12, 16], fov: 45 }} dpr={[1, 1.8]}>
      <color attach="background" args={["#efe9db"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[10, 16, 8]} intensity={1.1} />
      <gridHelper args={[40, 40, "#c9bc9c", "#ddd3bd"]} position={[0, -0.01, 0]} />

      {locations.map((loc, li) => {
        const inLoc = activities.filter((a) => (a.location ?? "Unassigned") === loc);
        const z = (li - (locations.length - 1) / 2) * 4;
        return (
          <group key={loc} position={[0, 0, z]}>
            <Html position={[-((inLoc.length * 2.4) / 2) - 2.4, 0.4, 0]} center distanceFactor={22}>
              <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-[#8a7f68]">
                {loc}
              </span>
            </Html>
            {inLoc.map((a, i) => {
              const height = 0.4 + (Math.max(0, Math.min(100, a.progress ?? 0)) / 100) * 3.6;
              const x = (i - (inLoc.length - 1) / 2) * 2.4;
              const selected = a.id === selectedId;
              return (
                <mesh
                  key={a.id}
                  position={[x, height / 2, 0]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(a.id);
                  }}
                >
                  <boxGeometry args={[1.5, height, 1.5]} />
                  <meshStandardMaterial
                    color={STATUS_COLOR[a.status] ?? "#c9bc9c"}
                    roughness={0.75}
                    metalness={0.05}
                    emissive={selected ? "#0f6e64" : "#000000"}
                    emissiveIntensity={selected ? 0.28 : 0}
                  />
                  {a.is_critical ? <Edges scale={1.02} color="#99392c" /> : null}
                </mesh>
              );
            })}
          </group>
        );
      })}

      <OrbitControls
        enablePan
        enableDamping={!reducedMotion}
        autoRotate={false}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={6}
        maxDistance={45}
      />
    </Canvas>
  );
}
