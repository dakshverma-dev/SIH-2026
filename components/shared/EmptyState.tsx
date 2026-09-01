export default function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="p2r-card" style={{ padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>{body}</div>}
      {action && (
        <a
          href={action.href}
          className="p2r-link"
          style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, fontWeight: 600, padding: "7px 16px", background: "var(--accent-soft)", borderRadius: 7, color: "var(--accent)" }}
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
