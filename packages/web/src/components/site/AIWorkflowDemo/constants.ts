// Phase durations in milliseconds
export const PHASE_DURATIONS = {
  upload: 4000,
  analyzing: 4000,
  testPlan: 4000,
  generateCases: 14400,
  execute: 16000,
  report: 10000,
};

export const TOTAL_DURATION = Object.values(PHASE_DURATIONS).reduce(
  (a, b) => a + b,
  0,
);
