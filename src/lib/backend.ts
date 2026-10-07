export const backendUrl =
  (import.meta.env["VITE_BACKEND_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export interface BackendHealth {
  status: string;
  database: string;
  ocr_model: string;
  reasoning_model: string;
  nvidia_key_present: boolean;
  activities_loaded: number;
  prompt_version: string;
}

export async function fetchBackendHealth(): Promise<BackendHealth | null> {
  if (!backendUrl) return null;
  const res = await fetch(`${backendUrl}/api/v1/health`);
  if (!res.ok) throw new Error(`Backend health check failed: ${res.status}`);
  return res.json() as Promise<BackendHealth>;
}
