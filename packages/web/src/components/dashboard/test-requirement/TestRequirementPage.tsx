import { Popconfirm, Table } from "@acme/components";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type TestRequirementOutput,
  testRequirementApi,
} from "@/generated/rust-api/test-requirement";
import { useWorkspace } from "@/hooks";
import { message } from "@/lib/message";
import { TestRequirementDetail } from "./TestRequirementDetail";
import { TestRequirementModal } from "./TestRequirementModal";

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

export function typeColor(type: string): string {
  const map: Record<string, string> = {
    functional:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    performance:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    security: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    usability:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    compatibility:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return map[type] ?? map.other;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    obsolete:
      "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
  };
  return map[status] ?? map.draft;
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return map[priority] ?? map.low;
}

export function TestRequirementPage() {
  const { t } = useTranslation();
  const workspace = useWorkspace();

  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TestRequirementOutput | null>(
    null,
  );
  const [detailItem, setDetailItem] = useState<TestRequirementOutput | null>(
    null,
  );

  const {
    data: items = [],
    isLoading,
    refetch,
  } = testRequirementApi.list.useQuery({
    workspaceId: workspace.id,
    type: filterType || undefined,
    status: filterStatus || undefined,
    priority: filterPriority || undefined,
  });

  const createMutation = testRequirementApi.create.useMutation({
    onSuccess: () => {
      message.success(t("testRequirement.createSuccess"));
      setModalOpen(false);
      refetch();
    },
  });

  const updateMutation = testRequirementApi.update.useMutation({
    onSuccess: () => {
      message.success(t("testRequirement.updateSuccess"));
      setModalOpen(false);
      setEditingItem(null);
      refetch();
    },
  });

  const deleteMutation = testRequirementApi.delete.useMutation({
    onSuccess: () => {
      message.success(t("testRequirement.deleteSuccess"));
      refetch();
    },
  });

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: TestRequirementOutput) => {
    setEditingItem(item);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
  }, []);

  const selectClass =
    "rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none";

  const columns = useMemo(
    () => [
      {
        title: t("testRequirement.columns.code"),
        dataIndex: "code",
        key: "code",
        width: 120,
        render: (_: unknown, record: TestRequirementOutput) => (
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {record.code}
          </span>
        ),
      },
      {
        title: t("testRequirement.columns.title"),
        dataIndex: "title",
        key: "title",
        ellipsis: true,
        render: (_: unknown, record: TestRequirementOutput) => (
          <button
            type="button"
            onClick={() => setDetailItem(record)}
            className="text-left text-sm text-[var(--primary)] hover:underline"
          >
            {record.title}
          </button>
        ),
      },
      {
        title: t("testRequirement.columns.type"),
        dataIndex: "type",
        key: "type",
        width: 110,
        render: (_: unknown, record: TestRequirementOutput) => (
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${typeColor(record.type)}`}
          >
            {t(`testRequirement.type.${record.type}`)}
          </span>
        ),
      },
      {
        title: t("testRequirement.columns.status"),
        dataIndex: "status",
        key: "status",
        width: 100,
        render: (_: unknown, record: TestRequirementOutput) => (
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColor(record.status)}`}
          >
            {t(`testRequirement.status.${record.status}`)}
          </span>
        ),
      },
      {
        title: t("testRequirement.columns.priority"),
        dataIndex: "priority",
        key: "priority",
        width: 90,
        render: (_: unknown, record: TestRequirementOutput) => (
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${priorityColor(record.priority)}`}
          >
            {t(`testRequirement.priority.${record.priority}`)}
          </span>
        ),
      },
      {
        title: t("testRequirement.columns.createdAt"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        render: (_: unknown, record: TestRequirementOutput) => (
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(record.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        title: t("testRequirement.columns.actions"),
        key: "actions",
        width: 140,
        render: (_: unknown, record: TestRequirementOutput) => (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setDetailItem(record)}
              className="rounded px-2 py-1 text-xs text-[var(--primary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              {t("testRequirement.actions.view")}
            </button>
            <button
              type="button"
              onClick={() => handleOpenEdit(record)}
              className="rounded px-2 py-1 text-xs text-[var(--primary)] transition-colors hover:bg-[var(--bg-secondary)]"
            >
              {t("testRequirement.actions.edit")}
            </button>
            <Popconfirm
              title={t("testRequirement.confirmDelete")}
              description={t("testRequirement.confirmDeleteDesc")}
              onConfirm={() => deleteMutation.mutate({ id: record.id })}
            >
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                {t("testRequirement.actions.delete")}
              </button>
            </Popconfirm>
          </div>
        ),
      },
    ],
    [t, handleOpenEdit, deleteMutation],
  );

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t("testRequirement.title")}
        </h2>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white transition-colors hover:opacity-90"
        >
          {t("testRequirement.create")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={selectClass}
        >
          <option value="">{t("testRequirement.filters.allTypes")}</option>
          {TYPES.map((v) => (
            <option key={v} value={v}>
              {t(`testRequirement.type.${v}`)}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">{t("testRequirement.filters.allStatuses")}</option>
          {STATUSES.map((v) => (
            <option key={v} value={v}>
              {t(`testRequirement.status.${v}`)}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className={selectClass}
        >
          <option value="">{t("testRequirement.filters.allPriorities")}</option>
          {PRIORITIES.map((v) => (
            <option key={v} value={v}>
              {t(`testRequirement.priority.${v}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{ emptyText: t("testRequirement.noData") }}
        size="small"
      />

      {/* Create/Edit Modal */}
      <TestRequirementModal
        open={modalOpen}
        onClose={handleCloseModal}
        editingItem={editingItem}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ ...data, id: editingItem.id });
          } else {
            createMutation.mutate({ ...data, workspaceId: workspace.id });
          }
        }}
      />

      {/* Detail Modal */}
      <TestRequirementDetail
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
