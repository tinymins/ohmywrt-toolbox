import {
  AutoComplete,
  Button,
  Checkbox,
  DeleteOutlined,
  HolderOutlined,
  Input,
  InputNumber,
  Modal,
  PlayCircleOutlined,
  PlusOutlined,
  Tooltip,
} from "@acme/components";
import type { SubscribeItem } from "@acme/types";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Server,
  XCircle,
} from "lucide-react";

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { proxyApi } from "@/generated/rust-api";

interface Props {
  value?: SubscribeItem[];
  onChange?: (items: SubscribeItem[]) => void;
}

const UA_PRESETS = [
  {
    value: "clash.meta",
    label: "Clash Meta (default)",
  },
  {
    value: "ClashforWindows/0.20.39",
    label: "Clash for Windows",
  },
  {
    value: "clash-verge/v2.2.3",
    label: "Clash Verge",
  },
  {
    value: "stash/2.7.6",
    label: "Stash",
  },
  {
    value: "Quantumult%20X/1.4.1",
    label: "Quantumult X",
  },
  {
    value: "Shadowrocket/2050",
    label: "Shadowrocket",
  },
  {
    value: "v2rayN/7.6",
    label: "v2rayN",
  },
];

const emptyItem = (): SubscribeItem => ({
  enabled: true,
  url: "",
  prefix: "",
  remark: "",
  cacheTtlMinutes: undefined,
  fetchUa: undefined,
});

interface TestResult {
  status: number;
  ua: string;
  nodeCount: number;
  nodes: { name: string; proxyType: string }[];
  elapsedMs: number;
  bodyBytes: number;
}

