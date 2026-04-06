import {
  ChevronRight,
  Clock,
  Globe,
  Link2,
  Plus,
  Settings,
  Wifi,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { proxyApi } from "@/generated/rust-api/proxy";
import { useAuth, useWorkspace } from "@/hooks";

function formatDate(dateStr: string | null, t: (k: string) => string): string {
  if (!dateStr) return t("dashboard.overview.neverAccessed");
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div className="glass glass-accent p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)]">
          {loading ? "—" : value}
        </p>
      </div>
    </div>
  );
}

function QuickActionItem({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 w-full p-4 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left cursor-pointer"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {title}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0" />
    </button>
  );
}

export default function WorkspaceOverview() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const { workspace: workspaceSlug } = useParams<{ workspace: string }>();

  const { data: stats, isLoading: statsLoading } =
    proxyApi.getUserStats.useQuery();
  const { data: subscriptions, isLoading: subsLoading } =
    proxyApi.list.useQuery();

  const basePath = `/dashboard/${workspaceSlug ?? workspace.slug}`;

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          {t("dashboard.overview.title")}
        </h1>
        <p className="text-[var(--text-secondary)]">
          {t("dashboard.overview.welcomeBack", {
            name: user?.name || user?.email || "",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Globe size={20} className="text-[var(--accent-text)]" />}
          label={t("dashboard.overview.totalSubscriptions")}
          value={stats?.totalSubscriptions ?? 0}
          loading={statsLoading}
        />
        <StatCard
          icon={<Link2 size={20} className="text-[var(--accent-text)]" />}
          label={t("dashboard.overview.activeNodes")}
          value={stats?.totalNodes ?? 0}
          loading={statsLoading}
        />
        <StatCard
          icon={<Clock size={20} className="text-[var(--accent-text)]" />}
          label={t("dashboard.overview.todayRequests")}
          value={stats?.todayRequests ?? 0}
          loading={statsLoading}
        />
      </div>

      {/* Main content: Proxy overview + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Proxy overview — wider */}
        <div className="lg:col-span-3 glass glass-accent p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("dashboard.overview.proxyOverview")}
            </h2>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/proxy`)}
              className="text-sm text-[var(--accent-text)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {t("dashboard.overview.viewAll")}
              <ChevronRight size={14} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {t("dashboard.overview.viewAllDesc")}
          </p>

          {subsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-[var(--bg-hover)] animate-pulse"
                />
              ))}
            </div>
          ) : !subscriptions?.length ? (
            <div className="text-center py-8">
              <p className="text-[var(--text-muted)] text-sm">
                {t("dashboard.overview.noSubscriptions")}
              </p>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                {t("dashboard.overview.noSubscriptionsDesc")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.slice(0, 5).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => navigate(`${basePath}/proxy`)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Globe size={18} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {sub.remark || sub.id}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {t("dashboard.overview.createdBy", {
                        name: sub.user?.name || sub.user?.email || "—",
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    {formatDate(sub.lastAccessAt, t)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions — narrower */}
        <div className="lg:col-span-2 glass glass-accent p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            {t("dashboard.overview.quickActions")}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {t("dashboard.overview.quickActionsDesc")}
          </p>

          <div className="space-y-1">
            <QuickActionItem
              icon={<Plus size={18} className="text-[var(--accent-text)]" />}
              title={t("dashboard.overview.createSubscription")}
              desc={t("dashboard.overview.createSubscriptionDesc")}
              onClick={() => navigate(`${basePath}/proxy`)}
            />
            <QuickActionItem
              icon={
                <Settings size={18} className="text-[var(--accent-text)]" />
              }
              title={t("dashboard.overview.manageSubscriptions")}
              desc={t("dashboard.overview.manageSubscriptionsDesc")}
              onClick={() => navigate(`${basePath}/proxy`)}
            />
            <QuickActionItem
              icon={<Wifi size={18} className="text-[var(--accent-text)]" />}
              title={t("dashboard.overview.networkTools")}
              desc={t("dashboard.overview.networkToolsDesc")}
              onClick={() => navigate(`${basePath}/network`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
