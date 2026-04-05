import { Button, Card, Spin, Tag } from "@acme/components";
import { Copy, Network, Search } from "lucide-react";
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
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
          {data && (
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {data.count.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {countLabel}
              </div>
            </div>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              size={14}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowCount(PAGE_SIZE);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <Button
            variant="default"
            size="small"
            icon={<Copy size={14} />}
            onClick={handleCopyAll}
            disabled={!filtered.length}
          >
            {t("network.copyAll")}
          </Button>
        </div>

        {/* Content */}
        <Spin spinning={isLoading}>
          {!isLoading && filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              {t("network.noResults")}
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("network.showing")} {displayed.length} {t("network.of")}{" "}
                  {filtered.length} {t("network.items")}
                </span>
                {search && (
                  <Tag color="purple" className="!text-xs">
                    {t("network.filtered")}
                  </Tag>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <pre className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                  {displayed.join("\n")}
                </pre>
              </div>
              {showCount < filtered.length && (
                <Button
                  variant="default"
                  size="small"
                  className="mt-2 w-full"
                  onClick={() => setShowCount((c) => c + PAGE_SIZE)}
                >
                  {t("network.showMore")} ({filtered.length - showCount}{" "}
                  {t("network.items")})
                </Button>
              )}
            </>
          )}
        </Spin>
      </div>
    </Card>
  );
}

export function NetworkToolsPage() {
  const { t } = useTranslation();

  const geoip = networkApi.geoipCn.useQuery();
  const geosite = networkApi.geositeCn.useQuery();

  return (
    <div>
      {/* Intro Banner */}
      <div className="mb-5 rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-5 dark:border-purple-800/30 dark:from-purple-950/20 dark:to-pink-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 dark:bg-purple-500/25">
            <Network
              className="text-purple-600 dark:text-purple-400"
              size={22}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
              {t("network.intro.headline")}
            </h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t("network.intro.description")}
            </p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
        {t("network.title")}
      </h2>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {geoip.data?.count.toLocaleString() ?? "—"}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("network.geoip.count")}
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
              {geosite.data?.count.toLocaleString() ?? "—"}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("network.geosite.count")}
            </div>
          </div>
        </Card>
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
