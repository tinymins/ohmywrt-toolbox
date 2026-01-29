import { useState, useImperativeHandle, forwardRef } from "react";
import { Modal, Form, Input, Select, Segmented, Spin, message } from "antd";
import Editor, { loader } from "@monaco-editor/react";
import { parse as parseJsonc } from "jsonc-parser";
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
  { label: "基础信息", value: "basic" },
  { label: "订阅地址", value: "subscribeUrl" },
  { label: "规则列表", value: "ruleList" },
  { label: "分组", value: "group" },
  { label: "过滤器", value: "filter" },
  { label: "自定义配置", value: "customConfig" },
  { label: "额外服务器", value: "servers" }
];

const ProxySubscribeModal = forwardRef<ProxySubscribeModalRef, Props>(({ onSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // 获取用户列表
  const { data: userList } = trpc.user.list.useQuery();

  const { data: existingData, isLoading: isLoadingData } = trpc.proxy.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const createMutation = trpc.proxy.create.useMutation({
    onSuccess: () => {
      messageApi.success("创建成功");
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      messageApi.error(error.message || "创建失败");
    }
  });

  const updateMutation = trpc.proxy.update.useMutation({
    onSuccess: () => {
      messageApi.success("更新成功");
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      messageApi.error(error.message || "更新失败");
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
          messageApi.error(`${field} JSON 格式错误`);
          return false;
        }
      };

      // 验证所有 JSONC 字段
      const fields = ["subscribeUrl", "ruleList", "group", "filter", "customConfig", "servers"];
      for (const field of fields) {
        if (!validateJsonc(field)) {
          throw new Error(`${field} JSON 格式错误`);
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
        title={id ? "编辑订阅" : "新建订阅"}
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
              options={TABS}
              value={activeTab}
              onChange={(value) => setActiveTab(value as string)}
            />
          </div>

          <Form form={form} layout="vertical">
            {/* 基础信息 */}
            <div style={{ display: activeTab === "basic" ? "block" : "none" }}>
              <Form.Item label="备注" name="remark">
                <Input.TextArea rows={3} placeholder="订阅备注" />
              </Form.Item>
              <Form.Item label="授权用户" name="authorizedUserIds">
                <Select
                  mode="multiple"
                  placeholder="选择要授权的用户（可选）"
                  options={userList?.map(u => ({ label: `${u.name} (${u.email})`, value: u.id })) ?? []}
                  optionFilterProp="label"
                  showSearch
                />
              </Form.Item>
            </div>

            {/* 订阅地址 */}
            <div style={{ display: activeTab === "subscribeUrl" ? "block" : "none" }}>
              <Form.Item
                label="订阅地址 (JSON 数组，支持注释)"
                name="subscribeUrl"
                rules={[{ required: true, message: "请输入订阅地址" }]}
              >
                <JsoncEditor placeholder='["https://example.com/subscribe"]' />
              </Form.Item>
            </div>

            {/* 规则列表 */}
            <div style={{ display: activeTab === "ruleList" ? "block" : "none" }}>
              <Form.Item
                label="规则列表 (JSON 对象，支持注释)"
                name="ruleList"
              >
                <JsoncEditor placeholder='{"分组名": [{"name": "规则名", "url": "规则地址"}]}' />
              </Form.Item>
            </div>

            {/* 分组 */}
            <div style={{ display: activeTab === "group" ? "block" : "none" }}>
              <Form.Item
                label="分组配置 (JSON 数组，支持注释)"
                name="group"
              >
                <JsoncEditor placeholder='[{"name": "分组名", "type": "select", "proxies": ["节点1"]}]' />
              </Form.Item>
            </div>

            {/* 过滤器 */}
            <div style={{ display: activeTab === "filter" ? "block" : "none" }}>
              <Form.Item
                label="节点过滤器 (JSON 数组，支持注释)"
                name="filter"
              >
                <JsoncEditor placeholder='["关键词1", "关键词2"]' />
              </Form.Item>
            </div>

            {/* 自定义配置 */}
            <div style={{ display: activeTab === "customConfig" ? "block" : "none" }}>
              <Form.Item
                label="自定义规则 (JSON 数组，支持注释)"
                name="customConfig"
              >
                <JsoncEditor placeholder='["DOMAIN,example.com,DIRECT"]' />
              </Form.Item>
            </div>

            {/* 额外服务器 */}
            <div style={{ display: activeTab === "servers" ? "block" : "none" }}>
              <Form.Item
                label="额外服务器 (JSON 数组，支持注释)"
                name="servers"
              >
                <JsoncEditor placeholder='[{"name": "服务器名", "type": "ss", "server": "1.2.3.4", "port": 443}]' />
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
