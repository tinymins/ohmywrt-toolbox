import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, Divider, Form, Input, Modal, Space, Table, Tag, Tabs } from "antd";
import { DeleteOutlined, ExclamationCircleOutlined, PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import { useMessage } from "../../hooks";
import type { Lang } from "../../lib/types";
import { trpc } from "../../lib/trpc";

type SettingsPageProps = {
  lang: Lang;
};

export default function SettingsPage({ lang }: SettingsPageProps) {
  const { workspace: workspaceSlug } = useParams<{ workspace: string }>();
  const navigate = useNavigate();
  const message = useMessage();
  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const utils = trpc.useUtils();

  // Queries
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: workspaceSlug ?? "" },
    { enabled: !!workspaceSlug }
  );
  const workspacesQuery = trpc.workspace.list.useQuery();

  const workspace = workspaceQuery.data;

  // Mutations
  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: async (data) => {
      message.success(lang === "zh" ? "保存成功" : "Saved successfully");

      // If slug changed, use optimistic update to avoid flickering
      if (data.slug !== workspaceSlug) {
        // Update the workspace list cache with the new slug
        const currentList = utils.workspace.list.getData();
        if (currentList) {
          utils.workspace.list.setData(undefined,
            currentList.map(ws => ws.id === data.id ? data : ws)
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
        await utils.workspace.getBySlug.invalidate({ slug: workspaceSlug ?? "" });
      }
    },
    onError: (error) => {
      message.error(error.message || (lang === "zh" ? "保存失败" : "Failed to save"));
    },
  });

  const deleteMutation = trpc.workspace.delete.useMutation({
    onSuccess: async () => {
      message.success(lang === "zh" ? "空间站已删除" : "Workspace deleted");
      await utils.workspace.list.invalidate();

      // Navigate to first available workspace or home
      const workspaces = workspacesQuery.data ?? [];
      const remainingWorkspace = workspaces.find((ws) => ws.slug !== workspaceSlug);
      if (remainingWorkspace) {
        navigate(`/dashboard/${remainingWorkspace.slug}`);
      } else {
        navigate("/");
      }
    },
    onError: (error) => {
      message.error(error.message || (lang === "zh" ? "删除失败" : "Failed to delete"));
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
      title: lang === "zh" ? "确认删除空间站" : "Confirm Delete Workspace",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            {lang === "zh"
              ? `确定要删除空间站 "${workspace.name}" 吗？此操作无法撤销。`
              : `Are you sure you want to delete workspace "${workspace.name}"? This action cannot be undone.`}
          </p>
          <p className="mt-2 text-red-600 dark:text-red-400">
            {lang === "zh"
              ? "所有相关数据（包括待办事项）将被永久删除。"
              : "All related data (including todos) will be permanently deleted."}
          </p>
        </div>
      ),
      okText: lang === "zh" ? "确认删除" : "Delete",
      okType: "danger",
      cancelText: lang === "zh" ? "取消" : "Cancel",
      onOk: async () => {
        await deleteMutation.mutateAsync({ id: workspace.id });
      },
    });
  };

  const handleInviteMember = async () => {
    try {
      const values = await inviteForm.validateFields();
      message.info(
        lang === "zh"
          ? `邀请功能开发中：将向 ${values.email} 发送邀请邮件`
          : `Invite feature coming soon: Will send invitation to ${values.email}`
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
      name: lang === "zh" ? "空间站创建者" : "Workspace Owner",
      role: "owner",
      joinedAt: "2024-01-15",
    },
  ];

  const memberColumns = [
    {
      title: lang === "zh" ? "成员" : "Member",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: typeof mockMembers[0]) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-slate-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: lang === "zh" ? "角色" : "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag color={role === "owner" ? "blue" : "default"}>
          {role === "owner" ? (lang === "zh" ? "创建者" : "Owner") : (lang === "zh" ? "成员" : "Member")}
        </Tag>
      ),
    },
    {
      title: lang === "zh" ? "加入时间" : "Joined",
      dataIndex: "joinedAt",
      key: "joinedAt",
    },
    {
      title: lang === "zh" ? "操作" : "Actions",
      key: "actions",
      render: (_: unknown, record: typeof mockMembers[0]) =>
        record.role !== "owner" ? (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => {
              message.info(lang === "zh" ? "移除成员功能开发中" : "Remove member feature coming soon");
            }}
          >
            {lang === "zh" ? "移除" : "Remove"}
          </Button>
        ) : null,
    },
  ];

  if (workspaceQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-500">{lang === "zh" ? "加载中..." : "Loading..."}</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-500">{lang === "zh" ? "空间站不存在" : "Workspace not found"}</div>
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
      label: lang === "zh" ? "基础设置" : "General",
      children: (
        <Card>
          <Form form={form} layout="vertical" className="max-w-2xl">
            <Form.Item
              name="name"
              label={lang === "zh" ? "空间站名称" : "Workspace Name"}
              rules={[
                { required: true, message: lang === "zh" ? "请输入名称" : "Please enter name" },
                { min: 1, max: 50, message: lang === "zh" ? "名称长度为 1-50 个字符" : "Name length should be 1-50 characters" },
              ]}
            >
              <Input placeholder={lang === "zh" ? "例如：我的项目" : "e.g., My Project"} maxLength={50} />
            </Form.Item>

            <Form.Item
              name="slug"
              label={lang === "zh" ? "空间站标识（URL）" : "Workspace Slug (URL)"}
              rules={[
                { required: true, message: lang === "zh" ? "请输入标识" : "Please enter slug" },
                {
                  pattern: /^[a-z0-9-]+$/,
                  message: lang === "zh" ? "只能包含小写字母、数字和连字符" : "Only lowercase letters, numbers and hyphens allowed",
                },
              ]}
              extra={lang === "zh" ? "用于访问地址，例如：/dashboard/my-project" : "Used in URL, e.g., /dashboard/my-project"}
            >
              <Input placeholder="my-project" maxLength={50} />
            </Form.Item>

            <Form.Item
              name="description"
              label={lang === "zh" ? "描述" : "Description"}
            >
              <Input.TextArea
                placeholder={lang === "zh" ? "简要描述这个空间站..." : "Briefly describe this workspace..."}
                rows={3}
                maxLength={200}
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" onClick={handleSave} loading={updateMutation.isPending}>
                {lang === "zh" ? "保存更改" : "Save Changes"}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: "members",
      label: lang === "zh" ? "成员管理" : "Members",
      children: (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{lang === "zh" ? "成员列表" : "Team Members"}</h3>
              <p className="text-sm text-slate-500">
                {lang === "zh" ? "管理空间站成员和权限" : "Manage workspace members and permissions"}
              </p>
            </div>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setInviteModalOpen(true)}
            >
              {lang === "zh" ? "邀请成员" : "Invite Member"}
            </Button>
          </div>
          <Table columns={memberColumns} dataSource={mockMembers} pagination={false} />

          {/* Invite Member Modal */}
          <Modal
            title={lang === "zh" ? "邀请成员" : "Invite Member"}
            open={inviteModalOpen}
            onOk={handleInviteMember}
            onCancel={() => {
              inviteForm.resetFields();
              setInviteModalOpen(false);
            }}
            okText={lang === "zh" ? "发送邀请" : "Send Invite"}
            cancelText={lang === "zh" ? "取消" : "Cancel"}
          >
            <Form form={inviteForm} layout="vertical" className="mt-6">
              <Form.Item
                name="email"
                label={lang === "zh" ? "邮箱地址" : "Email Address"}
                rules={[
                  { required: true, message: lang === "zh" ? "请输入邮箱" : "Please enter email" },
                  { type: "email", message: lang === "zh" ? "请输入有效邮箱" : "Please enter valid email" },
                ]}
              >
                <Input placeholder="user@example.com" />
              </Form.Item>
              <Form.Item
                name="role"
                label={lang === "zh" ? "角色" : "Role"}
                initialValue="member"
              >
                <Tag color="default">{lang === "zh" ? "成员（默认）" : "Member (Default)"}</Tag>
                <p className="mt-2 text-xs text-slate-500">
                  {lang === "zh" ? "成员可以查看和编辑空间站内容" : "Members can view and edit workspace content"}
                </p>
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      ),
    },
    {
      key: "danger",
      label: lang === "zh" ? "危险区域" : "Danger Zone",
      children: (
        <Card>
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                {lang === "zh" ? "删除空间站" : "Delete Workspace"}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {lang === "zh"
                  ? "删除后，所有数据将被永久清除，且无法恢复。"
                  : "Once deleted, all data will be permanently removed and cannot be recovered."}
              </p>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={deleteMutation.isPending}
                className="mt-4"
              >
                {lang === "zh" ? "删除空间站" : "Delete Workspace"}
              </Button>
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          {lang === "zh" ? "空间站设置" : "Workspace Settings"}
        </h1>
        <p className="mt-1 text-slate-500">
          {lang === "zh"
            ? `管理 "${workspace.name}" 的配置和成员`
            : `Manage "${workspace.name}" configuration and members`}
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs items={tabItems} />
    </div>
  );
}
