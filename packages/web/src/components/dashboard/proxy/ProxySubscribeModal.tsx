import { useState, useImperativeHandle, forwardRef } from "react";
import { Modal, Form, Input, Select, Segmented, Spin, message } from "antd";
import Editor, { loader } from "@monaco-editor/react";
import { parse as parseJsonc } from "jsonc-parser";
import { useTranslation } from "react-i18next";
import { trpc } from "../../../lib/trpc";
import type { CreateProxySubscribeInput, UpdateProxySubscribeInput } from "@acme/types";

// 配置 Monaco CDN 源（和 classic 项目一致）
loader.config({ paths: { vs: "https://g.alicdn.com/code/lib/monaco-editor/0.47.0/min/vs" } });

// JSONC 编辑器组件，支持 // 和 /* */ 注释
interface JsoncEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const JsoncEditor = ({ value, onChange }: JsoncEditorProps) => {
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
      <Editor
        height={300}
        language="json"
        value={value || ""}
        theme="vs-dark"
        onChange={(val) => onChange?.(val || "")}
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
          tabSize: 2
        }}
        beforeMount={(monaco) => {
          // 配置 JSON 语言允许注释和尾随逗号
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: true,
            trailingCommas: "ignore"
          });
          monaco.editor.defineTheme("vs-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
              "editor.background": "#141414"
            }
          });
        }}
      />
    </div>
  );
};

export interface ProxySubscribeModalRef {
  open: (id?: string) => void;
}

interface Props {
  onSuccess: () => void;
}