/** 单个订阅源卡片（可排序） */
const SortableCard = ({
  item,
  sortId,
  onUpdate,
  onRemove,
}: {
  item: SubscribeItem;
  sortId: string;
  onUpdate: (patch: Partial<SubscribeItem>) => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const testMutation = proxyApi.testSource.useMutation();

  const handleTest = useCallback(async () => {
    if (!item.url?.trim()) return;
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await testMutation.mutateAsync({
        url: item.url,
        ua: item.fetchUa || "",
      });
      setTestResult(res);
      setShowTestModal(true);
    } catch (e) {
      setTestError(e instanceof Error ? e.message : String(e));
      setShowTestModal(true);
    } finally {
      setTestLoading(false);
    }
  }, [item.url, item.fetchUa, testMutation]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Group nodes by type for the test result summary
  const typeGroups = useMemo(() => {
    if (!testResult?.nodes) return [];
    const map = new Map<string, number>();
    for (const n of testResult.nodes) {
      map.set(n.proxyType, (map.get(n.proxyType) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [testResult]);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-lg border p-3 transition-colors ${
          item.enabled
            ? "border-gray-200 bg-white dark:border-gray-600 dark:bg-[#1a1a1a]"
            : "border-dashed border-gray-300 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-[#111]"
        }`}
      >
        {/* Row 1: drag + enable + URL + delete */}
        <div className="flex items-center gap-2 mb-2">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <HolderOutlined />
          </span>
          <Tooltip
            title={
              item.enabled
                ? t("proxy.form.subscribeItemEnabled")
                : t("proxy.form.subscribeItemDisabled")
            }
          >
            <Checkbox
              checked={item.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
            />
          </Tooltip>
          <Input
            size="small"
            placeholder={t("proxy.form.subscribeItemUrl")}
            value={item.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            status={item.enabled && !item.url?.trim() ? "warning" : undefined}
            className="flex-1"
          />
          <Button
            variant="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={onRemove}
          />
        </div>

        {/* Row 2: remark + prefix + cache + UA + test */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:pl-[22px] md:pr-[32px]">
          <Input
            size="small"
            placeholder={t("proxy.form.subscribeItemRemark")}
            value={item.remark}
            onChange={(e) => onUpdate({ remark: e.target.value })}
            className="md:flex-1"
          />
          <div className="flex w-full items-center gap-2 md:w-auto md:shrink-0">
            <div className="flex-1 md:flex-none md:w-[150px]">
              <Input
                size="small"
                placeholder={t("proxy.form.subscribeItemPrefix")}
                value={item.prefix}
                onChange={(e) => onUpdate({ prefix: e.target.value })}
                suffix={
                  <Tooltip title={t("proxy.form.subscribeItemPrefixTip")}>
                    <span className="text-gray-400 text-xs cursor-help">?</span>
                  </Tooltip>
                }
              />
            </div>
            <Tooltip title={t("proxy.form.cacheTtlTooltip")}>
              <InputNumber
                size="small"
                min={0}
                max={1440}
                placeholder={t("proxy.form.subscribeItemCacheTtlPlaceholder")}
                value={item.cacheTtlMinutes}
                onChange={(val) =>
                  onUpdate({ cacheTtlMinutes: val ?? undefined })
                }
                addonAfter={t("proxy.form.cacheTtlUnit")}
                style={{ width: 130 }}
              />
            </Tooltip>
            <Tooltip title={t("proxy.form.fetchUaTooltip")}>
              <div className="flex-1 md:flex-none md:w-[200px]">
                <AutoComplete
                  size="small"
                  options={UA_PRESETS}
                  value={item.fetchUa ?? ""}
                  onChange={(v) => onUpdate({ fetchUa: v || undefined })}
                  placeholder={t("proxy.form.fetchUaPlaceholder")}
                  filterOption={(input, opt) =>
                    opt.value.toLowerCase().includes(input.toLowerCase()) ||
                    (typeof opt.label === "string" &&
                      opt.label.toLowerCase().includes(input.toLowerCase()))
                  }
                  allowClear
                  className="w-full"
                />
              </div>
            </Tooltip>
            <Tooltip title={t("proxy.form.testSourceBtn")}>
              <Button
                size="small"
                variant="text"
                icon={
                  testLoading ? (
                    <Loader2 className="animate-spin" size="1em" />
                  ) : (
                    <PlayCircleOutlined />
                  )
                }
                onClick={handleTest}
                disabled={!item.url?.trim() || testLoading}
                className="cursor-pointer"
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Test result modal */}
      <Modal
        open={showTestModal}
        onCancel={() => setShowTestModal(false)}
        title={t("proxy.form.testSourceTitle")}
        size="large"
        footer={
          <Button onClick={() => setShowTestModal(false)}>
            {t("proxy.form.close")}
          </Button>
        }
      >
        {testError ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <XCircle className="text-red-500" size={40} />
            <p className="text-red-500 text-sm text-center">{testError}</p>
          </div>
        ) : testResult ? (
          <div className="space-y-4">
            {/* Summary header */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#111]">
              {testResult.nodeCount > 0 ? (
                <CheckCircle2 className="text-green-500 shrink-0" size={24} />
              ) : (
                <XCircle className="text-red-500 shrink-0" size={24} />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {testResult.nodeCount > 0
                    ? t("proxy.form.testSourceSuccess", {
                        count: testResult.nodeCount,
                      })
                    : t("proxy.form.testSourceFail")}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Server size={12} />
                    HTTP {testResult.status}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {testResult.elapsedMs}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {(testResult.bodyBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            </div>

            {/* UA used */}
            <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
              UA:{" "}
              <code className="text-gray-700 dark:text-gray-300">
                {testResult.ua}
              </code>
            </div>

            {/* Type distribution */}
            {typeGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {typeGroups.map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {type}
                    <span className="font-mono font-medium">{count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Node list */}
            {testResult.nodes.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-[#111]">
                    <tr>
                      <th className="text-left px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400">
                        {t("proxy.form.testNodeName")}
                      </th>
                      <th className="text-left px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-24">
                        {t("proxy.form.testNodeType")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.nodes.map((node) => (
                      <tr
                        key={`${node.proxyType}:${node.name}`}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="px-3 py-1 text-gray-700 dark:text-gray-300 break-all">
                          {node.name}
                        </td>
                        <td className="px-3 py-1">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {node.proxyType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
};

const SubscribeItemsEditor = ({ value = [], onChange }: Props) => {
  const { t } = useTranslation();
  const items = value.length > 0 ? value : [emptyItem()];

  const [idCounter, setIdCounter] = useState(() => items.length);
  const [sortIds, setSortIds] = useState<string[]>(() =>
    items.map((_, i) => `item-${i}`),
  );

  const effectiveSortIds = useMemo(() => {
    if (sortIds.length === items.length) return sortIds;
    if (sortIds.length < items.length) {
      const newIds = [...sortIds];
      for (let i = sortIds.length; i < items.length; i++) {
        newIds.push(`item-${idCounter + i - sortIds.length}`);
      }
      return newIds;
    }
    return sortIds.slice(0, items.length);
  }, [sortIds, items.length, idCounter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const update = useCallback(
    (index: number, patch: Partial<SubscribeItem>) => {
      const next = items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      onChange?.(next);
    },
    [items, onChange],
  );

  const add = useCallback(() => {
    const newId = `item-${idCounter}`;
    setIdCounter((c) => c + 1);
    setSortIds([...effectiveSortIds, newId]);
    onChange?.([...items, emptyItem()]);
  }, [items, onChange, idCounter, effectiveSortIds]);

  const remove = useCallback(
    (index: number) => {
      const next = items.filter((_, i) => i !== index);
      const nextIds = effectiveSortIds.filter((_, i) => i !== index);
      setSortIds(nextIds.length > 0 ? nextIds : [`item-${idCounter}`]);
      if (nextIds.length === 0) setIdCounter((c) => c + 1);
      onChange?.(next.length > 0 ? next : [emptyItem()]);
    },
    [items, onChange, effectiveSortIds, idCounter],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = effectiveSortIds.indexOf(active.id as string);
      const newIndex = effectiveSortIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(items, oldIndex, newIndex);
      const newIds = arrayMove(effectiveSortIds, oldIndex, newIndex);
      setSortIds(newIds);
      onChange?.(newItems);
    },
    [items, onChange, effectiveSortIds],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={effectiveSortIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((item, index) => (
            <SortableCard
              key={effectiveSortIds[index]}
              sortId={effectiveSortIds[index]}
              item={item}
              onUpdate={(patch) => update(index, patch)}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      </SortableContext>

      <Button
        variant="dashed"
        block
        icon={<PlusOutlined />}
        onClick={add}
        className="!mt-3"
      >
        {t("proxy.form.addSubscribeItem")}
      </Button>
    </DndContext>
  );
};

export default SubscribeItemsEditor;
