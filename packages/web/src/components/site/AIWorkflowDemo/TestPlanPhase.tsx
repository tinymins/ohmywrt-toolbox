import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const TestPlanPhase = () => {
  const { t } = useTranslation();
  const moduleData = t("aiWorkflow.testPlan.modules", {
    returnObjects: true,
  }) as unknown as { module: string; priority: string; items: string[] }[];
  const modules = [
    { ...moduleData[0], cases: 32, color: "sky" },
    { ...moduleData[1], cases: 48, color: "violet" },
    { ...moduleData[2], cases: 28, color: "rose" },
    { ...moduleData[3], cases: 36, color: "emerald" },
    { ...moduleData[4], cases: 24, color: "amber" },
    { ...moduleData[5], cases: 18, color: "cyan" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 p-6"
    >
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/20 text-2xl">
            📋
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t("aiWorkflow.testPlan.title")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.testPlan.desc")}
            </p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
            ✓ {t("aiWorkflow.testPlan.complete")}
          </span>
        </div>

        {/* Test Plan Grid */}
        <div className="grid flex-1 grid-cols-3 gap-4">
          {modules.map((plan, i) => (
            <motion.div
              key={plan.module}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15 }}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-800 dark:text-slate-200">
                  {plan.module}
                </h4>
                <span
                  className={`rounded-full bg-${plan.color}-100 px-2 py-0.5 text-[10px] font-medium text-${plan.color}-700 dark:bg-${plan.color}-950 dark:text-${plan.color}-300`}
                >
                  {plan.priority}
                </span>
              </div>
              <p
                className={`mt-2 text-2xl font-bold text-${plan.color}-600 dark:text-${plan.color}-400`}
              >
                {plan.cases}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("aiWorkflow.testPlan.testCases")}
              </p>
              <div className="mt-3 space-y-1">
                {plan.items.map((item, j) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 + j * 0.1 }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span
                      className={`h-1 w-1 rounded-full bg-${plan.color}-500`}
                    />
                    {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
