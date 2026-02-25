import type {
  CreateProxySubscribeInput,
  SubscribeItem,
  UpdateProxySubscribeInput,
} from "@acme/types";
import { ScaledModal } from "@acme/components";
import Editor, { loader } from "@monaco-editor/react";
import {
  Checkbox,
  Form,
  Input,
  message,
  Segmented,
  Select,
  Spin,
} from "antd";
import { parse as parseJsonc } from "jsonc-parser";
import { forwardRef, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "../../../lib/trpc";
import SubscribeItemsEditor from "./SubscribeItemsEditor";

// 配置 Monaco CDN 源（和 classic 项目一致）
loader.config({
  paths: { vs: "https://g.alicdn.com/code/lib/monaco-editor/0.47.0/min/vs" },
});

// JSONC 编辑器组件，支持 // 和 /* */ 注释
interface JsoncEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const JsoncEditor = ({ value, onChange, readOnly }: JsoncEditorProps) => {
  return (
    <div
      className={`border rounded overflow-hidden ${
        readOnly
          ? "border-gray-500 dark:border-gray-500 opacity-60"
          : "border-gray-300 dark:border-gray-600"
      }`}
    >
      <Editor
        height={300}
        language="json"
        value={value || ""}
        theme="vs-dark"
        onChange={(val) => {
          if (!readOnly) onChange?.(val || "");
        }}
        options={{
          automaticLayout: true,
          selectOnLineNumbers: true,
          fontSize: 14,
          fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          wordWrap: "on",
          renderControlCharacters: true,
          renderWhitespace: "all",
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          tabSize: 2,
          readOnly: readOnly ?? false,
        }}
        beforeMount={(monaco) => {
          // 配置 JSON 语言允许注释和尾随逗号
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: true,
            trailingCommas: "ignore",
          });
          monaco.editor.defineTheme("vs-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
              "editor.background": "#141414",
            },
          });
        }}
      />
    </div>
  );
};

/**
 * 配置字段编辑器：根据 useSystem checkbox 状态切换只读/可编辑模式。
 * 勾选时显示系统默认值（只读），取消勾选显示用户自定义值（可编辑）。
 */
interface ConfigFieldEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  form: ReturnType<typeof Form.useForm>[0];
  useSystemField: string;
  defaultValue: string;
  placeholder?: string;
}

