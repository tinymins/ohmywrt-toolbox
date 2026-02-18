import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const GeneratePage1 = () => {
  const { t } = useTranslation();
  const scenarios = t("aiWorkflow.generate.scenarios", {
    returnObjects: true,
  }) as unknown as { scenario: string; desc: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
          1
        </span>
        🎯 {t("aiWorkflow.generate.step1")}
      </h4>
      <div className="space-y-2">
        {scenarios.map((item, i) => {
          const status = i < 2 ? "done" : i === 2 ? "doing" : "pending";
          return (
            <motion.div
              key={item.scenario}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              {status === "done" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
                  ✓
                </span>
              )}
              {status === "doing" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="h-5 w-5 rounded-full border-2 border-amber-500 border-t-transparent"
                />
              )}
              {status === "pending" && (
                <span className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {item.scenario}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
