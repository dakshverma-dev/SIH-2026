import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plan2Reality. Turn field reality into schedule truth." },
      {
        name: "description",
        content:
          "Plan2Reality is the trust layer between messy field reporting and structured EPC project schedules. Capture, understand, match, predict, recover.",
      },
      { property: "og:title", content: "Plan2Reality. Turn field reality into schedule truth." },
      {
        property: "og:description",
        content:
          "Infrastructure projects plan in Primavera and report in WhatsApp. Plan2Reality closes that gap.",
      },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  { key: "01", title: "Capture", body: "Raw shift language, exactly as it was written." },
  { key: "02", title: "Understand", body: "Structured event fields with the source span kept." },
  { key: "03", title: "Match and trust", body: "Weighted signals produce a score you can audit." },
  { key: "04", title: "Schedule impact", body: "Deterministic CPM, never a language model." },
  { key: "05", title: "Project action", body: "Review, resolve, recover, record." },
];

const PRINCIPLES = [
  {
    title: "When the system knows, it acts.",
    body: "A high confidence match carries identifier, discipline and location agreement. It posts automatically and still shows its working.",
  },
  {
    title: "When it is uncertain, it explains.",
    body: "Medium and low confidence goes to a review queue with the signal breakdown, the runner-up candidates, and the original text.",
  },
  {
    title: "When it does not know, it says so.",
    body: "A zero or negative total is recorded as UNMATCHED. No event is ever forced onto an activity to avoid an empty cell.",
  },
];

const ARCHITECTURE = [
  {
    title: "Frontend",
    body: "React, TypeScript in strict mode, TanStack Router with file based routes, Tailwind on a fixed token set, React Three Fiber for the site view, lazily loaded.",
  },
  {
    title: "Database and security",
    body: "Postgres with row level security on every table. Roles live in their own table, never on a profile. The audit ledger has insert policies only, so history cannot be rewritten.",
  },
  {
    title: "Matching and CPM",
    body: "Named weighted signals summing to a clamped score, and a pure forward and backward pass critical path implementation with unit tests. No model is involved in either.",
  },
  {
    title: "Extraction",
    body: "A deterministic regex and keyword extractor labelled DEMO FALLBACK in the interface. A language model integration point exists and would be labelled differently if configured.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="font-serif text-lg leading-tight">Plan2Reality</p>
            <p className="eyebrow">Field ledger</p>
          </div>
          <Link
            to="/login"
            className="rounded-md border border-border-strong px-3.5 py-2 text-sm transition-colors hover:bg-panel-2"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl"
        >
          <p className="eyebrow mb-4">Trust layer for EPC execution</p>
          <h1 className="font-serif text-5xl leading-[1.05] text-foreground sm:text-6xl">
            Turn field reality into schedule truth.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-text-soft">
            Infrastructure projects plan in Primavera and report in WhatsApp. One side is a
            structured network of activities and float. The other is a paragraph typed at the end of
            a shift. Plan2Reality closes that gap, and shows its reasoning every time it does.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open Planner Console
            </Link>
            <a
              href="#how-it-works"
              className="rounded-md border border-border-strong bg-panel px-5 py-3 text-sm font-medium transition-colors hover:bg-panel-2"
            >
              Explore how it works
            </a>
          </div>
        </motion.div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-panel/50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow mb-6">The loop</p>
          <div className="grid gap-4 md:grid-cols-5">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="panel p-4"
              >
                <p className="font-mono text-xs text-muted-foreground">{step.key}</p>
                <h3 className="mt-2 font-serif text-lg">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow mb-6">Trust first</p>
        <div className="grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="panel p-6">
              <h3 className="font-serif text-xl leading-snug">{p.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-panel/50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow mb-6">What is actually built</p>
          <div className="grid gap-8 md:grid-cols-4">
            {ARCHITECTURE.map((c) => (
              <div key={c.title}>
                <h3 className="font-serif text-lg">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="font-mono text-xs text-muted-foreground">
            Plan2Reality. Messy field language in, trusted and explainable schedule truth out.
          </p>
        </div>
      </footer>
    </div>
  );
}
