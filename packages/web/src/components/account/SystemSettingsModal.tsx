import type { AdminUser, InvitationCode, User, UserRole } from "@acme/types";
import { CopyOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons";
import { TRPCClientError } from "@trpc/client";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../hooks";
import { trpc } from "../../lib/trpc";

type SystemSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
};

export default function SystemSettingsModal({
  open,
  onClose,
  user,
}: SystemSettingsModalProps) {
  const { t } = useTranslation();
  const message = useMessage();
  const isSuperAdmin = user.role === "superadmin";

  // 系统设置查询
  const settingsQuery = trpc.admin.getSystemSettings.useQuery(undefined, {
    enabled: open,
  });
  const updateSettingsMutation = trpc.admin.updateSystemSettings.useMutation();

  // 用户列表查询（仅超管）
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, {
    enabled: open && isSuperAdmin,
  });
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation();
  const forceResetPasswordMutation =
    trpc.admin.forceResetPassword.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const createUserMutation = trpc.admin.createUser.useMutation();

  // 邀请码查询（仅超管）
  const invitationsQuery = trpc.admin.listInvitationCodes.useQuery(undefined, {
    enabled: open && isSuperAdmin,
  });
  const generateInvitationMutation =
    trpc.admin.generateInvitationCode.useMutation();
  const deleteInvitationMutation =
    trpc.admin.deleteInvitationCode.useMutation();

  // 重置密码模态框状态
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: "", userName: "" });
  const [newPassword, setNewPassword] = useState("");

  // 添加用户模态框状态
  const [addUserModal, setAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UserRole,
  });

  // 邀请码有效期设置
  const [invitationExpiresHours, setInvitationExpiresHours] = useState<
    number | null
  >(null);

  const handleToggleRegistration = async (checked: boolean) => {
    await updateSettingsMutation.mutateAsync({ allowRegistration: checked });
    settingsQuery.refetch();
    message.success(t("systemSettings.saveSuccess"));
  };

  const handleToggleSingleWorkspaceMode = async (checked: boolean) => {
    await updateSettingsMutation.mutateAsync({ singleWorkspaceMode: checked });
    settingsQuery.refetch();
    message.success(t("systemSettings.saveSuccess"));
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    await updateRoleMutation.mutateAsync({ userId, role });
    usersQuery.refetch();
    message.success(t("systemSettings.saveSuccess"));
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync({ userId });
    usersQuery.refetch();
    message.success(t("systemSettings.deleteSuccess"));
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      message.error(t("systemSettings.passwordMinLength"));
      return;
    }
    await forceResetPasswordMutation.mutateAsync({
      userId: resetPasswordModal.userId,
      newPassword,
    });
    setResetPasswordModal({ open: false, userId: "", userName: "" });
    setNewPassword("");
    message.success(t("systemSettings.resetSuccess"));
  };

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.email || !addUserForm.password) {
      message.error(t("systemSettings.fillAllFields"));
      return;
    }
    if (addUserForm.password.length < 4) {
      message.error(t("systemSettings.passwordMinLength"));
      return;
    }
    try {
      await createUserMutation.mutateAsync(addUserForm);
      setAddUserModal(false);
      setAddUserForm({ name: "", email: "", password: "", role: "user" });
      usersQuery.refetch();
      message.success(t("systemSettings.addUserSuccess"));
    } catch (error: unknown) {
      if (error instanceof TRPCClientError && error.data?.code === "CONFLICT") {
        message.error(t("systemSettings.emailExists"));
      } else {
        throw error;
      }
    }
  };

  // 邀请码处理函数
  const handleGenerateInvitation = async () => {
    const result = await generateInvitationMutation.mutateAsync({
      expiresInHours: invitationExpiresHours ?? undefined,
    });
    invitationsQuery.refetch();
    // 自动复制到剪贴板
    const inviteUrl = `${window.location.origin}/login?invite=${result.code}`;
    await navigator.clipboard.writeText(inviteUrl);
    message.success(t("systemSettings.invitationGenerated"));
  };

  const handleCopyInvitationLink = async (code: string) => {
    const inviteUrl = `${window.location.origin}/login?invite=${code}`;
    await navigator.clipboard.writeText(inviteUrl);
    message.success(t("systemSettings.invitationCopied"));
  };

  const handleDeleteInvitation = async (codeId: string) => {
    await deleteInvitationMutation.mutateAsync({ codeId });
    invitationsQuery.refetch();
    message.success(t("systemSettings.invitationDeleted"));
  };

  const getInvitationStatus = (invitation: InvitationCode) => {
    if (invitation.usedBy) {
      return (
        <Tag color="default">{t("systemSettings.invitationStatusUsed")}</Tag>
      );
    }
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return (
        <Tag color="red">{t("systemSettings.invitationStatusExpired")}</Tag>
      );
    }
    return (
      <Tag color="green">{t("systemSettings.invitationStatusUnused")}</Tag>
    );
  };

  const getRoleTag = (role: UserRole) => {
    const config: Record<UserRole, { color: string; label: string }> = {
      superadmin: { color: "red", label: t("systemSettings.roleSuperAdmin") },
      admin: { color: "blue", label: t("systemSettings.roleAdmin") },
      user: { color: "default", label: t("systemSettings.roleUser") },
    };
    return <Tag color={config[role].color}>{config[role].label}</Tag>;
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: t("systemSettings.userNameColumn"),
      dataIndex: "name",
      key: "name",
      width: 100,
    },
    {
      title: t("systemSettings.emailColumn"),
      dataIndex: "email",
      key: "email",
      width: 160,
    },
    {
      title: t("systemSettings.userRole"),
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (role: UserRole) => getRoleTag(role),
    },
    {
      title: t("systemSettings.lastLoginAt"),
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 100,
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : t("systemSettings.neverLogin"),
    },
    {
      title: t("systemSettings.userCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: t("systemSettings.userActions"),
      key: "actions",
      width: 280,
      render: (_, record) => {
        const isCurrentUser = record.id === user.id;
        const isSuperAdminUser = record.role === "superadmin";

        return (
          <Space size="small">
            <Select
              size="small"
              value={record.role}
              disabled={isCurrentUser || isSuperAdminUser}
              style={{ width: 120 }}
              onChange={(role) => handleChangeRole(record.id, role)}
              options={[
                { value: "user", label: t("systemSettings.roleUser") },
                { value: "admin", label: t("systemSettings.roleAdmin") },
                {
                  value: "superadmin",
                  label: t("systemSettings.roleSuperAdmin"),
                },
              ]}
            />
            <Button
              size="small"
              disabled={isCurrentUser}
              onClick={() =>
                setResetPasswordModal({
                  open: true,
                  userId: record.id,
                  userName: record.name,
                })
              }
            >
              {t("systemSettings.resetPassword")}
            </Button>
            <Popconfirm
              title={t("systemSettings.confirmDelete")}
              description={t("systemSettings.confirmDeleteDesc", {
                name: record.name,
              })}
              onConfirm={() => handleDeleteUser(record.id)}
              disabled={isCurrentUser || isSuperAdminUser}
            >
              <Button
                size="small"
                danger
                disabled={isCurrentUser || isSuperAdminUser}
              >
                {t("systemSettings.deleteUser")}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const generalTab = (
    <div className="space-y-6">
      <Form layout="vertical">
        <Form.Item
          label={t("systemSettings.allowRegistration")}
          extra={t("systemSettings.allowRegistrationDesc")}
        >
          <Switch
            checked={settingsQuery.data?.allowRegistration ?? true}
            onChange={handleToggleRegistration}
            loading={updateSettingsMutation.isPending}
          />
        </Form.Item>
        {/* 仅当超管且未被环境变量覆盖时显示单一空间模式开关 */}
        {isSuperAdmin && !settingsQuery.data?.singleWorkspaceModeOverridden && (
          <Form.Item
            label={t("systemSettings.singleWorkspaceMode")}
            extra={t("systemSettings.singleWorkspaceModeDesc")}
          >
            <Switch
              checked={settingsQuery.data?.singleWorkspaceMode ?? false}
              onChange={handleToggleSingleWorkspaceMode}
              loading={updateSettingsMutation.isPending}
            />
          </Form.Item>
        )}
      </Form>
    </div>
  );

  const usersTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddUserModal(true)}
        >
          {t("systemSettings.addUser")}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={usersQuery.data ?? []}
        rowKey="id"
        loading={usersQuery.isLoading}
        size="small"
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );

  const invitationColumns: ColumnsType<InvitationCode> = [
    {
      title: t("systemSettings.invitationCode"),
      dataIndex: "code",
      key: "code",
      render: (code: string) => (
        <Tooltip title={code}>
          <code className="text-xs">{code.slice(0, 8)}...</code>
        </Tooltip>
      ),
    },
    {
      title: t("systemSettings.invitationStatus"),
      key: "status",
      render: (_, record) => getInvitationStatus(record),
    },
    {
      title: t("systemSettings.invitationExpiresAt"),
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (date: string | null) =>
        date
          ? new Date(date).toLocaleString()
          : t("systemSettings.invitationNeverExpire"),
    },
    {
      title: t("systemSettings.invitationCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t("systemSettings.userActions"),
      key: "actions",
      render: (_, record) => {
        const isUsed = !!record.usedBy;
        return (
          <Space size="small">
            <Button
              size="small"
              icon={<CopyOutlined />}
              disabled={isUsed}
              onClick={() => handleCopyInvitationLink(record.code)}
            >
              {t("systemSettings.copyInvitationLink")}
            </Button>
            <Popconfirm
              title={t("systemSettings.confirmDelete")}
              onConfirm={() => handleDeleteInvitation(record.id)}
            >
              <Button size="small" danger>
                {t("systemSettings.deleteInvitation")}
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const invitationsTab = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Space.Compact>
          <InputNumber
            placeholder={t("systemSettings.expiresInHours")}
            min={1}
            value={invitationExpiresHours}
            onChange={(v) => setInvitationExpiresHours(v)}
            style={{ width: 140 }}
          />
          <Button disabled>{t("systemSettings.hoursUnit")}</Button>
        </Space.Compact>
        <span className="text-slate-500 text-sm">
          {invitationExpiresHours ? "" : t("systemSettings.noExpiration")}
        </span>
        <Button
          type="primary"
          icon={<LinkOutlined />}
          onClick={handleGenerateInvitation}
          loading={generateInvitationMutation.isPending}
        >
          {t("systemSettings.generateInvitation")}
        </Button>
      </div>
      <Table
        columns={invitationColumns}
        dataSource={invitationsQuery.data ?? []}
        rowKey="id"
        loading={invitationsQuery.isLoading}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );

  const tabItems = [
    {
      key: "general",
      label: t("systemSettings.generalTab"),
      children: generalTab,
    },
    // 超管才显示用户管理 Tab
    ...(isSuperAdmin
      ? [
          {
            key: "users",
            label: t("systemSettings.usersTab"),
            children: usersTab,
          },
          {
            key: "invitations",
            label: t("systemSettings.invitationTab"),
            children: invitationsTab,
          },
        ]
      : []),
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={t("systemSettings.title")}
        footer={null}
        width={isSuperAdmin ? 900 : 500}
        destroyOnHidden
      >
        <Tabs items={tabItems} />
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        open={resetPasswordModal.open}
        onCancel={() => {
          setResetPasswordModal({ open: false, userId: "", userName: "" });
          setNewPassword("");
        }}
        title={t("systemSettings.resetPasswordTitle")}
        onOk={handleResetPassword}
        confirmLoading={forceResetPasswordMutation.isPending}
      >
        <p className="mb-4 text-slate-600 dark:text-slate-400">
          {t("systemSettings.resetPasswordDesc", {
            name: resetPasswordModal.userName,
          })}
        </p>
        <Form layout="vertical">
          <Form.Item label={t("systemSettings.newPassword")} required>
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("systemSettings.newPasswordPlaceholder")}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加用户模态框 */}
      <Modal
        open={addUserModal}
        onCancel={() => {
          setAddUserModal(false);
          setAddUserForm({ name: "", email: "", password: "", role: "user" });
        }}
        title={t("systemSettings.addUserTitle")}
        onOk={handleAddUser}
        confirmLoading={createUserMutation.isPending}
      >
        <p className="mb-4 text-slate-600 dark:text-slate-400">
          {t("systemSettings.addUserDesc")}
        </p>
        <Form layout="vertical">
          <Form.Item label={t("systemSettings.userName")} required>
            <Input
              value={addUserForm.name}
              onChange={(e) =>
                setAddUserForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder={t("systemSettings.usernamePlaceholder")}
            />
          </Form.Item>
          <Form.Item label={t("systemSettings.userEmail")} required>
            <Input
              type="email"
              value={addUserForm.email}
              onChange={(e) =>
                setAddUserForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder={t("systemSettings.emailPlaceholder")}
            />
          </Form.Item>
          <Form.Item label={t("systemSettings.userPassword")} required>
            <Input.Password
              value={addUserForm.password}
              onChange={(e) =>
                setAddUserForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={t("systemSettings.passwordPlaceholder")}
            />
          </Form.Item>
          <Form.Item label={t("systemSettings.userRoleSelect")}>
            <Select
              value={addUserForm.role}
              onChange={(role) => setAddUserForm((f) => ({ ...f, role }))}
              options={[
                { value: "user", label: t("systemSettings.roleUser") },
                { value: "admin", label: t("systemSettings.roleAdmin") },
                {
                  value: "superadmin",
                  label: t("systemSettings.roleSuperAdmin"),
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