// 默认分组配置
const DEFAULT_GROUPS = [
  { name: "🔰 国外流量", type: "select", proxies: ["🚀 直接连接"] },
  { name: "🏳️‍🌈 Google", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  { name: "✈️ Telegram", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  { name: "🎬 Youtube", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  { name: "🎮 Steam", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  { name: "🤖 AI", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  { name: "🐙 GitHub", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"] },
  { name: "🚀 直接连接", type: "select", proxies: ["DIRECT"], readonly: true },
  { name: "⚓️ 其他流量", type: "select", proxies: ["🔰 国外流量", "🚀 直接连接"], readonly: true }
];

const DEFAULT_RULE_PROVIDERS = {
  "🤖 AI": [
    { name: "AI", url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/AI%20Suite.yaml" }
  ],
  "🐙 GitHub": [
    { name: "GitHub", url: "https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/github.yaml" }
  ],
  "🎮 Steam": [
    { name: "Steam", url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Steam.yaml" }
  ],
  "✈️ Telegram": [
    { name: "Telegram", url: "https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Telegram.yaml" }
  ],
  "🏳️‍🌈 Google": [
    { name: "GoogleCIDRv2", url: "https://vercel.williamchan.me/api/google-ips" }
  ]
};

const TABS = [
  { label: "basic", value: "basic" },
  { label: "subscribeUrl", value: "subscribeUrl" },
  { label: "ruleList", value: "ruleList" },
  { label: "group", value: "group" },
  { label: "filter", value: "filter" },
  { label: "customConfig", value: "customConfig" },
  { label: "servers", value: "servers" }
];

const ProxySubscribeModal = forwardRef<ProxySubscribeModalRef, Props>(({ onSuccess }, ref) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 获取 tabs 的本地化标签
  const localizedTabs = TABS.map(tab => ({
    ...tab,
    label: t(`proxy.tabs.${tab.label}`)
  }));

  // 获取用户列表
  const { data: userList } = trpc.user.list.useQuery();

  const { data: existingData, isLoading: isLoadingData } = trpc.proxy.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const createMutation = trpc.proxy.create.useMutation({
    onSuccess: () => {
      messageApi.success(t("proxy.createSuccess"));
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      messageApi.error(error.message || t("proxy.createFailed"));
    }
  });

  const updateMutation = trpc.proxy.update.useMutation({
    onSuccess: () => {
      messageApi.success(t("proxy.updateSuccess"));
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      messageApi.error(error.message || t("proxy.updateFailed"));
    }
  });

  useImperativeHandle(ref, () => ({
    open: (subscribeId?: string) => {
      setActiveTab("basic");
      if (subscribeId) {
        setId(subscribeId);
        setLoading(true);
      } else {
        setId(null);
        form.resetFields();
        form.setFieldsValue({
          subscribeUrl: JSON.stringify(["url1", "url2"], null, 2),
          ruleList: JSON.stringify(DEFAULT_RULE_PROVIDERS, null, 2),
          group: JSON.stringify(DEFAULT_GROUPS, null, 2),
          filter: JSON.stringify(["官网", "客服", "qq群"], null, 2),
          customConfig: JSON.stringify([], null, 2),
          servers: JSON.stringify([], null, 2)
        });
        setLoading(false);
      }
      setOpen(true);
    }
  }));

  // 当获取到数据时更新表单（直接用原始字符串）
  if (existingData && loading) {
    form.setFieldsValue({
      remark: existingData.remark ?? "",
      subscribeUrl: existingData.subscribeUrl ?? "",
      ruleList: existingData.ruleList ?? "",
      group: existingData.group ?? "",
      filter: existingData.filter ?? "",
      customConfig: existingData.customConfig ?? "",
      servers: existingData.servers ?? "",
      authorizedUserIds: existingData.authorizedUserIds
    });
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
      const fields = ["subscribeUrl", "ruleList", "group", "filter", "customConfig", "servers"];
      for (const field of fields) {
        if (!validateJsonc(field)) {
          throw new Error(`${field} ${t("proxy.form.jsonFormatError")}`);
        }
      }

      // 直接发送原始字符串（包含注释）
      const data = {
        remark: values.remark || null,
        subscribeUrl: values.subscribeUrl || null,
        ruleList: values.ruleList || null,
        group: values.group || null,
        filter: values.filter || null,
        customConfig: values.customConfig || null,
        servers: values.servers || null,
        authorizedUserIds: values.authorizedUserIds ?? []
      };

      if (id) {
        await updateMutation.mutateAsync({ id, ...data } as UpdateProxySubscribeInput);
      } else {
        await createMutation.mutateAsync(data as CreateProxySubscribeInput);
      }
    } catch (error) {
      // 表单验证失败或 JSON 解析失败
      console.error(error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {contextHolder}
      <Modal
        title={id ? t("proxy.editSubscribe") : t("proxy.newSubscribe")}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isPending}
        width={800}
        styles={{ body: { maxHeight: "70vh", overflow: "auto" } }}
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
            <div style={{ display: activeTab === "basic" ? "block" : "none" }}>
              <Form.Item label={t("proxy.form.remark")} name="remark">
                <Input.TextArea rows={3} placeholder={t("proxy.form.remarkPlaceholder")} />
              </Form.Item>
              <Form.Item label={t("proxy.form.authorizedUsers")} name="authorizedUserIds">
                <Select
                  mode="multiple"
                  placeholder={t("proxy.form.authorizedUsersPlaceholder")}
                  options={userList?.map(u => ({ label: `${u.name} (${u.email})`, value: u.id })) ?? []}
                  optionFilterProp="label"
                  showSearch
                />
              </Form.Item>
            </div>

            {/* 订阅地址 */}
            <div style={{ display: activeTab === "subscribeUrl" ? "block" : "none" }}>
              <Form.Item
                label={t("proxy.form.subscribeUrlLabel")}
                name="subscribeUrl"
                rules={[{ required: true, message: t("proxy.form.subscribeUrlRequired") }]}
              >
                <JsoncEditor placeholder={t("proxy.form.subscribeUrlPlaceholder")} />
              </Form.Item>
            </div>

            {/* 规则列表 */}
            <div style={{ display: activeTab === "ruleList" ? "block" : "none" }}>
              <Form.Item
                label={t("proxy.form.ruleListLabel")}
                name="ruleList"
              >
                <JsoncEditor placeholder={t("proxy.form.ruleListPlaceholder")} />
              </Form.Item>
            </div>

            {/* 分组 */}
            <div style={{ display: activeTab === "group" ? "block" : "none" }}>
              <Form.Item
                label={t("proxy.form.groupLabel")}
                name="group"
              >
                <JsoncEditor placeholder={t("proxy.form.groupPlaceholder")} />
              </Form.Item>
            </div>

            {/* 过滤器 */}
            <div style={{ display: activeTab === "filter" ? "block" : "none" }}>
              <Form.Item
                label={t("proxy.form.filterLabel")}
                name="filter"
              >
                <JsoncEditor placeholder={t("proxy.form.filterPlaceholder")} />
              </Form.Item>
            </div>

            {/* 自定义配置 */}
            <div style={{ display: activeTab === "customConfig" ? "block" : "none" }}>
              <Form.Item
                label={t("proxy.form.customConfigLabel")}
                name="customConfig"
              >
                <JsoncEditor placeholder={t("proxy.form.customConfigPlaceholder")} />
              </Form.Item>
            </div>

            {/* 额外服务器 */}
            <div style={{ display: activeTab === "servers" ? "block" : "none" }}>
              <Form.Item
                label={t("proxy.form.serversLabel")}
                name="servers"
              >
                <JsoncEditor placeholder={t("proxy.form.serversPlaceholder")} />
              </Form.Item>
            </div>
          </Form>
        </Spin>
      </Modal>
    </>
  );
});

ProxySubscribeModal.displayName = "ProxySubscribeModal";

export default ProxySubscribeModal;
