import { Form, Input, Modal, Typography } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../hooks";
import { trpc } from "../../lib/trpc";

const { Text } = Typography;

interface CreateWorkspaceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (workspace: { id: string; slug: string; name: string }) => void;
}

export default function CreateWorkspaceModal({
  open,
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const utils = trpc.useUtils();
  const message = useMessage();
  const { t } = useTranslation();

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: async (data) => {
      message.success(t("createWorkspace.success"));
      await utils.workspace.list.invalidate();
      form.resetFields();
      onClose();
      onSuccess?.(data);
    },
    onError: (error) => {
      message.error(error.message || t("createWorkspace.failed"));
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
      title={t("createWorkspace.title")}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={isSubmitting}
      okText={t("createWorkspace.create")}
      cancelText={t("createWorkspace.cancel")}
    >
      <Form form={form} layout="vertical" className="mt-6">
        <Form.Item
          name="name"
          label={t("createWorkspace.nameLabel")}
          rules={[
            { required: true, message: t("createWorkspace.nameRequired") },
            { min: 1, max: 50, message: t("createWorkspace.nameLength") },
          ]}
        >
          <Input
            placeholder={t("createWorkspace.namePlaceholder")}
            maxLength={50}
            onChange={handleNameChange}
          />
        </Form.Item>

        <Form.Item
          name="slug"
          label={t("createWorkspace.slugLabel")}
          rules={[
            { required: true, message: t("createWorkspace.slugRequired") },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: t("createWorkspace.slugPattern"),
            },
          ]}
          extra={
            slugValue && (
              <Text type="secondary" className="text-xs">
                {t("createWorkspace.slugExtra", { slug: slugValue })}
              </Text>
            )
          }
        >
          <Input
            placeholder="e.g., my-project"
            maxLength={50}
            onChange={handleSlugChange}
          />
        </Form.Item>

        <Form.Item name="description" label={t("createWorkspace.descLabel")}>
          <Input.TextArea
            placeholder={t("createWorkspace.descPlaceholder")}
            rows={3}
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
