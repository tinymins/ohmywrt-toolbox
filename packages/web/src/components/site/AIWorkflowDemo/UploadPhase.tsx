import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const UploadPhase = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 flex items-center justify-center p-8"
    >
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white/90 p-10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-4xl shadow-lg"
            >
              📄
            </motion.div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {t("aiWorkflow.upload.title")}
            </h3>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              {t("aiWorkflow.upload.desc")}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-slate-400">
              <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                PDF
              </span>
              <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                Word
              </span>
              <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                Markdown
              </span>
              <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                Excel
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-3 font-medium text-white shadow-lg shadow-sky-500/30"
              type="button"
            >
              {t("aiWorkflow.upload.selectFile")}
            </motion.button>
          </div>

          {/* File Drop Animation */}
          <motion.div
            initial={{ opacity: 0, y: -80, x: 80, rotate: -10 }}
            animate={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
            transition={{ type: "spring", delay: 0.8 }}
            className="absolute inset-x-8 bottom-6 flex items-center gap-4 rounded-xl border-2 border-sky-500 bg-sky-50 p-4 shadow-xl dark:bg-sky-950/80"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-2xl">
              📕
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                {t("aiWorkflow.upload.sampleFile")}
              </p>
              <p className="text-sm text-slate-400">
                {t("aiWorkflow.upload.sampleMeta")}
              </p>
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="h-6 w-6 rounded-full border-2 border-sky-500 border-t-transparent"
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};
