import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  GeneratePage1,
  GeneratePage2,
  GeneratePage3,
  GeneratePage4,
  GeneratePage5,
  GeneratePage6,
} from "./generate";
import type { SubPhaseProps } from "./types";

export const GenerateCasesPhase = ({ subPhase }: SubPhaseProps) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 p-6"
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-2xl"
          >
            ✨
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t("aiWorkflow.generate.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.generate.desc")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.generate.page")} {Math.min(subPhase + 1, 6)}/6
            </span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${subPhase >= i ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Test Case Generation Pages */}
        <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <AnimatePresence mode="wait">
            {subPhase === 0 && <GeneratePage1 key="p1" />}
            {subPhase === 1 && <GeneratePage2 key="p2" />}
            {subPhase === 2 && <GeneratePage3 key="p3" />}
            {subPhase === 3 && <GeneratePage4 key="p4" />}
            {subPhase === 4 && <GeneratePage5 key="p5" />}
            {subPhase >= 5 && <GeneratePage6 key="p6" />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
