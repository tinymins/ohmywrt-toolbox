import { Modal } from "@acme/components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CreateTestRequirementInput,
  TestRequirementOutput,
} from "@/generated/rust-api/test-requirement";

const TYPES = [
  "functional",
  "performance",
  "security",
  "usability",
  "compatibility",
  "other",
] as const;
const STATUSES = [
  "draft",
  "review",
  "approved",
  "rejected",
  "obsolete",
] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTestRequirementInput) => void;
  isPending: boolean;
  editingItem?: TestRequirementOutput | null;
}

export function TestRequirementModal({
  open,
  onClose,
  onSubmit,
  isPending,
  editingItem,
}: Props) {
  const { t } = useTranslation();
  const isEdit = !!editingItem;

  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [description, setDescription] = useState(
    editingItem?.description ?? "",
  );
  const [content, setContent] = useState(editingItem?.content ?? "");
  const [type, setType] = useState(editingItem?.type ?? "functional");
  const [status, setStatus] = useState(editingItem?.status ?? "draft");
  const [priority, setPriority] = useState(editingItem?.priority ?? "medium");
  const [tags, setTags] = useState(
    Array.isArray(editingItem?.tags)
      ? (editingItem.tags as string[]).join(", ")
      : "",
  );
  const [dueDate, setDueDate] = useState(editingItem?.dueDate ?? "");
  const [estimatedHours, setEstimatedHours] = useState(
    editingItem?.estimatedHours ?? "",
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    const data: CreateTestRequirementInput = {
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim() || null,
      type,
      status,
      priority,
      tags: tags.trim()
        ? tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
    };
    onSubmit(data);
  };

  const selectClass =
    "w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none";
  const inputClass = selectClass;

  return (
    <Modal
      title={isEdit ? t("testRequirement.edit") : t("testRequirement.create")}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.form.title")} *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("testRequirement.form.titlePlaceholder")}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.form.description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("testRequirement.form.descriptionPlaceholder")}
            rows={3}
            className={inputClass}
          />
        </div>

        {/* Type, Status, Priority row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.form.type")}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={selectClass}
            >
              {TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(`testRequirement.type.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.form.status")}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              {STATUSES.map((v) => (
                <option key={v} value={v}>
                  {t(`testRequirement.status.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.form.priority")}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={selectClass}
            >
              {PRIORITIES.map((v) => (
                <option key={v} value={v}>
                  {t(`testRequirement.priority.${v}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.form.tags")}
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("testRequirement.form.tagsPlaceholder")}
            className={inputClass}
          />
        </div>

        {/* Due Date & Hours row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.form.dueDate")}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.form.estimatedHours")}
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className={inputClass}
              min="0"
              step="0.5"
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.form.content")}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("testRequirement.form.contentPlaceholder")}
            rows={5}
            className={inputClass}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            {t("testRequirement.form.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || isPending}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEdit
              ? t("testRequirement.form.save")
              : t("testRequirement.form.submit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
