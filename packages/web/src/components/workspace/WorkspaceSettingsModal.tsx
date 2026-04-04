import { Button, Input, Modal, Tabs } from "@acme/components";
import { SYSTEM_SHARED_SLUG } from "@acme/types";
import { useEffect, useState } from "react";
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const effectiveSlug = singleWorkspaceMode
    ? SYSTEM_SHARED_SLUG
    : (workspaceSlug ?? "");

  const workspaceQuery = workspaceApi.getBySlug.useQuery(
    { slug: effectiveSlug },
    { enabled: effectiveSlug.length > 0 && open },
  );
  const workspace = workspaceQuery.data;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setSlug(workspace.slug);
      setDescription(workspace.description ?? "");
    }
  }, [workspace]);

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
      >
        <div className="flex items-center justify-center py-8">
          <p className="text-[var(--text-muted)]">{t("login.loading")}</p>
        </div>
      </Modal>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName) {
      message.error(t("workspace.nameRequired"));
      return;
    }
    if (!singleWorkspaceMode) {
      if (!trimmedSlug) {
        message.error(t("workspace.slugRequired"));
        return;
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
        message.error(t("workspace.slugPattern"));
        return;
      }
    }
    await updateMutation.mutateAsync({
      id: workspace.id,
      name: trimmedName,
      slug: singleWorkspaceMode ? undefined : trimmedSlug,
      description: description.trim() || null,
    });
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: workspace.id });
  };

  const tabItems = [
    {
      key: "general",
      label: t("workspace.generalTab"),
      children: (
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("workspace.name")}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("workspace.namePlaceholder")}
              required
            />
          </div>

          {!singleWorkspaceMode && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                {t("workspace.slugLabel")}
              </label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t("workspace.slugPlaceholder")}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("workspace.description")}
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={updateMutation.isPending}
            >
              {t("workspace.saveChanges")}
            </Button>
          </div>
        </form>
      ),
    },
    ...(!singleWorkspaceMode
      ? [
          {
            key: "danger",
            label: t("workspace.dangerTab"),
            children: (
              <div className="rounded-md border border-red-300 dark:border-red-800 p-4 mt-2">
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
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={t("workspace.settings")}
        subtitle={t("workspace.settingsSubtitle", { name: workspace.name })}
        footer={null}
        width={520}
      >
        <Tabs items={tabItems} />
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
