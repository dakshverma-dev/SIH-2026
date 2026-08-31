import type { FieldUpdate } from '../types';

// Raw text drawn from Preethy's Terminology_Variants + Benchmark_Events sheets
// (Plan2Reality - Ontology and Benchmark.xlsx), so downstream extraction/matching
// mock data reflects real field phrasing, not invented text.
export const fieldUpdates: FieldUpdate[] = [
  { id: 'fu-1', projectId: 'proj-1', rawText: 'P104 24-inch spool erected at Rack-3.', sourceFormat: 'dpr', timestamp: '2026-06-10T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-10', sourceType: 'dpr', excerpt: 'P104 24-inch spool erected at Rack-3.', page: 2 } },
  { id: 'fu-2', projectId: 'proj-1', rawText: 'All P104 pipe supports at Rack 3 have been fixed.', sourceFormat: 'dpr', timestamp: '2026-06-06T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-06', sourceType: 'dpr', excerpt: 'All P104 pipe supports at Rack 3 have been fixed.', page: 1 } },
  { id: 'fu-3', projectId: 'proj-1', rawText: 'P104 spool erected at Rack-4.', sourceFormat: 'text', timestamp: '2026-06-11T09:00:00Z', evidence: { sourceId: 'sms-2026-06-11', sourceType: 'text', excerpt: 'P104 spool erected at Rack-4.' } },
  { id: 'fu-4', projectId: 'proj-1', rawText: 'P104 erection at Rack 3 is 60% complete.', sourceFormat: 'text', timestamp: '2026-06-11T16:30:00Z', evidence: { sourceId: 'sms-2026-06-11b', sourceType: 'text', excerpt: 'P104 erection at Rack 3 is 60% complete.' } },
  { id: 'fu-5', projectId: 'proj-1', rawText: 'P104 erection at Rack 3 is 45% complete.', sourceFormat: 'voice', timestamp: '2026-06-12T14:00:00Z', evidence: { sourceId: 'voice-2026-06-12', sourceType: 'voice', excerpt: 'P104 erection at Rack 3 is 45% complete.' } },
  { id: 'fu-6', projectId: 'proj-1', rawText: 'Scaffolding erected around Rack 3.', sourceFormat: 'text', timestamp: '2026-06-12T11:00:00Z', evidence: { sourceId: 'sms-2026-06-12', sourceType: 'text', excerpt: 'Scaffolding erected around Rack 3, not on baseline schedule.' } },
  { id: 'fu-7', projectId: 'proj-1', rawText: 'T201 foundation casting finished today.', sourceFormat: 'dpr', timestamp: '2026-06-09T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-09', sourceType: 'dpr', excerpt: 'T201 foundation casting finished today.', page: 1 } },
  { id: 'fu-8', projectId: 'proj-1', rawText: 'Excavation for tank T-201 foundation started.', sourceFormat: 'excel', timestamp: '2026-06-01T18:00:00Z', evidence: { sourceId: 'xls-progress-wk1', sourceType: 'excel', excerpt: 'Excavation for tank T-201 foundation started.' } },
  { id: 'fu-9', projectId: 'proj-1', rawText: 'P105 spool erected at Rack 3.', sourceFormat: 'excel', timestamp: '2026-06-10T18:00:00Z', evidence: { sourceId: 'xls-progress-wk2', sourceType: 'excel', excerpt: 'P105 spool erected at Rack 3.' } },
  { id: 'fu-10', projectId: 'proj-1', rawText: 'Electrical cable tray L5.4.1 reported complete on 2026-09-20, ahead of dependent activity start.', sourceFormat: 'text', timestamp: '2026-06-14T10:00:00Z', evidence: { sourceId: 'sms-2026-06-14', sourceType: 'text', excerpt: 'Cable pulling in Substation B finished.' } },
  // Benchmark trick cases (from Benchmark_Events: B016-B018 missing identifier/action/location,
  // B021-B025 genuinely unmatched, B030 mixed update)
  { id: 'fu-11', projectId: 'proj-1', rawText: 'Rack 3 piping erection started.', sourceFormat: 'text', timestamp: '2026-06-10T08:00:00Z', evidence: { sourceId: 'sms-2026-06-10', sourceType: 'text', excerpt: 'Rack 3 piping erection started.' } },
  { id: 'fu-12', projectId: 'proj-1', rawText: 'P208 painting completed in Tank Farm.', sourceFormat: 'text', timestamp: '2026-06-15T09:00:00Z', evidence: { sourceId: 'sms-2026-06-15', sourceType: 'text', excerpt: 'P208 painting completed in Tank Farm.' } },
  { id: 'fu-13', projectId: 'proj-1', rawText: 'P104 supports are complete and spool erection started at Rack 3.', sourceFormat: 'dpr', timestamp: '2026-06-08T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-08', sourceType: 'dpr', excerpt: 'P104 supports are complete and spool erection started at Rack 3.', page: 1 } },
  // Additional Terminology_Variants coverage: typo/abbreviation (V007), size+location
  // without asset tag (V008), granularity (V009), status language (V010), trade
  // shorthand (V028), and completion-stage synonym (V031) — these stress harder
  // reliability tiers (Medium/Low) than the clean cases above.
  { id: 'fu-14', projectId: 'proj-1', rawText: 'P-104 erctn done at R-3.', sourceFormat: 'text', timestamp: '2026-06-11T07:30:00Z', evidence: { sourceId: 'sms-2026-06-11c', sourceType: 'text', excerpt: 'P-104 erctn done at R-3.' } },
  { id: 'fu-15', projectId: 'proj-1', rawText: 'The twenty-four inch header near rack three is now in place.', sourceFormat: 'voice', timestamp: '2026-06-10T15:00:00Z', evidence: { sourceId: 'voice-2026-06-10', sourceType: 'voice', excerpt: 'The twenty-four inch header near rack three is now in place.' } },
  { id: 'fu-16', projectId: 'proj-1', rawText: 'Rack piping completed for the week.', sourceFormat: 'dpr', timestamp: '2026-06-12T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-12', sourceType: 'dpr', excerpt: 'Rack piping completed for the week.', page: 3 } },
  { id: 'fu-17', projectId: 'proj-1', rawText: 'P104 erection commenced at Rack 3 this morning.', sourceFormat: 'text', timestamp: '2026-06-10T06:00:00Z', evidence: { sourceId: 'sms-2026-06-10b', sourceType: 'text', excerpt: 'P104 erection commenced at Rack 3 this morning.' } },
  { id: 'fu-18', projectId: 'proj-1', rawText: 'P104 bolt-up completed at Rack 3.', sourceFormat: 'dpr', timestamp: '2026-06-15T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-15', sourceType: 'dpr', excerpt: 'P104 bolt-up completed at Rack 3.', page: 2 } },
  { id: 'fu-19', projectId: 'proj-1', rawText: 'All P104 punch points at Rack 3 closed.', sourceFormat: 'excel', timestamp: '2026-06-17T18:00:00Z', evidence: { sourceId: 'xls-progress-wk3', sourceType: 'excel', excerpt: 'All P104 punch points at Rack 3 closed.' } },
];
