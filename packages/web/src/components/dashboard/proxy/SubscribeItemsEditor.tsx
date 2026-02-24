import type { SubscribeItem } from "@acme/types";
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Checkbox, Input, InputNumber, Tooltip } from "antd";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  value?: SubscribeItem[];
  onChange?: (items: SubscribeItem[]) => void;
}

const emptyItem = (): SubscribeItem => ({
  enabled: true,
  url: "",
  prefix: "",
  remark: "",
  cacheTtlMinutes: undefined,
});

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-3 transition-colors ${
        item.enabled
          ? "border-gray-200 bg-white dark:border-gray-600 dark:bg-[#1a1a1a]"
          : "border-dashed border-gray-300 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-[#111]"
      }`}
    >
      {/* 第一行：拖拽手柄 + 启用 + URL + 删除 */}
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
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={onRemove}
        />
      </div>

      {/* 第二行：备注 + 前缀 + 缓存（桌面端左右留白对齐上方 URL，移动端备注独立一行） */}
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
              onChange={(val) => onUpdate({ cacheTtlMinutes: val ?? undefined })}
              suffix={t("proxy.form.cacheTtlUnit")}
              style={{ width: 130 }}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

const SubscribeItemsEditor = ({ value = [], onChange }: Props) => {
  const { t } = useTranslation();
  const items = value.length > 0 ? value : [emptyItem()];

  // 为每个 item 生成稳定 ID（用 useState 维护映射）
  const [idCounter, setIdCounter] = useState(() => items.length);
  const [sortIds, setSortIds] = useState<string[]>(() =>
    items.map((_, i) => `item-${i}`),
  );

  // 保持 sortIds 与 items 长度同步
  const effectiveSortIds = useMemo(() => {
    if (sortIds.length === items.length) return sortIds;
    // items 变多了（新增），补上新 ID
    if (sortIds.length < items.length) {
      const newIds = [...sortIds];
      for (let i = sortIds.length; i < items.length; i++) {
        newIds.push(`item-${idCounter + i - sortIds.length}`);
      }
      return newIds;
    }
    // items 变少了（删除），截断
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
        type="dashed"
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
