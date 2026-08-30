import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-16 p-10">
      {/* Hero Section */}
      <header className="space-y-6 text-center mt-12">
        <div className="inline-block rounded-[4px] bg-teal-accent/10 px-3 py-1 font-mono text-xs text-teal-accent uppercase tracking-wider mb-2">
          SIH26122 • Oil India Limited • Smart Automation
        </div>
        <h1 className="font-serif text-5xl font-light text-aged-sepia leading-tight max-w-4xl mx-auto">
          Intelligent Data Capture &<br />Schedule-Linking Layer
        </h1>
        <p className="font-sans text-lg text-moss-shadow max-w-2xl mx-auto">
          <strong className="text-aged-sepia font-medium">Plan2Reality: Trusted Execution Intelligence for project controls.</strong><br/>
          Bridging the gap between fragmented field updates and structured L5/L6 project schedules.
        </p>
        <div className="flex justify-center gap-4 pt-8">
          <Link
            href="/planner"
            className="rounded-[40px] bg-teal-accent px-8 py-3.5 font-sans text-sm font-medium text-pure-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Launch Planner Console
          </Link>
          <Link
            href="/review"
            className="rounded-[40px] border border-fog bg-pure-white px-8 py-3.5 font-sans text-sm font-medium text-aged-sepia shadow-sm hover:bg-fog/20 transition-colors"
          >
            Open Review Queue
          </Link>
        </div>
      </header>

      {/* The Context / Solution Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
        <div className="rounded-[12px] bg-pure-white p-8 border border-fog shadow-sm">
          <h3 className="font-serif text-xl text-aged-sepia">The Problem</h3>
          <p className="mt-4 font-sans text-sm text-moss-shadow leading-relaxed">
            Actual progress data from the field is fragmented, delayed, and inconsistently structured. Manual reconciliation is slow and error-prone, undermining downstream performance analytics and delaying critical interventions.
          </p>
        </div>
        <div className="rounded-[12px] bg-pure-white p-8 border border-fog shadow-sm">
          <h3 className="font-serif text-xl text-aged-sepia">Our Solution</h3>
          <p className="mt-4 font-sans text-sm text-moss-shadow leading-relaxed">
            An LLM-based layer that ingests heterogeneous field inputs, fuzzy-matches them to exact L5/L6 schedule activities using deep project context (WBS, location, dependencies), and flags conflicts before they pollute the master schedule.
          </p>
        </div>
        <div className="rounded-[12px] bg-pure-white p-8 border border-fog shadow-sm">
          <h3 className="font-serif text-xl text-aged-sepia">The Impact</h3>
          <p className="mt-4 font-sans text-sm text-moss-shadow leading-relaxed">
            Faster reconciliation, more trustworthy progress visibility, earlier schedule-impact detection, and the foundation of an institutional execution memory for future planning and accurate delay forecasting.
          </p>
        </div>
      </section>

      {/* Process Flow */}
      <section className="pt-12 pb-4">
        <h2 className="font-serif text-2xl text-aged-sepia text-center mb-10">The Five Phase Process</h2>
        <div className="flex flex-wrap justify-center items-center gap-3">
          {[
            { name: 'Capture', desc: 'DPRs, Text, Voice' },
            { name: 'Understand', desc: 'Structured Events' },
            { name: 'Match & Trust', desc: 'Validate vs Plan' },
            { name: 'Predict', desc: 'Schedule Impact' },
            { name: 'Recover & Learn', desc: 'Knowledge Base' }
          ].map((phase, i) => (
            <div key={phase.name} className="flex items-center gap-3">
              <div className="rounded-[12px] bg-pure-white p-5 border border-fog min-w-[160px] text-center shadow-sm">
                <span className="block font-mono text-xs text-moss-shadow mb-2">0{i + 1}</span>
                <span className="block font-sans text-sm text-aged-sepia font-medium mb-1">{phase.name}</span>
                <span className="block font-sans text-[11px] text-moss-shadow">{phase.desc}</span>
              </div>
              {i < 4 && <div className="text-moss-shadow/50 hidden md:block">→</div>}
            </div>
          ))}
        </div>
      </section>
      
      {/* Team Info Footer */}
      <section className="pt-16 pb-8 border-t border-fog mt-16 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="font-serif text-lg text-aged-sepia">Team Seekers</span>
          <span className="text-moss-shadow">•</span>
          <span className="font-mono text-xs text-moss-shadow uppercase tracking-widest">IIT Madras BS Degree Programme</span>
        </div>
        <p className="font-sans text-sm text-moss-shadow max-w-3xl mx-auto leading-relaxed">
          <strong>Daksh Verma</strong> (Lead, AI/Product) • 
          <strong> Preethy Parthasarathy</strong> (Domain/Eval) • 
          <strong> Yash Jindal</strong> (Research/UI) • 
          <strong> Vignesh Reddy Tadasina</strong> (Backend/Sec) • 
          <strong> Kartik Chilkoti</strong> (Full Stack) • 
          <strong> Chetna Nagar</strong> (Data/Gen AI)
        </p>
      </section>
    </main>
  );
}
