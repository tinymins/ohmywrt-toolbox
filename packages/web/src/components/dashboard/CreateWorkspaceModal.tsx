import { Button, Input, Modal } from "@acme/components";
import { slugify } from "@acme/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { workspaceApi } from "@/generated/rust-api";
import { message } from "@/lib/message";

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
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const createMutation = workspaceApi.create.useMutation({
    onSuccess: async (data) => {
      message.success(t("workspace.createSuccess"));
      await workspaceApi.list.invalidate(queryClient);
      reset();
      onSuccess?.(data);
    },
    onError: (err) => {
      message.error(err.message || t("workspace.createFailed"));
    },
  });

  const reset = useCallback(() => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      name,
      slug: slug || undefined,
      description: description || undefined,
    });
  };

  return (
    <Modal open={open} onCancel={onClose} title={t("workspace.new")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {t("workspace.name")}
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder={t("workspace.namePlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {t("workspace.slugLabel")}
          </label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder={t("workspace.slugPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            {t("workspace.description")}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="default" block type="button" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            block
            type="submit"
            loading={createMutation.isPending}
          >
            {t("workspace.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
