import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnalyzingPhase } from "./AnalyzingPhase";
import { PHASE_DURATIONS, TOTAL_DURATION } from "./constants";
import { ExecutePhase } from "./ExecutePhase";
import { GenerateCasesPhase } from "./GenerateCasesPhase";
import { ReportPhase } from "./ReportPhase";
import { TestPlanPhase } from "./TestPlanPhase";
import { UploadPhase } from "./UploadPhase";

export const AIWorkflowDemo = () => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState(0);
  const [subPhase, setSubPhase] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Main phase controller using a single interval
  useEffect(() => {
    const updatePhase = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const cycleTime = elapsed % TOTAL_DURATION;

      let accum = 0;
      let newPhase = 0;

      // Phase 1: Upload
      accum += PHASE_DURATIONS.upload;
      if (cycleTime < accum) {
        newPhase = 1;
      } else {
        // Phase 2: Analyzing
        accum += PHASE_DURATIONS.analyzing;
        if (cycleTime < accum) {
          newPhase = 2;
        } else {
          // Phase 3: Test Plan
          accum += PHASE_DURATIONS.testPlan;
          if (cycleTime < accum) {
            newPhase = 3;
          } else {
            // Phase 4: Generate Cases
            accum += PHASE_DURATIONS.generateCases;
            if (cycleTime < accum) {
              newPhase = 4;
              const phaseStart = accum - PHASE_DURATIONS.generateCases;
              const phaseElapsed = cycleTime - phaseStart;
              setSubPhase(Math.floor(phaseElapsed / 2400)); // 6 sub-phases, 2.4s each
            } else {
              // Phase 5: Execute
              accum += PHASE_DURATIONS.execute;
              if (cycleTime < accum) {
                newPhase = 5;
                const phaseStart = accum - PHASE_DURATIONS.execute;
                const phaseElapsed = cycleTime - phaseStart;
                setSubPhase(Math.floor(phaseElapsed / 2000)); // 8 sub-phases, 2s each
              } else {
                // Phase 6: Report
                newPhase = 6;
                const phaseStart = accum;
                const phaseElapsed = cycleTime - phaseStart;
                setSubPhase(Math.floor(phaseElapsed / 1500)); // 6 sub-phases
              }
            }
          }
        }
      }

      setPhase(newPhase);
    };

    updatePhase();
    intervalRef.current = setInterval(updatePhase, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
      {/* Browser Chrome */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="ml-2 flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>testops.example.com/dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Phase Indicators */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((p) => (
              <div
                key={p}
                className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                  phase >= p
                    ? "bg-emerald-500"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t("aiWorkflow.aiAutoProcess")}
          </motion.span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[600px] overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        {/* Background Grid */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(51,65,85,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.3)_1px,transparent_1px)] bg-[size:20px_20px]" />

        <AnimatePresence mode="wait">
          {/* Phase 1: Upload */}
          {phase === 1 && <UploadPhase key="upload" />}

          {/* Phase 2: Analyzing */}
          {phase === 2 && <AnalyzingPhase key="analyzing" />}

          {/* Phase 3: Test Plan */}
          {phase === 3 && <TestPlanPhase key="testplan" />}

          {/* Phase 4: Generate Cases */}
          {phase === 4 && (
            <GenerateCasesPhase key="generate" subPhase={subPhase} />
          )}

          {/* Phase 5: Execute */}
          {phase === 5 && <ExecutePhase key="execute" subPhase={subPhase} />}

          {/* Phase 6: Report */}
          {phase === 6 && <ReportPhase key="report" />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIWorkflowDemo;
