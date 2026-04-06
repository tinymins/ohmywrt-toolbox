import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  Collapse,
  Descriptions,
  Tag,
} from "@acme/components";
import type { ProxyDebugStep } from "@acme/types";
import { useTranslation } from "react-i18next";

type RuleSetsStep = Extract<ProxyDebugStep, { type: "rule-sets" }>;
type RuleSetItem = RuleSetsStep["data"]["items"][number];

/** 规则内容代码块 */
const RuleCodeBlock = ({
  rules,
  truncated,
  totalCount,
}: {
  rules: string[];
  truncated?: boolean;
  totalCount: number;
}) => (
  <div>
    <pre className="!m-0 !p-3 !text-xs !bg-gray-50 dark:!bg-gray-900 !rounded-md !overflow-auto !whitespace-pre-wrap !break-all !font-mono max-h-[300px]">
      {rules.join("\n")}
    </pre>
    {truncated && (
      <div className="text-xs text-slate-400 mt-1 pl-1">
        … {totalCount - rules.length} more rules not shown
      </div>
    )}
  </div>
);

/** 单个规则集项 */
const RuleSetItemContent = ({ item }: { item: RuleSetItem }) => {
  const { t } = useTranslation();

  if (item.builtin) {
    return (
      <div className="text-xs text-slate-500">
        {t("proxy.debug.ruleSetBuiltinHint")}
      </div>
    );
  }

  if (item.status === "error") {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-xs text-red-500 font-mono break-all">
          {item.error}
        </div>
        <div className="text-xs text-slate-400 break-all">{item.url}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-slate-400 break-all">{item.url}</div>
      {item.effectiveUrl && item.effectiveUrl !== item.url && (
        <div className="text-xs text-slate-400 break-all">
          <span className="text-slate-500">
            {t("proxy.debug.ruleSetEffectiveUrl")}:{" "}
          </span>
          {item.effectiveUrl}
        </div>
      )}
      {item.sampleRules && item.sampleRules.length > 0 && (
        <RuleCodeBlock
          rules={item.sampleRules}
          truncated={item.truncated}
          totalCount={item.ruleCount}
        />
      )}
    </div>
  );
};

/** 单个规则集 Collapse 头部 */
const RuleSetItemLabel = ({ item }: { item: RuleSetItem }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 items-center flex-wrap">
      <span className="font-mono text-xs">{item.tag}</span>
      {item.status === "ok" && (
        <Tag color="green" className="!text-xs">
          {item.ruleCount} {t("proxy.debug.ruleSetRulesUnit")}
        </Tag>
      )}
      {item.status === "skipped" && (
        <Tag className="!text-xs">
          {item.format === "binary" ? "binary" : "skipped"}
        </Tag>
      )}
      {item.status === "error" && (
        <Tag color="error" className="!text-xs">
          {item.error ?? t("proxy.debug.error")}
        </Tag>
      )}
      {item.truncated && (
        <Tag className="!text-xs">{t("proxy.debug.ruleSetTruncated")}</Tag>
      )}
    </div>
  );
};

/** 按分组聚合规则集 */
function groupByGroup(items: RuleSetItem[]) {
  const groups: Map<string, RuleSetItem[]> = new Map();
  for (const item of items) {
    const key = item.group;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(item);
  }
  return groups;
}

/** 规则集调试步骤 */
export const RuleSetsStepContent = ({ step }: { step: RuleSetsStep }) => {
  const { t } = useTranslation();
  const { data } = step;
  const grouped = groupByGroup(data.items);

  return (
    <div className="flex flex-col gap-2">
      <Descriptions
        size="small"
        column={3}
        bordered
        items={[
          {
            label: t("proxy.debug.ruleSetCount"),
            children: <Tag color="purple">{data.totalCount}</Tag>,
          },
          {
            label: t("proxy.debug.ruleSetTotalRules"),
            children: <Tag color="cyan">{data.totalRules}</Tag>,
          },
          {
            label: t("proxy.debug.ruleSetErrors"),
            children:
              data.errorCount > 0 ? (
                <Tag color="error">
                  <CloseCircleOutlined className="mr-1" />
                  {data.errorCount}
                </Tag>
              ) : (
                <Tag color="green">
                  <CheckCircleOutlined className="mr-1" />0
                </Tag>
              ),
          },
        ]}
      />

      <Collapse
        size="small"
        items={Array.from(grouped.entries()).map(([groupName, items]) => {
          const groupRuleCount = items.reduce(
            (sum, item) => sum + item.ruleCount,
            0,
          );
          const groupErrorCount = items.filter(
            (item) => item.status === "error",
          ).length;

          return {
            key: groupName,
            label: (
              <div className="flex gap-2 items-center flex-wrap">
                <span>{groupName}</span>
                <Tag className="!text-xs">
                  {items.length} {t("proxy.debug.ruleSetSetsUnit")}
                </Tag>
                <Tag color="cyan" className="!text-xs">
                  {groupRuleCount} {t("proxy.debug.ruleSetRulesUnit")}
                </Tag>
                {groupErrorCount > 0 && (
                  <Tag color="error" className="!text-xs">
                    {groupErrorCount} {t("proxy.debug.error")}
                  </Tag>
                )}
              </div>
            ),
            children: (
              <Collapse
                size="small"
                items={items.map((item) => ({
                  key: item.tag,
                  label: <RuleSetItemLabel item={item} />,
                  children: <RuleSetItemContent item={item} />,
                }))}
              />
            ),
          };
        })}
      />
    </div>
  );
};
