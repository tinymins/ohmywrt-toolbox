import type { SubscribeItem } from "@acme/types";
import {
  CheckOutlined,
  DeleteOutlined,
  PauseOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Input, InputNumber, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
  value?: SubscribeItem[];
  onChange?: (items: SubscribeItem[]) => void;
}

const emptyItem = (): SubscribeItem => ({
  enabled: true,
  name: "",
  url: "",
  prefix: "",
  remark: "",
  cacheTtlMinutes: undefined,
});

const SubscribeItemsEditor = ({ value = [], onChange }: Props) => {
  const { t } = useTranslation();
  const items = value.length > 0 ? value : [emptyItem()];

  const update = (index: number, patch: Partial<SubscribeItem>) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange?.(next);
  };

  const add = () => {
    onChange?.([...items, emptyItem()]);
  };

  const remove = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange?.(next.length > 0 ? next : [emptyItem()]);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className={`rounded-lg border p-3 transition-colors ${
            item.enabled
              ? "border-gray-200 bg-white dark:border-gray-600 dark:bg-[#1a1a1a]"
              : "border-dashed border-gray-300 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-[#111]"
          }`}
        >
          {/* 第一行：启用 + 名称 + 前缀 + 删除 */}
          <div className="flex items-center gap-2 mb-2">
            <Tooltip
              title={
                item.enabled
                  ? t("proxy.form.subscribeItemEnabled")
                  : t("proxy.form.subscribeItemDisabled")
              }
            >
              <Checkbox
                checked={item.enabled}
                onChange={(e) => update(index, { enabled: e.target.checked })}
              />
            </Tooltip>
            <Input
              size="small"
              placeholder={t("proxy.form.subscribeItemName")}
              value={item.name}
              onChange={(e) => update(index, { name: e.target.value })}
              style={{ width: 140 }}
            />
            <Input
              size="small"
              placeholder={t("proxy.form.subscribeItemPrefix")}
              value={item.prefix}
              onChange={(e) => update(index, { prefix: e.target.value })}
              style={{ width: 140 }}
              suffix={
                <Tooltip title={t("proxy.form.subscribeItemPrefixTip")}>
                  <span className="text-gray-400 text-xs cursor-help">?</span>
                </Tooltip>
              }
            />
            <Tooltip title={t("proxy.form.cacheTtlTooltip")}>
              <InputNumber
                size="small"
                min={0}
                max={1440}
                placeholder={t("proxy.form.subscribeItemCacheTtlPlaceholder")}
                value={item.cacheTtlMinutes}
                onChange={(val) =>
                  update(index, {
                    cacheTtlMinutes: val ?? undefined,
                  })
                }
                suffix={t("proxy.form.cacheTtlUnit")}
                style={{ width: 120 }}
              />
            </Tooltip>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => remove(index)}
            />
          </div>

          {/* 第二行：订阅地址 */}
          <div className="mb-2">
            <Input
              size="small"
              placeholder={t("proxy.form.subscribeItemUrl")}
              value={item.url}
              onChange={(e) => update(index, { url: e.target.value })}
              status={item.enabled && !item.url?.trim() ? "warning" : undefined}
            />
          </div>

          {/* 第三行：备注 */}
          {(item.remark || item.url) && (
            <Input.TextArea
              placeholder={t("proxy.form.subscribeItemRemark")}
              value={item.remark}
              onChange={(e) => update(index, { remark: e.target.value })}
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          )}

          {/* 状态标记 */}
          {item.url?.trim() && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
              {item.enabled ? (
                <CheckOutlined className="text-green-500" />
              ) : (
                <PauseOutlined className="text-orange-400" />
              )}
              <span>
                {item.enabled
                  ? t("proxy.form.subscribeItemEnabled")
                  : t("proxy.form.subscribeItemDisabled")}
              </span>
            </div>
          )}
        </div>
      ))}

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={add}
        className="!mt-2"
      >
        {t("proxy.form.addSubscribeItem")}
      </Button>
    </div>
  );
};

export default SubscribeItemsEditor;
