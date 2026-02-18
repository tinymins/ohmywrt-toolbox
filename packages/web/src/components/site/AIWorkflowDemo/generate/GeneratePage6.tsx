import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const cardStyles = [
  {
    icon: "🌐",
    border: "border-sky-200 dark:border-sky-900",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-600 dark:text-sky-400",
  },
  {
    icon: "🖥️",
    border: "border-violet-200 dark:border-violet-900",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: "🍎",
    border: "border-slate-200 dark:border-slate-700",
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
  },
  {
    icon: "🤖",
    border: "border-emerald-200 dark:border-emerald-900",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: "⚡",
    border: "border-amber-200 dark:border-amber-900",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
];

export const GeneratePage6 = () => {
  const { t } = useTranslation();
  const types = t("aiWorkflow.generate.summary.types", {
    returnObjects: true,
  }) as unknown as { type: string; count: number }[];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
          ✓
        </span>
        🎉 {t("aiWorkflow.generate.step6")}
      </h4>
      <div className="grid grid-cols-5 gap-3">
        {types.map((item, i) => {
          const style = cardStyles[i];
          return (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
              className={`rounded-xl border p-3 text-center ${style.border} ${style.bg}`}
            >
              <span className="text-2xl">{style.icon}</span>
              <p className={`mt-1 text-2xl font-bold ${style.text}`}>
                {item.count}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.type}
              </p>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-center text-white"
      >
        <p className="text-2xl font-bold">
          {t("aiWorkflow.generate.summary.total")}
        </p>
        <p className="text-sm opacity-90">
          {t("aiWorkflow.generate.summary.readyToExecute")}
        </p>
      </motion.div>
    </motion.div>
  );
};
