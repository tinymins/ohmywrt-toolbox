import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AIWorkflowDemo } from "./AIWorkflowDemo";

const SectionTitle = ({ title, desc }: { title: string; desc?: string }) => (
  <div className="space-y-4 text-center">
    <h2 className="text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
    {desc ? (
      <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
        {desc}
      </p>
    ) : null}
  </div>
);

const featureClasses = [
  "from-sky-500/20 to-blue-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-violet-500/20 to-purple-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-cyan-500/20 to-sky-500/20",
];

export default function HomePage() {
  const { t } = useTranslation();
  const metrics = t("hero.metrics", { returnObjects: true }) as {
    label: string;
    value: string;
  }[];
  const _consoleLines = t("hero.consoleLines", {
    returnObjects: true,
  }) as string[];
  const overviewCards = t("overview.cards", { returnObjects: true }) as {
    title: string;
    desc: string;
    bullets: string[];
  }[];
  const pillars = t("pillars.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];
  const flowSteps = t("flow.steps", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];
  const aiItems = t("ai.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];
  const integrations = t("integrations.items", {
    returnObjects: true,
  }) as string[];
  const securityItems = t("security.items", {
    returnObjects: true,
  }) as string[];

  return (
    <div className="space-y-32">
      {/* Hero Section - Next.js Style */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.3),transparent)]" />
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500/30 via-transparent to-cyan-500/30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-24 text-center md:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
              </span>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {t("hero.badge")}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl">
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-white">
                {t("hero.title")}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-xl text-slate-600 dark:text-slate-400 md:text-2xl">
              {t("hero.subtitle")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-lg font-medium text-white transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                {t("hero.primary")}
                <svg
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-8 py-4 text-lg font-medium text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                type="button"
              >
                {t("hero.secondary")}
              </button>
            </div>

            {/* Dashboard Preview - Full AI Workflow Demo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mx-auto mt-12 max-w-5xl"
            >
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-sky-500/20 via-violet-500/20 to-emerald-500/20 opacity-50 blur-2xl" />
                <AIWorkflowDemo />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Metrics Bar */}
        <div className="border-y border-slate-200 bg-white/50 backdrop-blur dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {metric.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-6">
        <SectionTitle
          title={t("overview.title")}
          desc={t("overview.description")}
        />
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {overviewCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/20"
            >
              <div
                className={`absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br ${featureClasses[index % featureClasses.length]} opacity-50 blur-3xl transition-opacity group-hover:opacity-100`}
              />
              <div className="relative space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-2xl font-bold">{card.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {card.desc}
                </p>
                <ul className="space-y-2 pt-2">
                  {card.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pillars Section */}
      <section className="mx-auto max-w-6xl px-6" id="solutions">
        <SectionTitle title={t("pillars.title")} />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {pillars.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${featureClasses[index % featureClasses.length]}`}
              >
                <span className="text-lg">✦</span>
              </div>
              <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Testing Capabilities Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9nPjwvc3ZnPg==')] opacity-50" />
        </div>

        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {t("testing.badge")}
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white md:text-5xl">
              {t("testing.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              {t("testing.desc")}
            </p>
          </motion.div>

          {/* Testing Capabilities Grid */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const capabilities = t("testing.capabilities", {
                returnObjects: true,
              });
              const capabilitiesArray = Array.isArray(capabilities)
                ? capabilities
                : [];
              return capabilitiesArray.map(
                (
                  capability: { title: string; desc: string },
                  index: number,
                ) => {
                  // Icon mapping based on index (matches capabilities array order in i18n)
                  const icons: React.ReactNode[] = [
                    <svg
                      key="icon-globe"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>,
                    <svg
                      key="icon-code"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>,
                    <svg
                      key="icon-mobile"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>,
                    <svg
                      key="icon-desktop"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>,
                    <svg
                      key="icon-chip"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                      />
                    </svg>,
                    <svg
                      key="icon-bulb"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>,
                  ];

                  // Color mapping based on index
                  const colors = [
                    "sky",
                    "violet",
                    "emerald",
                    "amber",
                    "rose",
                    "cyan",
                  ];
                  const color = colors[index % colors.length];

                  const colorMap: Record<
                    string,
                    { bg: string; border: string; text: string; glow: string }
                  > = {
                    sky: {
                      bg: "bg-sky-500/10",
                      border: "border-sky-500/30",
                      text: "text-sky-400",
                      glow: "group-hover:shadow-sky-500/20",
                    },
                    violet: {
                      bg: "bg-violet-500/10",
                      border: "border-violet-500/30",
                      text: "text-violet-400",
                      glow: "group-hover:shadow-violet-500/20",
                    },
                    emerald: {
                      bg: "bg-emerald-500/10",
                      border: "border-emerald-500/30",
                      text: "text-emerald-400",
                      glow: "group-hover:shadow-emerald-500/20",
                    },
                    amber: {
                      bg: "bg-amber-500/10",
                      border: "border-amber-500/30",
                      text: "text-amber-400",
                      glow: "group-hover:shadow-amber-500/20",
                    },
                    rose: {
                      bg: "bg-rose-500/10",
                      border: "border-rose-500/30",
                      text: "text-rose-400",
                      glow: "group-hover:shadow-rose-500/20",
                    },
                    cyan: {
                      bg: "bg-cyan-500/10",
                      border: "border-cyan-500/30",
                      text: "text-cyan-400",
                      glow: "group-hover:shadow-cyan-500/20",
                    },
                  };
                  const colorStyles = colorMap[color];
                  const icon = icons[index] || icons[icons.length - 1];

                  return (
                    <motion.div
                      key={capability.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className={`group rounded-2xl border ${colorStyles.border} ${colorStyles.bg} p-6 backdrop-blur transition-all hover:shadow-xl ${colorStyles.glow}`}
                    >
                      <div
                        className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${colorStyles.bg} ${colorStyles.text}`}
                      >
                        {icon}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">
                        {capability.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {capability.desc}
                      </p>
                    </motion.div>
                  );
                },
              );
            })()}
          </div>

          {/* AI Flow Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 text-center">
              {(Array.isArray(t("testing.aiFlowSteps", { returnObjects: true }))
                ? (t("testing.aiFlowSteps", { returnObjects: true }) as Array<{
                    step: string;
                    icon: string;
                  }>)
                : []
              ).map((item, index, arr) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-2xl shadow-lg">
                      {item.icon}
                    </div>
                    <span className="mt-2 text-sm font-medium text-slate-300">
                      {item.step}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <svg
                      className="h-5 w-5 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="relative mx-auto max-w-6xl px-6" id="workflow">
        <SectionTitle title={t("flow.title")} />

        {/* Connection Line */}
        <div className="absolute left-1/2 top-48 hidden h-[calc(100%-14rem)] w-px -translate-x-1/2 bg-gradient-to-b from-sky-500/50 via-violet-500/50 to-emerald-500/50 md:block lg:hidden" />

        <div className="relative mt-16">
          {/* Horizontal Connection Line for Desktop */}
          <div className="absolute left-0 right-0 top-10 hidden h-1 bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-500 opacity-20 lg:block" />

          <div className="grid gap-8 md:grid-cols-3">
            {flowSteps.map((step, index) => {
              const gradients = [
                "from-sky-500 to-blue-600",
                "from-violet-500 to-purple-600",
                "from-emerald-500 to-teal-600",
                "from-amber-500 to-orange-600",
                "from-rose-500 to-pink-600",
                "from-cyan-500 to-sky-600",
              ];
              const glowColors = [
                "shadow-sky-500/30",
                "shadow-violet-500/30",
                "shadow-emerald-500/30",
                "shadow-amber-500/30",
                "shadow-rose-500/30",
                "shadow-cyan-500/30",
              ];

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                  className="group relative"
                >
                  <div className="relative rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                    {/* Gradient Number Circle */}
                    <div className="relative mb-5">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} text-xl font-bold text-white shadow-lg ${glowColors[index % glowColors.length]} transition-transform group-hover:scale-110`}
                      >
                        {index + 1}
                      </div>
                      {/* Decorative Ring */}
                      <div
                        className={`absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-br ${gradients[index % gradients.length]} opacity-20 blur-sm`}
                      />
                    </div>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                      {step.desc}
                    </p>

                    {/* Arrow Connector */}
                    {index < flowSteps.length - 1 && (
                      <div className="absolute -right-4 top-10 hidden text-slate-300 dark:text-slate-700 lg:block">
                        <svg
                          className="h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="relative overflow-hidden" id="ai">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950" />
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionTitle title={t("ai.title")} />
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {aiItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="group rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${featureClasses[index % featureClasses.length]}`}
                >
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations & Security */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-2xl font-bold">{t("integrations.title")}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Seamlessly connect with your existing tools
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {integrations.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-2xl font-bold">{t("security.title")}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Enterprise-grade security and compliance
            </p>
            <ul className="mt-6 space-y-4">
              {securityItems.map((item, index) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 text-slate-600 dark:text-slate-400"
                >
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-sky-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-6" id="plans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[32px] bg-slate-900 px-8 py-16 text-center dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 md:px-16 md:py-20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.15),transparent_50%)]" />
          <div className="relative space-y-6">
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto max-w-xl text-lg text-slate-300">
              {t("cta.desc")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-medium text-slate-900 transition-all hover:bg-slate-100"
                type="button"
              >
                {t("cta.primary")}
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-lg font-medium text-white transition-all hover:bg-white/10"
              >
                {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Final Section */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 md:p-12"
        >
          <div className="absolute right-8 top-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="h-20 w-20 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="max-w-xl space-y-4">
            <h3 className="text-2xl font-bold md:text-3xl">
              {t("closing.title")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {t("closing.subtitle")}
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 dark:text-sky-400"
            >
              Get Started
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
