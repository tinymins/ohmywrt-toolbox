import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const GeneratePage5 = () => {
  const { t } = useTranslation();
  const iosDevices = t("aiWorkflow.generate.iosDevices", {
    returnObjects: true,
  }) as unknown as string[];
  const androidDevices = t("aiWorkflow.generate.androidDevices", {
    returnObjects: true,
  }) as unknown as string[];
  const casesLabel = t("aiWorkflow.generate.cases");

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
          5
        </span>
        📱 {t("aiWorkflow.generate.step5")}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍎</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("aiWorkflow.generate.iosPlatform")}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {iosDevices.map((device, i) => (
              <motion.div
                key={device}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-900"
              >
                <span className="text-slate-600 dark:text-slate-400">
                  {device}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  32 {casesLabel}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t("aiWorkflow.generate.androidPlatform")}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {androidDevices.map((device, i) => (
              <motion.div
                key={device}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm dark:bg-slate-900"
              >
                <span className="text-slate-600 dark:text-slate-400">
                  {device}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  35 {casesLabel}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
