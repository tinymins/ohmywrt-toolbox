import {
  Button,
  ControlOutlined,
  cn,
  Form,
  Input,
  Modal,
  WarningOutlined,
} from "@acme/components";
import { SYSTEM_SHARED_SLUG } from "@acme/types";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { workspaceApi } from "@/generated/rust-api";
import { useSystemSettings } from "@/hooks";
import { message } from "@/lib/message";

interface WorkspaceSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WorkspaceSettingsModal({
  open,
  onClose,
}: WorkspaceSettingsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspace: workspaceSlug } = useParams<{ workspace: string }>();
  const { singleWorkspaceMode } = useSystemSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [form] = Form.useForm();
  const hasOpenedRef = useRef(false);

  const effectiveSlug = singleWorkspaceMode
    ? SYSTEM_SHARED_SLUG
    : (workspaceSlug ?? "");

  const workspaceQuery = workspaceApi.getBySlug.useQuery(
    { slug: effectiveSlug },
    { enabled: effectiveSlug.length > 0 && open },
  );
  const workspace = workspaceQuery.data;

  useEffect(() => {
    if (!open) {
      if (hasOpenedRef.current) {
        setActiveTab("general");
      }
      return;
    }
    hasOpenedRef.current = true;
    if (workspace) {
      form.setFieldsValue({
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description ?? "",
      });
    }
  }, [open, workspace, form]);

  const updateMutation = workspaceApi.update.useMutation({
    onSuccess: (updated) => {
      message.success(t("workspace.saveSuccess"));
      if (!singleWorkspaceMode && updated.slug !== workspaceSlug) {
        navigate(`/dashboard/${updated.slug}`, { replace: true });
      }
      onClose();
    },
    onError: (err) => {
      message.error(err.message);
    },
  });

  const deleteMutation = workspaceApi.delete.useMutation({
    onSuccess: () => {
      message.success(t("workspace.deleteSuccess"));
      setDeleteModalOpen(false);
      onClose();
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => {
      message.error(err.message);
    },
  });

  if (!workspace) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        title={t("workspace.settings")}
        footer={null}
        width={660}
      >
        <div className="flex items-center justify-center py-8">
          <p className="text-[var(--text-muted)]">{t("login.loading")}</p>
        </div>
      </Modal>
    );
  }

  const handleSave = async () => {
    const values = await form.validateFields();
    const trimmedName = (values.name as string).trim();
    const trimmedSlug = (values.slug as string | undefined)?.trim();
    if (!singleWorkspaceMode && trimmedSlug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
        message.error(t("workspace.slugPattern"));
        return;
      }
    }
    await updateMutation.mutateAsync({
      id: workspace.id,
      name: trimmedName,
      slug: singleWorkspaceMode ? undefined : trimmedSlug,
      description: ((values.description as string) ?? "").trim() || null,
    });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: workspace.id });
  };

  const tabs = [
    {
      key: "general",
      icon: <ControlOutlined />,
      label: t("workspace.generalTab"),
    },
    ...(!singleWorkspaceMode
      ? [
          {
            key: "danger",
            icon: <WarningOutlined />,
            label: t("workspace.dangerTab"),
          },
        ]
      : []),
  ] as const;

  const generalContent = (
    <Form form={form} layout="vertical" autoComplete="off">
      <Form.Item
        label={t("workspace.name")}
        name="name"
        rules={[{ required: true, message: t("workspace.nameRequired") }]}
      >
        <Input placeholder={t("workspace.namePlaceholder")} />
      </Form.Item>

      {!singleWorkspaceMode && (
        <Form.Item
          label={t("workspace.slugLabel")}
          name="slug"
          rules={[{ required: true, message: t("workspace.slugRequired") }]}
        >
          <Input placeholder={t("workspace.slugPlaceholder")} />
        </Form.Item>
      )}

      <Form.Item label={t("workspace.description")} name="description">
        <Input />
      </Form.Item>
    </Form>
  );

  const dangerContent = (
    <div className="rounded-md border border-red-300 dark:border-red-800 p-4">
      <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">
        {t("workspace.deleteWorkspace")}
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        {t("workspace.deleteWorkspaceDesc")}
      </p>
      <Button
        type="button"
        variant="danger"
        onClick={() => setDeleteModalOpen(true)}
      >
        {t("workspace.deleteWorkspace")}
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={t("workspace.settings")}
        footer={null}
        destroyOnHidden
        width={660}
        styles={{ body: { padding: 0 } }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: "168px 1fr", height: 420 }}
        >
          {/* Left sidebar nav */}
          <div className="border-r border-[var(--border-base)] bg-[var(--fill-tertiary)] overflow-y-auto rounded-bl-lg pt-4">
            <div className="px-2">
              {tabs.map(({ key, icon, label }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-colors cursor-pointer text-sm",
                      isActive
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]",
                    )}
                  >
                    <span className="shrink-0">{icon}</span>
                    <span className="leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: content + footer */}
          <div className="flex flex-col min-h-0">
            <div
              className="flex-1 overflow-y-auto px-6 py-5"
              style={{ scrollbarWidth: "thin" }}
            >
              {activeTab === "general" && generalContent}
              {activeTab === "danger" && dangerContent}
            </div>

            {/* Footer */}
            {activeTab === "general" && (
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border-base)] shrink-0">
                <Button onClick={onClose}>{t("common.cancel")}</Button>
                <Button
                  variant="primary"
                  loading={updateMutation.isPending}
                  onClick={handleSave}
                >
                  {t("common.save")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        title={t("workspace.confirmDeleteTitle")}
        footer={null}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-primary)]">
            {t("workspace.confirmDeleteContent", { name: workspace.name })}
          </p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            {t("workspace.confirmDeleteWarning")}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="text"
              onClick={() => setDeleteModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
