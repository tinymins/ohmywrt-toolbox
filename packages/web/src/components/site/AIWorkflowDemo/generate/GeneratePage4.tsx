import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const GeneratePage4 = () => {
  const { t } = useTranslation();
  const browsers = t("aiWorkflow.generate.browsers", {
    returnObjects: true,
  }) as unknown as { browser: string; version: string }[];
  const browserTests = t("aiWorkflow.generate.browserTests", {
    returnObjects: true,
  }) as unknown as string[];
  const browsersWithData = [
    { ...browsers[0], icon: "🌐", cases: 128 },
    { ...browsers[1], icon: "🦊", cases: 128 },
    { ...browsers[2], icon: "🧭", cases: 96 },
    { ...browsers[3], icon: "🌊", cases: 86 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-xs text-white">
          4
        </span>
        🖥️ {t("aiWorkflow.generate.step4")}
      </h4>
      <div className="grid grid-cols-4 gap-2">
        {browsersWithData.map((b, i) => (
          <motion.div
            key={b.browser}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center dark:border-violet-900 dark:bg-violet-950/30"
          >
            <span className="text-2xl">{b.icon}</span>
            <p className="mt-1 text-sm font-medium text-violet-700 dark:text-violet-300">
              {b.browser}
            </p>
            <p className="text-xs text-violet-500 dark:text-violet-400">
              {b.version}
            </p>
            <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">
              {b.cases}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {browserTests.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {item}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
