// Preethy's "Benchmark_Events" sheet (Plan2Reality - Ontology and Benchmark.xlsx) —
// the gold-standard answer key for Match & Trust routing decisions. Columns A-H
// are the domain answer key; columns I-K (actual_top1/actual_decision/evaluation_status)
// are filled in by the real matcher once Kartik's module exists (see run-benchmark.ts).
// Keep this file in sync with the source sheet — do not hand-tune expected values.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type TestSplit = 'Train' | 'Test';
export type ExpectedDecision = 'MATCH' | 'REVIEW' | 'UNMATCHED';

export interface BenchmarkEvent {
  caseId: string;
  caseType: string;
  fieldReport: string;
  expectedActivityId: string | null;
  expectedDecision: ExpectedDecision;
  difficulty: Difficulty;
  testSplit: TestSplit;
  domainRationale: string;
}

export const benchmarkEvents: BenchmarkEvent[] = [
  { caseId: 'B001', caseType: 'Terminology', fieldReport: 'P104 24-inch spool erected at Rack-3.', expectedActivityId: 'PIP-324', expectedDecision: 'MATCH', difficulty: 'Easy', testSplit: 'Train', domainRationale: 'Exact asset, action and location' },
  { caseId: 'B002', caseType: 'Location disambiguation', fieldReport: 'P104 spool erected at Rack-4.', expectedActivityId: 'PIP-325', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'Rack 4 distinguishes it from PIP-324' },
  { caseId: 'B003', caseType: 'Activity disambiguation', fieldReport: 'P104 hydrotesting completed at Rack-3.', expectedActivityId: 'PIP-326', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'Hydrotest distinguishes it from erection' },
  { caseId: 'B004', caseType: 'Asset disambiguation', fieldReport: 'P105 spool erected at Rack 3.', expectedActivityId: 'PIP-328', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'P105 distinguishes it from P104' },
  { caseId: 'B005', caseType: 'Typo', fieldReport: 'P-104 spoll ercted R-3 today.', expectedActivityId: 'PIP-324', expectedDecision: 'MATCH', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Multiple typos but strong tag and location anchors' },
  { caseId: 'B006', caseType: 'Natural language', fieldReport: 'The twenty-four inch header near rack three is now in place.', expectedActivityId: 'PIP-324', expectedDecision: 'MATCH', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'No activity ID; relies on size, location and semantic action' },
  { caseId: 'B007', caseType: 'Movement vs erection', fieldReport: 'P104 spool delivered to the Rack 3 workfront.', expectedActivityId: 'PIP-323', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'Delivery is not erection' },
  { caseId: 'B008', caseType: 'Support work', fieldReport: 'All P104 pipe supports at Rack 3 have been fixed.', expectedActivityId: 'PIP-322', expectedDecision: 'MATCH', difficulty: 'Easy', testSplit: 'Train', domainRationale: 'Clear support installation' },
  { caseId: 'B009', caseType: 'Inspection', fieldReport: 'NDT of P104 Rack 3 welds completed.', expectedActivityId: 'PIP-327', expectedDecision: 'MATCH', difficulty: 'Easy', testSplit: 'Train', domainRationale: 'Inspection-specific anchor' },
  { caseId: 'B010', caseType: 'Completion work', fieldReport: 'P104 bolt-up completed at Rack 3.', expectedActivityId: 'PIP-330', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'Trade shorthand for flange bolting' },
  { caseId: 'B011', caseType: 'Completion work', fieldReport: 'All P104 punch points at Rack 3 closed.', expectedActivityId: 'PIP-331', expectedDecision: 'MATCH', difficulty: 'Easy', testSplit: 'Train', domainRationale: 'Punch clearance' },
  { caseId: 'B012', caseType: 'Civil cross-discipline', fieldReport: 'Excavation for tank T-201 foundation started.', expectedActivityId: 'CIV-112', expectedDecision: 'MATCH', difficulty: 'Easy', testSplit: 'Train', domainRationale: 'Clear civil event' },
  { caseId: 'B013', caseType: 'Civil terminology', fieldReport: 'T201 foundation casting finished today.', expectedActivityId: 'CIV-113', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Test', domainRationale: 'Regional synonym for concrete placement' },
  { caseId: 'B014', caseType: 'Electrical action', fieldReport: 'Cable pulling in Substation B finished.', expectedActivityId: 'ELE-341', expectedDecision: 'MATCH', difficulty: 'Easy', testSplit: 'Train', domainRationale: 'Clear cable pulling' },
  { caseId: 'B015', caseType: 'Electrical disambiguation', fieldReport: 'Substation B power cable glanding and termination complete.', expectedActivityId: 'ELE-342', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Test', domainRationale: 'Termination distinguished from pulling' },
  { caseId: 'B016', caseType: 'Missing asset', fieldReport: 'Rack 3 piping erection started.', expectedActivityId: null, expectedDecision: 'REVIEW', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Several piping activities exist at Rack 3; asset is missing' },
  { caseId: 'B017', caseType: 'Missing action', fieldReport: 'P104 work completed at Rack 3.', expectedActivityId: null, expectedDecision: 'REVIEW', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Cannot distinguish erection, testing, inspection or bolting' },
  { caseId: 'B018', caseType: 'Missing location', fieldReport: 'P104 spool erection completed.', expectedActivityId: null, expectedDecision: 'REVIEW', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Could be Rack 3 or Rack 4' },
  { caseId: 'B019', caseType: 'Granularity', fieldReport: 'Two of five P104 supports installed at Rack 3.', expectedActivityId: 'PIP-322', expectedDecision: 'MATCH', difficulty: 'Hard', testSplit: 'Train', domainRationale: 'Granular events aggregate to 40 percent physical progress' },
  { caseId: 'B020', caseType: 'Status extraction', fieldReport: 'P104 erection commenced at Rack 3 this morning.', expectedActivityId: 'PIP-324', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'Commenced implies ACTUAL_START' },
  { caseId: 'B021', caseType: 'Unmatched asset', fieldReport: 'P208 painting completed in Tank Farm.', expectedActivityId: null, expectedDecision: 'UNMATCHED', difficulty: 'Easy', testSplit: 'Test', domainRationale: 'No painting activity or P208 asset exists' },
  { caseId: 'B022', caseType: 'Unmatched work', fieldReport: 'Scaffolding erected around Rack 3.', expectedActivityId: null, expectedDecision: 'UNMATCHED', difficulty: 'Medium', testSplit: 'Test', domainRationale: 'Real field work absent from the sample schedule' },
  { caseId: 'B023', caseType: 'Unmatched discipline', fieldReport: 'Instrument loop checking completed in Substation B.', expectedActivityId: null, expectedDecision: 'UNMATCHED', difficulty: 'Easy', testSplit: 'Test', domainRationale: 'No instrumentation activity exists' },
  { caseId: 'B024', caseType: 'Unmatched scope', fieldReport: 'Temporary access road repaired near Tank Farm.', expectedActivityId: null, expectedDecision: 'UNMATCHED', difficulty: 'Easy', testSplit: 'Test', domainRationale: 'Unplanned supporting work' },
  { caseId: 'B025', caseType: 'Unmatched asset', fieldReport: 'P106 spool erected at Rack 3.', expectedActivityId: null, expectedDecision: 'UNMATCHED', difficulty: 'Medium', testSplit: 'Test', domainRationale: 'Similar work but asset is outside the baseline' },
  { caseId: 'B026', caseType: 'Negative semantic trap', fieldReport: 'P104 spool fabrication completed in the yard.', expectedActivityId: 'PIP-321', expectedDecision: 'MATCH', difficulty: 'Medium', testSplit: 'Train', domainRationale: 'Must not confuse fabrication with field erection' },
  { caseId: 'B027', caseType: 'Test-medium trap', fieldReport: 'P105 air pressure test completed at Rack 3.', expectedActivityId: 'PIP-329', expectedDecision: 'MATCH', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Air implies pneumatic, not P104 hydrotest' },
  { caseId: 'B028', caseType: 'Negation', fieldReport: 'P104 erection has not started at Rack 3.', expectedActivityId: 'PIP-324', expectedDecision: 'MATCH', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Link activity but extract NOT_STARTED; do not post actual start' },
  { caseId: 'B029', caseType: 'Tentative report', fieldReport: 'Crew plans to erect P104 at Rack 3 tomorrow.', expectedActivityId: 'PIP-324', expectedDecision: 'MATCH', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Future plan is not an actual execution event' },
  { caseId: 'B030', caseType: 'Mixed update', fieldReport: 'P104 supports are complete and spool erection started at Rack 3.', expectedActivityId: null, expectedDecision: 'REVIEW', difficulty: 'Hard', testSplit: 'Test', domainRationale: 'Contains two events mapping to PIP-322 and PIP-324; extractor should split' },
];
