import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { networkApi } from "@/generated/rust-api/network";
import { message } from "@/lib/message";

const PAGE_SIZE = 200;

function DataListCard({
  title,
  description,
  countLabel,
  searchPlaceholder,
  data,
  isLoading,
}: {
  title: string;
  description: string;
  countLabel: string;
  searchPlaceholder: string;
  data: { count: number; items: string[] } | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [showCount, setShowCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    if (!search.trim()) return data.items;
    const q = search.trim().toLowerCase();
    return data.items.filter((item) => item.toLowerCase().includes(q));
  }, [data?.items, search]);

  const displayed = filtered.slice(0, showCount);

  const handleCopyAll = async () => {
    if (!filtered.length) return;
    try {
      await navigator.clipboard.writeText(filtered.join("\n"));
      message.success(t("network.copySuccess"));
    } catch {
      message.error(t("network.copyFailed"));
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">{description}</p>
          </div>
          {data && (
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--primary)]">
                {data.count.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {countLabel}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-2 border-b border-[var(--border)] p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowCount(PAGE_SIZE);
          }}
          placeholder={searchPlaceholder}
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCopyAll}
          disabled={!filtered.length}
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("network.copyAll")}
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-[var(--text-muted)]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            <span className="ml-2">{t("network.loading")}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">
            {t("network.noResults")}
          </div>
        ) : (
          <>
            <div className="mb-2 text-xs text-[var(--text-muted)]">
              {t("network.showing")} {displayed.length} {t("network.of")}{" "}
              {filtered.length} {t("network.items")}
            </div>
            <div className="max-h-96 overflow-y-auto rounded-md bg-[var(--bg-secondary)] p-2">
              <pre className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {displayed.join("\n")}
              </pre>
            </div>
            {showCount < filtered.length && (
              <button
                type="button"
                onClick={() => setShowCount((c) => c + PAGE_SIZE)}
                className="mt-2 w-full rounded-md border border-[var(--border)] py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
              >
                {t("network.showMore")} ({filtered.length - showCount}{" "}
                {t("network.items")})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function NetworkToolsPage() {
  const { t } = useTranslation();

  const geoip = networkApi.geoipCn.useQuery();
  const geosite = networkApi.geositeCn.useQuery();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
        {t("network.title")}
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
          <div className="text-3xl font-bold text-[var(--primary)]">
            {geoip.data?.count.toLocaleString() ?? "—"}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {t("network.geoip.count")}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-center">
          <div className="text-3xl font-bold text-[var(--primary)]">
            {geosite.data?.count.toLocaleString() ?? "—"}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {t("network.geosite.count")}
          </div>
        </div>
      </div>

      {/* Data Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DataListCard
          title={t("network.geoip.title")}
          description={t("network.geoip.description")}
          countLabel={t("network.geoip.count")}
          searchPlaceholder={t("network.geoip.searchPlaceholder")}
          data={geoip.data}
          isLoading={geoip.isLoading}
        />
        <DataListCard
          title={t("network.geosite.title")}
          description={t("network.geosite.description")}
          countLabel={t("network.geosite.count")}
          searchPlaceholder={t("network.geosite.searchPlaceholder")}
          data={geosite.data}
          isLoading={geosite.isLoading}
        />
      </div>
    </div>
  );
}
