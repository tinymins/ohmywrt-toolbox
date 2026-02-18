import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const GeneratePage2 = () => {
  const { t } = useTranslation();
  const boundaries = t("aiWorkflow.generate.boundaries", {
    returnObjects: true,
  }) as unknown as {
    field: string;
    min: string;
    max: string;
    special: string;
  }[];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
          2
        </span>
        ⚠️ {t("aiWorkflow.generate.step2")}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {boundaries.map((item, i) => (
          <motion.div
            key={item.field}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {item.field}
            </p>
            <div className="mt-1 flex gap-2 text-xs">
              <span className="rounded bg-white px-1.5 py-0.5 dark:bg-slate-800 dark:text-slate-300">
                Min: {item.min}
              </span>
              <span className="rounded bg-white px-1.5 py-0.5 dark:bg-slate-800 dark:text-slate-300">
                Max: {item.max}
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {item.special}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
