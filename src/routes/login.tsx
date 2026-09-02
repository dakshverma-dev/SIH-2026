import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Btn } from "@/components/kit";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  ensureDemoAccounts,
} from "@/lib/demo-users.functions";
import { ROLE_LABEL, type Role } from "@/lib/domain/permissions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in. Plan2Reality" },
      {
        name: "description",
        content: "Sign in to the Plan2Reality planner console, or use one of the labelled demo accounts.",
      },
      { property: "og:title", content: "Sign in. Plan2Reality" },
      { property: "og:description", content: "Access the Plan2Reality planner console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const provision = useServerFn(ensureDemoAccounts);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (mail: string, pass: string) => {
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: mail,
      password: pass,
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }
    void navigate({ to: "/dashboard" });
  };

  const useDemo = async (mail: string) => {
    setBusy(true);
    setError(null);
    setMessage("Signing in to demo account...");
    try {
      await provision({ data: undefined });
    } catch {
      // Ignore background server provisioning errors and proceed to sign in directly
    }
    setMessage(null);
    await signIn(mail, DEMO_PASSWORD);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <Link to="/" className="eyebrow mb-8 inline-block">
        Back to overview
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="panel p-7">
          <h1 className="font-serif text-3xl">Planner console</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your project account.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email, password);
            }}
          >
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <Btn type="submit" disabled={busy} className="w-full">
              {busy ? "Working" : "Sign in"}
            </Btn>
          </form>
          {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
          {error ? (
            <p className="mt-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="panel p-7">
          <p className="eyebrow mb-2">Demo accounts</p>
          <h2 className="font-serif text-2xl">One account per role</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These are demonstration accounts with a shared, published password. They exist so the
            role model can be inspected. Do not treat them as real credentials.
          </p>
          <ul className="mt-5 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li
                key={a.email}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-panel-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    {a.name}
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {ROLE_LABEL[a.role as Role]}
                    </span>
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{a.email}</p>
                </div>
                <Btn variant="ghost" disabled={busy} onClick={() => void useDemo(a.email)}>
                  Use
                </Btn>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Shared demo password: {DEMO_PASSWORD}
          </p>
        </div>
      </div>
    </div>
  );
}
