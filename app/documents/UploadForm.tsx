"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    await fetch("/api/documents", { method: "POST", body: form });
    setLoading(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="p2r-card" style={{ padding: 16, display: "flex", gap: 10, alignItems: "center" }}>
      <input ref={fileRef} type="file" style={{ fontSize: 13 }} />
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: "7px 10px", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 13 }}>
        {["General", "DPR", "Drawing", "Contract", "Photo", "Report"].map((c) => <option key={c}>{c}</option>)}
      </select>
      <button onClick={upload} disabled={loading} style={{ padding: "7px 16px", background: "var(--accent)", color: "#0b0f14", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
        {loading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