const ConfigFieldEditor = ({
  value,
  onChange,
  form,
  useSystemField,
  defaultValue,
  placeholder,
}: ConfigFieldEditorProps) => {
  const useSystem = Form.useWatch(useSystemField, form);

  if (useSystem) {
    // 独立的只读编辑器，不连接 form 的 onChange，确保表单值不被覆盖
    return (
      <JsoncEditor
        key="system-default"
        value={defaultValue}
        readOnly
        placeholder={placeholder}
      />
    );
  }

  // 可编辑编辑器，连接 form
  return (
    <JsoncEditor
      key="user-custom"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

export interface ProxySubscribeModalRef {
  open: (id?: string) => void;
}

interface Props {
  onSuccess: () => void;
}

const TABS = [
  { label: "basic", value: "basic" },
  { label: "subscribeUrl", value: "subscribeUrl" },
  { label: "ruleList", value: "ruleList" },
  { label: "group", value: "group" },
  { label: "filter", value: "filter" },
  { label: "customConfig", value: "customConfig" },
  { label: "servers", value: "servers" },
];

const ProxySubscribeModal = forwardRef<ProxySubscribeModalRef, Props>(
  ({ onSuccess }, ref) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [id, setId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const [isOwner, setIsOwner] = useState(true); // 是否是创建者
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();

    // 获取 tabs 的本地化标签
    const localizedTabs = TABS.map((tab) => ({
      ...tab,
      label: t(`proxy.tabs.${tab.label}`),
    }));

    // 获取用户列表
    const { data: userList } = trpc.user.list.useQuery();

    // 获取当前用户信息
    const { data: currentUser } = trpc.user.getProfile.useQuery();

    // 获取默认配置
    const { data: defaults } = trpc.proxy.getDefaults.useQuery();

    // tRPC utils for cache invalidation
    const utils = trpc.useUtils();

    const { data: existingData, isLoading: isLoadingData } =
      trpc.proxy.getById.useQuery({ id: id! }, { enabled: !!id });

    const createMutation = trpc.proxy.create.useMutation({
      onSuccess: () => {
        messageApi.success(t("proxy.createSuccess"));
        setOpen(false);
        onSuccess();
      },
      onError: (error) => {
        messageApi.error(error.message || t("proxy.createFailed"));
      },
    });

    const updateMutation = trpc.proxy.update.useMutation({
      onSuccess: () => {
        messageApi.success(t("proxy.updateSuccess"));
        // 使 getById 缓存失效，下次打开时重新获取
        if (id) {
          utils.proxy.getById.invalidate({ id });
        }
        setOpen(false);
        onSuccess();
      },
      onError: (error) => {
        messageApi.error(error.message || t("proxy.updateFailed"));
      },
    });

    useImperativeHandle(ref, () => ({
      open: (subscribeId?: string) => {
        setActiveTab("basic");
        if (subscribeId) {
          setId(subscribeId);
          setLoading(true);
          setIsOwner(true); // 先假设是创建者，加载数据后会更新
        } else {
          setId(null);
          setIsOwner(true); // 新建时一定是创建者
          form.resetFields();
          form.setFieldsValue({
            subscribeItems: [
              { enabled: true, url: "", prefix: "", remark: "" },
            ],
            ruleList: "",
            useSystemRuleList: true,
            group: "",
            useSystemGroup: true,
            filter: "",
            useSystemFilter: true,
            customConfig: "",
            useSystemCustomConfig: true,
            servers: JSON.stringify([], null, 2),
          });
          setLoading(false);
        }
        setOpen(true);
      },
    }));

    // 当获取到数据时更新表单（直接用原始字符串）
    if (existingData && loading) {
      // 迁移逻辑：如果有 subscribeItems 则直接用，否则从旧的 subscribeUrl JSONC 转换
      let items: SubscribeItem[] = [];
      // 全局缓存时间（旧数据可能有），迁移时复制到每个 item
      const globalCacheTtl = existingData.cacheTtlMinutes ?? undefined;
      if (
        existingData.subscribeItems &&
        existingData.subscribeItems.length > 0
      ) {
        // 如果 item 没有自己的 cacheTtlMinutes，用全局值回填
        items = existingData.subscribeItems.map((item) => ({
          ...item,
          cacheTtlMinutes: item.cacheTtlMinutes ?? globalCacheTtl,
        }));
      } else if (existingData.subscribeUrl) {
        try {
          const parsed = parseJsonc(existingData.subscribeUrl);
          if (Array.isArray(parsed)) {
            items = parsed
              .filter((u: unknown) => typeof u === "string" && u.trim())
              .map((u: string) => ({
                enabled: true,
                url: u,
                prefix: "",
                remark: "",
                cacheTtlMinutes: globalCacheTtl,
              }));
          }
        } catch {
          // JSONC 解析失败，留空
        }
      }
      if (items.length === 0) {
        items = [
          {
            enabled: true,
            url: "",
            prefix: "",
            remark: "",
            cacheTtlMinutes: undefined,
          },
        ];
      }

      form.setFieldsValue({
        remark: existingData.remark ?? "",
        subscribeItems: items,
        ruleList: existingData.ruleList ?? "",
        useSystemRuleList: existingData.useSystemRuleList,
        group: existingData.group ?? "",
        useSystemGroup: existingData.useSystemGroup,
        filter: existingData.filter ?? "",
        useSystemFilter: existingData.useSystemFilter,
        customConfig: existingData.customConfig ?? "",
        useSystemCustomConfig: existingData.useSystemCustomConfig,
        servers: existingData.servers ?? "",
        authorizedUserIds: existingData.authorizedUserIds,
      });
      // 判断当前用户是否是创建者
      setIsOwner(existingData.userId === currentUser?.id);
      setLoading(false);
    }

    const handleSubmit = async () => {
      try {
        const values = await form.validateFields();

        // 验证 JSONC 格式是否正确
        const validateJsonc = (field: string) => {
          if (!values[field]) return true;
          try {
            parseJsonc(values[field]);
            return true;
          } catch {
            messageApi.error(`${field} ${t("proxy.form.jsonFormatError")}`);
            return false;
          }
        };

        // 验证所有 JSONC 字段
        const fields = [
          "ruleList",
          "group",
          "filter",
          "customConfig",
          "servers",
        ];
        for (const field of fields) {
          if (!validateJsonc(field)) {
            throw new Error(`${field} ${t("proxy.form.jsonFormatError")}`);
          }
        }

        // 过滤空白的 subscribeItems，清空旧字段
        const cleanedItems = (
          (values.subscribeItems as SubscribeItem[]) || []
        ).filter((item: SubscribeItem) => item.url?.trim());

        // 直接发送原始字符串（包含注释）
        const data = {
          remark: values.remark || null,
          subscribeUrl: null, // 清空旧字段
          subscribeItems: cleanedItems.length > 0 ? cleanedItems : null,
          ruleList: values.ruleList || null,
          useSystemRuleList: values.useSystemRuleList ?? true,
          group: values.group || null,
          useSystemGroup: values.useSystemGroup ?? true,
          filter: values.filter || null,
          useSystemFilter: values.useSystemFilter ?? true,
          customConfig: values.customConfig || null,
          useSystemCustomConfig: values.useSystemCustomConfig ?? true,
          servers: values.servers || null,
          authorizedUserIds: values.authorizedUserIds ?? [],
          cacheTtlMinutes: null, // 缓存时间已移至每个订阅源
        };

        if (id) {
          await updateMutation.mutateAsync({
            id,
            ...data,
          } as UpdateProxySubscribeInput);
        } else {
          await createMutation.mutateAsync(data as CreateProxySubscribeInput);
        }
      } catch (error) {
        // 表单验证失败或 JSON 解析失败
        console.error(error);
      }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    // 配置字段定义（用于统一渲染 useSystem checkbox + editor）
    type ConfigField = "ruleList" | "group" | "filter" | "customConfig";
    const CONFIG_FIELDS: {
      field: ConfigField;
      useSystemField: string;
      tab: string;
      labelKey: string;
      placeholderKey: string;
    }[] = [
      {
        field: "ruleList",
        useSystemField: "useSystemRuleList",
        tab: "ruleList",
        labelKey: "proxy.form.ruleListLabel",
        placeholderKey: "proxy.form.ruleListPlaceholder",
      },
      {
        field: "group",
        useSystemField: "useSystemGroup",
        tab: "group",
        labelKey: "proxy.form.groupLabel",
        placeholderKey: "proxy.form.groupPlaceholder",
      },
      {
        field: "filter",
        useSystemField: "useSystemFilter",
        tab: "filter",
        labelKey: "proxy.form.filterLabel",
        placeholderKey: "proxy.form.filterPlaceholder",
      },
      {
        field: "customConfig",
        useSystemField: "useSystemCustomConfig",
        tab: "customConfig",
        labelKey: "proxy.form.customConfigLabel",
        placeholderKey: "proxy.form.customConfigPlaceholder",
      },
    ];

    return (
      <>
        {contextHolder}
          <ScaledModal
            title={id ? t("proxy.editSubscribe") : t("proxy.newSubscribe")}
            open={open}
            onCancel={() => setOpen(false)}
            onOk={handleSubmit}
            confirmLoading={isPending}
            size="full"
          >
          <Spin spinning={loading || isLoadingData}>
              <div className="mb-4">
                <Segmented
                  block
                  options={localizedTabs}
                  value={activeTab}
                  onChange={(value) => setActiveTab(value as string)}
                />
              </div>

              <Form form={form} layout="vertical">
              {/* 基础信息 */}
              <div
                style={{ display: activeTab === "basic" ? "block" : "none" }}
              >
                <Form.Item label={t("proxy.form.remark")} name="remark">
                  <Input.TextArea
                    rows={3}
                    placeholder={t("proxy.form.remarkPlaceholder")}
                  />
                </Form.Item>
                <Form.Item
                  label={t("proxy.form.authorizedUsers")}
                  name="authorizedUserIds"
                  tooltip={
                    !isOwner
                      ? t("proxy.form.authorizedUsersOwnerOnly")
                      : undefined
                  }
                >
                  <Select
                    mode="multiple"
                    placeholder={t("proxy.form.authorizedUsersPlaceholder")}
                    options={
                      userList?.map((u) => ({
                        label: `${u.name} (${u.email})`,
                        value: u.id,
                      })) ?? []
                    }
                    optionFilterProp="label"
                    showSearch
                    disabled={!isOwner}
                  />
                </Form.Item>
              </div>

              {/* 订阅源 */}
              <div
                style={{
                  display: activeTab === "subscribeUrl" ? "block" : "none",
                }}
              >
                <Form.Item
                  label={t("proxy.form.subscribeUrlLabel")}
                  name="subscribeItems"
                >
                  <SubscribeItemsEditor />
                </Form.Item>
              </div>

              {/* 规则列表 / 分组 / 过滤器 / 自定义配置 */}
              {CONFIG_FIELDS.map(({ field, useSystemField, tab, labelKey, placeholderKey }) => (
                <div
                  key={tab}
                  style={{ display: activeTab === tab ? "block" : "none" }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span>{t(labelKey)}</span>
                    <Form.Item
                      name={useSystemField}
                      valuePropName="checked"
                      noStyle
                    >
                      <Checkbox>
                        {t("proxy.form.useSystemConfig")}
                      </Checkbox>
                    </Form.Item>
                  </div>
                  <Form.Item
                    name={field}
                    dependencies={[useSystemField]}
                    noStyle
                  >
                    {/* 使用函数渲染以动态获取 useSystem 值 */}
                    <ConfigFieldEditor
                      form={form}
                      useSystemField={useSystemField}
                      defaultValue={defaults?.[field] ?? ""}
                      placeholder={t(placeholderKey)}
                    />
                  </Form.Item>
                </div>
              ))}

              {/* 额外服务器 */}
              <div
                style={{ display: activeTab === "servers" ? "block" : "none" }}
              >
                <Form.Item label={t("proxy.form.serversLabel")} name="servers">
                  <JsoncEditor
                    placeholder={t("proxy.form.serversPlaceholder")}
                  />
                </Form.Item>
              </div>
            </Form>
          </Spin>
        </ScaledModal>
      </>
    );
  },
);

ProxySubscribeModal.displayName = "ProxySubscribeModal";

export default ProxySubscribeModal;
