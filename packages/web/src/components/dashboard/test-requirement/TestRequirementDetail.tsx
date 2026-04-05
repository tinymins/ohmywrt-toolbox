import { Modal } from "@acme/components";
import { useTranslation } from "react-i18next";
import type { TestRequirementOutput } from "@/generated/rust-api/test-requirement";
import { testRequirementApi } from "@/generated/rust-api/test-requirement";
import { priorityColor, statusColor, typeColor } from "./TestRequirementPage";

interface Props {
  item: TestRequirementOutput | null;
  open: boolean;
  onClose: () => void;
}

export function TestRequirementDetail({ item, open, onClose }: Props) {
  const { t } = useTranslation();

  const { data: children = [] } = testRequirementApi.getChildren.useQuery(
    { id: item?.id ?? "" },
    { enabled: !!item?.id },
  );

  if (!item) return null;

  const InfoRow = ({
    label,
    children: value,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-start gap-2 py-1.5">
      <span className="w-24 shrink-0 text-sm text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );

  return (
    <Modal
      title={`${item.code} - ${item.title}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <div className="space-y-4 pt-2">
        {/* Basic Info */}
        <div className="rounded-md border border-[var(--border)] p-3">
          <h4 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.detail.basicInfo")}
          </h4>
          <InfoRow label={t("testRequirement.columns.type")}>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${typeColor(item.type)}`}
            >
              {t(`testRequirement.type.${item.type}`)}
            </span>
          </InfoRow>
          <InfoRow label={t("testRequirement.columns.status")}>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor(item.status)}`}
            >
              {t(`testRequirement.status.${item.status}`)}
            </span>
          </InfoRow>
          <InfoRow label={t("testRequirement.columns.priority")}>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${priorityColor(item.priority)}`}
            >
              {t(`testRequirement.priority.${item.priority}`)}
            </span>
          </InfoRow>
        </div>

        {/* Description */}
        <div>
          <h4 className="mb-1 text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.detail.description")}
          </h4>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {item.description || t("testRequirement.detail.noDescription")}
          </p>
        </div>

        {/* Content */}
        {item.content && (
          <div>
            <h4 className="mb-1 text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.detail.content")}
            </h4>
            <div className="whitespace-pre-wrap rounded-md bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-primary)]">
              {item.content}
            </div>
          </div>
        )}

        {/* Time Info */}
        <div className="rounded-md border border-[var(--border)] p-3">
          <h4 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
            {t("testRequirement.detail.timeInfo")}
          </h4>
          <InfoRow label={t("testRequirement.detail.createdAt")}>
            {new Date(item.createdAt).toLocaleString()}
          </InfoRow>
          <InfoRow label={t("testRequirement.detail.updatedAt")}>
            {new Date(item.updatedAt).toLocaleString()}
          </InfoRow>
          <InfoRow label={t("testRequirement.detail.dueDate")}>
            {item.dueDate
              ? new Date(item.dueDate).toLocaleDateString()
              : t("testRequirement.detail.notSet")}
          </InfoRow>
          <InfoRow label={t("testRequirement.detail.estimatedHours")}>
            {item.estimatedHours
              ? `${item.estimatedHours} ${t("testRequirement.detail.hours")}`
              : t("testRequirement.detail.notSet")}
          </InfoRow>
          <InfoRow label={t("testRequirement.detail.actualHours")}>
            {item.actualHours
              ? `${item.actualHours} ${t("testRequirement.detail.hours")}`
              : t("testRequirement.detail.notSet")}
          </InfoRow>
        </div>

        {/* Children */}
        {children.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
              {t("testRequirement.children")} ({children.length})
            </h4>
            <div className="space-y-1">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 rounded-md border border-[var(--border)] p-2"
                >
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {child.code}
                  </span>
                  <span className="flex-1 text-sm text-[var(--text-primary)]">
                    {child.title}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${statusColor(child.status)}`}
                  >
                    {t(`testRequirement.status.${child.status}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
