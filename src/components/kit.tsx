import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { TrustLevel } from "@/lib/domain/types";

export function Panel({ className, children }: { className?: string | undefined; children: ReactNode }) {
  return <div className={cn("panel p-5", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="font-serif text-3xl text-foreground">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

const trustStyles: Record<TrustLevel, string> = {
  HIGH: "bg-moss-soft text-moss border-moss/30",
  MEDIUM: "bg-warn-soft text-warn border-warn/30",
  LOW: "bg-danger-soft text-danger border-danger/30",
  UNMATCHED: "bg-panel-2 text-muted-foreground border-border-strong",
};

export function TrustBadge({ level, score }: { level: TrustLevel; score?: number | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[11px] font-semibold tracking-wide transition-colors",
        trustStyles[level],
      )}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {level}
      {typeof score === "number" ? <span className="opacity-70">{score.toFixed(2)}</span> : null}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  COMPLETE: "bg-moss-soft text-moss border-moss/30",
  IN_PROGRESS: "bg-accent text-accent-foreground border-primary/25",
  NOT_STARTED: "bg-panel-2 text-muted-foreground border-border-strong",
  DELAYED: "bg-danger-soft text-danger border-danger/30",
  PENDING: "bg-warn-soft text-warn border-warn/30",
  APPROVED: "bg-moss-soft text-moss border-moss/30",
  REJECTED: "bg-danger-soft text-danger border-danger/30",
  OPEN: "bg-danger-soft text-danger border-danger/30",
  RESOLVED: "bg-moss-soft text-moss border-moss/30",
  IGNORED: "bg-panel-2 text-muted-foreground border-border-strong",
  PROCESSED: "bg-moss-soft text-moss border-moss/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide",
        statusStyles[status] ?? "bg-panel-2 text-muted-foreground border-border-strong",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return <span className={cn("font-mono text-xs text-text-soft", className)}>{children}</span>;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string | undefined;
  actionTo?: string | undefined;
  onAction?: (() => void) | undefined;
}) {
  return (
    <div className="panel-recessed flex flex-col items-center justify-center px-6 py-14 text-center">
      <h3 className="font-serif text-xl text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo as "/"} className="mt-5">
          <Btn>{actionLabel}</Btn>
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Btn onClick={onAction}>{actionLabel}</Btn>
        </div>
      ) : null}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "quiet";
};

export function Btn({ variant = "primary", className, ...props }: BtnProps) {
  const styles: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:opacity-90 border border-primary disabled:opacity-40",
    ghost:
      "bg-panel text-foreground border border-border-strong hover:bg-panel-2 disabled:opacity-40",
    danger: "bg-danger text-primary-foreground border border-danger hover:opacity-90 disabled:opacity-40",
    quiet: "bg-transparent text-primary border border-transparent hover:bg-accent disabled:opacity-40",
  };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
    />
  );
}

export function RoleGate({
  allowed,
  feature,
  children,
}: {
  allowed: boolean;
  feature: string;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return (
    <div className="panel-recessed px-6 py-12 text-center">
      <p className="eyebrow mb-2">Restricted</p>
      <h3 className="font-serif text-xl text-foreground">{feature} is not available for your role</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Your account can view project data but cannot use this control. The restriction is enforced
        in the database, not just in this interface.
      </p>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <div className="text-sm text-foreground">{value ?? "Not recorded"}</div>
    </div>
  );
}
