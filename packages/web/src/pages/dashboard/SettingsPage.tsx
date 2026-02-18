import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, Table, Tabs, Tag } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useMessage } from "../../hooks";
import { trpc } from "../../lib/trpc";
import { SYSTEM_SHARED_SLUG } from "../../main";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { workspace: workspaceSlugFromUrl } = useParams<{
    workspace: string;
  }>();
  // 查询系统设置判断是否为单一空间模式
  const systemSettingsQuery = trpc.auth.systemSettings.useQuery();
  const singleWorkspaceMode =
    systemSettingsQuery.data?.singleWorkspaceMode ?? false;
  // 在单一空间模式下使用系统共享空间，否则使用 URL 参数
  const workspaceSlug = singleWorkspaceMode
    ? SYSTEM_SHARED_SLUG
    : workspaceSlugFromUrl;

  const navigate = useNavigate();
  const message = useMessage();
  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const utils = trpc.useUtils();

  // Queries
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: workspaceSlug ?? "" },
    { enabled: !!workspaceSlug },
  );
  const workspacesQuery = trpc.workspace.list.useQuery();

  const workspace = workspaceQuery.data;

  // Mutations
  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: async (data) => {
      message.success(t("common.saveSuccess"));

      // In single workspace mode, don't navigate on slug change
      if (singleWorkspaceMode) {
        await utils.workspace.list.invalidate();
        await utils.workspace.getBySlug.invalidate({ slug: "shared" });
        return;
      }

      // If slug changed, use optimistic update to avoid flickering
      if (data.slug !== workspaceSlug) {
        // Update the workspace list cache with the new slug
        const currentList = utils.workspace.list.getData();
        if (currentList) {
          utils.workspace.list.setData(
            undefined,
            currentList.map((ws) => (ws.id === data.id ? data : ws)),
          );
        }

        // Set the new workspace data in cache before navigating
        utils.workspace.getBySlug.setData({ slug: data.slug }, data);

        // Navigate to new URL with replace to avoid history clutter
        navigate(`/dashboard/${data.slug}/settings`, { replace: true });

        // Then invalidate to ensure fresh data
        await utils.workspace.list.invalidate();
        await utils.workspace.getBySlug.invalidate({ slug: data.slug });
      } else {
        // If slug didn't change, just invalidate normally
        await utils.workspace.list.invalidate();
        await utils.workspace.getBySlug.invalidate({
          slug: workspaceSlug ?? "",
        });
      }
    },
    onError: (error) => {
      message.error(error.message || t("common.saveFailed"));
    },
  });

  const deleteMutation = trpc.workspace.delete.useMutation({
    onSuccess: async () => {
      message.success(t("dashboard.settings.workspaceDeleted"));
      await utils.workspace.list.invalidate();

      // Navigate to first available workspace or home
      const workspaces = workspacesQuery.data ?? [];
      const remainingWorkspace = workspaces.find(
        (ws) => ws.slug !== workspaceSlug,
      );
      if (remainingWorkspace) {
        navigate(`/dashboard/${remainingWorkspace.slug}`);
      } else {
        navigate("/");
      }
    },
    onError: (error) => {
      message.error(error.message || t("common.deleteFailed"));
    },
  });

  const handleSave = async () => {
    if (!workspace) return;

    try {
      const values = await form.validateFields();
      await updateMutation.mutateAsync({
        id: workspace.id,
        name: values.name,
        slug: values.slug,
        description: values.description || null,
      });
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleDelete = () => {
    if (!workspace) return;

    Modal.confirm({
      title: t("dashboard.settings.confirmDeleteTitle"),
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            {t("dashboard.settings.confirmDeleteContent", {
              name: workspace.name,
            })}
          </p>
          <p className="mt-2 text-red-600 dark:text-red-400">
            {t("dashboard.settings.confirmDeleteWarning")}
          </p>
        </div>
      ),
      okText: t("dashboard.settings.confirmDeleteOk"),
      okType: "danger",
      cancelText: t("common.cancel"),
      onOk: async () => {
        await deleteMutation.mutateAsync({ id: workspace.id });
      },
    });
  };

  const handleInviteMember = async () => {
    try {
      const values = await inviteForm.validateFields();
      message.info(
        t("dashboard.settings.inviteComingSoon", { email: values.email }),
      );
      inviteForm.resetFields();
      setInviteModalOpen(false);
    } catch (error) {
      console.error("Invite error:", error);
    }
  };

  // Mock members data for UI demonstration
  const mockMembers = [
    {
      key: "1",
      email: "owner@example.com",
      name: t("dashboard.settings.workspaceOwner"),
      role: "owner",
      joinedAt: "2024-01-15",
    },
  ];

  const memberColumns = [
    {
      title: t("dashboard.settings.tableColumnMember"),
      dataIndex: "name",
      key: "name",
      render: (text: string, record: (typeof mockMembers)[0]) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-slate-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: t("dashboard.settings.tableColumnRole"),
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={role === "owner" ? "blue" : "default"}>
          {role === "owner" ? t("common.owner") : t("common.member")}
        </Tag>
      ),
    },
    {
      title: t("dashboard.settings.tableColumnJoined"),
      dataIndex: "joinedAt",
      key: "joinedAt",
    },
    {
      title: t("dashboard.settings.tableColumnActions"),
      key: "actions",
      render: (_: unknown, record: (typeof mockMembers)[0]) =>
        record.role !== "owner" ? (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              message.info(t("dashboard.settings.removeMemberComingSoon"));
            }}
          >
            {t("common.remove")}
          </Button>
        ) : null,
    },
  ];

  if (workspaceQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-500">{t("common.loading")}</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-500">
          {t("dashboard.settings.workspaceNotFound")}
        </div>
      </div>
    );
  }

  // Set initial form values
  if (!form.isFieldsTouched()) {
    form.setFieldsValue({
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description ?? "",
    });
  }

  const tabItems = [
    {
      key: "general",
      label: t("dashboard.settings.generalTab"),
      children: (
        <Card>
          <Form form={form} layout="vertical" className="max-w-2xl">
            <Form.Item
              name="name"
              label={t("dashboard.settings.workspaceName")}
              rules={[
                {
                  required: true,
                  message: t("dashboard.settings.workspaceNameRequired"),
                },
                {
                  min: 1,
                  max: 50,
                  message: t("dashboard.settings.workspaceNameLength"),
                },
              ]}
            >
              <Input
                placeholder={t("dashboard.settings.workspaceNamePlaceholder")}
                maxLength={50}
              />
            </Form.Item>

            {/* 单一空间模式下隐藏 slug 字段 */}
            {!singleWorkspaceMode && (
              <Form.Item
                name="slug"
                label={t("dashboard.settings.workspaceSlug")}
                rules={[
                  {
                    required: true,
                    message: t("dashboard.settings.workspaceSlugRequired"),
                  },
                  {
                    pattern: /^[a-z0-9-]+$/,
                    message: t("dashboard.settings.workspaceSlugPattern"),
                  },
                ]}
                extra={t("dashboard.settings.workspaceSlugExtra")}
              >
                <Input placeholder="my-project" maxLength={50} />
              </Form.Item>
            )}

            <Form.Item
              name="description"
              label={t("dashboard.settings.description")}
            >
              <Input.TextArea
                placeholder={t("dashboard.settings.descriptionPlaceholder")}
                rows={3}
                maxLength={200}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                onClick={handleSave}
                loading={updateMutation.isPending}
              >
                {t("common.saveChanges")}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: "members",
      label: t("dashboard.settings.membersTab"),
      children: (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {t("dashboard.settings.memberList")}
              </h3>
              <p className="text-sm text-slate-500">
                {t("dashboard.settings.memberListDesc")}
              </p>
            </div>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setInviteModalOpen(true)}
            >
              {t("dashboard.settings.inviteMember")}
            </Button>
          </div>
          <Table
            columns={memberColumns}
            dataSource={mockMembers}
            pagination={false}
          />

          {/* Invite Member Modal */}
          <Modal
            title={t("dashboard.settings.inviteModalTitle")}
            open={inviteModalOpen}
            onOk={handleInviteMember}
            onCancel={() => {
              inviteForm.resetFields();
              setInviteModalOpen(false);
            }}
            okText={t("dashboard.settings.sendInvite")}
            cancelText={t("common.cancel")}
          >
            <Form form={inviteForm} layout="vertical" className="mt-6">
              <Form.Item
                name="email"
                label={t("dashboard.settings.emailAddress")}
                rules={[
                  {
                    required: true,
                    message: t("dashboard.settings.emailRequired"),
                  },
                  {
                    type: "email",
                    message: t("dashboard.settings.emailInvalid"),
                  },
                ]}
              >
                <Input placeholder="user@example.com" />
              </Form.Item>
              <Form.Item
                name="role"
                label={t("dashboard.settings.role")}
                initialValue="member"
              >
                <Tag color="default">
                  {t("dashboard.settings.memberDefault")}
                </Tag>
                <p className="mt-2 text-xs text-slate-500">
                  {t("dashboard.settings.memberPermissionDesc")}
                </p>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      ),
    },
    // 单一空间模式下隐藏危险区域
    ...(!singleWorkspaceMode
      ? [
          {
            key: "danger",
            label: t("dashboard.settings.dangerTab"),
            children: (
              <Card>
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {t("dashboard.settings.deleteWorkspace")}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {t("dashboard.settings.deleteWorkspaceDesc")}
                    </p>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleDelete}
                      loading={deleteMutation.isPending}
                      className="mt-4"
                    >
                      {t("dashboard.settings.deleteWorkspace")}
                    </Button>
                  </div>
                </div>
              </Card>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          {t("dashboard.settings.title")}
        </h1>
        <p className="mt-1 text-slate-500">
          {t("dashboard.settings.subtitle", { name: workspace.name })}
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs items={tabItems} />
    </div>
  );
}
