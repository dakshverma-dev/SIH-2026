"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
    >
      Sign out
    </button>
  );
}
