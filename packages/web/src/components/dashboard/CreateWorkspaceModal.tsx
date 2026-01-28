import { useState } from "react";
import { Modal, Form, Input, Typography } from "antd";
import { useMessage } from "../../hooks";
import type { Lang } from "../../lib/types";
import { trpc } from "../../lib/trpc";

const { Text } = Typography;

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  onSuccess?: (workspace: { id: string; slug: string; name: string }) => void;
}

export default function CreateWorkspaceModal({
  open,
  onClose,
  lang,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const utils = trpc.useUtils();
  const message = useMessage();

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: async (data) => {
      message.success(lang === "zh" ? "空间站创建成功" : "Workspace created successfully");
      await utils.workspace.list.invalidate();
      form.resetFields();
      onClose();
      onSuccess?.(data);
    },
    onError: (error) => {
      message.error(error.message || (lang === "zh" ? "创建失败" : "Failed to create"));
    },
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      await createMutation.mutateAsync({
        name: values.name,
        slug: values.slug || undefined,
        description: values.description,
      });
    } catch (error) {
      // Form validation error or mutation error
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSlugValue("");
    setIsSlugManuallyEdited(false);
    onClose();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    // 只在用户未手动修改过 slug 时自动生成
    if (!isSlugManuallyEdited) {
      const autoSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      form.setFieldValue("slug", autoSlug);
      setSlugValue(autoSlug);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugValue(e.target.value);
    setIsSlugManuallyEdited(true);
  };

  return (
    <Modal
      title={lang === "zh" ? "新建空间站" : "Create Workspace"}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={isSubmitting}
      okText={lang === "zh" ? "创建" : "Create"}
      cancelText={lang === "zh" ? "取消" : "Cancel"}
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-6"
      >
        <Form.Item
          name="name"
          label={lang === "zh" ? "空间站名称" : "Workspace Name"}
          rules={[
            { required: true, message: lang === "zh" ? "请输入空间站名称" : "Please enter workspace name" },
            { min: 1, max: 50, message: lang === "zh" ? "名称长度为 1-50 个字符" : "Name length should be 1-50 characters" },
          ]}
        >
          <Input
            placeholder={lang === "zh" ? "例如：我的项目" : "e.g., My Project"}
            maxLength={50}
            onChange={handleNameChange}
          />
        </Form.Item>

        <Form.Item
          name="slug"
          label={lang === "zh" ? "空间站标识（用于访问链接）" : "Workspace Slug (for URL)"}
          rules={[
            { required: true, message: lang === "zh" ? "请输入空间站标识" : "Please enter workspace slug" },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: lang === "zh"
                ? "只能包含小写字母、数字和连字符，且不能以连字符开头或结尾"
                : "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with hyphen."
            },
          ]}
          extra={
            slugValue && (
              <Text type="secondary" className="text-xs">
                {lang === "zh" ? "访问链接：" : "URL: "}
                <Text code className="text-xs">
                  /workspace/{slugValue}
                </Text>
              </Text>
            )
          }
        >
          <Input
            placeholder={lang === "zh" ? "例如：my-project" : "e.g., my-project"}
            maxLength={50}
            onChange={handleSlugChange}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={lang === "zh" ? "描述（可选）" : "Description (Optional)"}
        >
          <Input.TextArea
            placeholder={lang === "zh" ? "简要描述这个空间站的用途..." : "Briefly describe this workspace..."}
            rows={3}
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
