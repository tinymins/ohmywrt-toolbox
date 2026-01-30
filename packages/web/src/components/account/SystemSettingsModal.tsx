import { useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tabs,
  Popconfirm,
  Space,
  Tag
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../hooks";
import type { User, AdminUser, UserRole } from "@acme/types";
import type { Lang } from "../../lib/types";
import { trpc } from "../../lib/trpc";

type SystemSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  lang: Lang;
};

export default function SystemSettingsModal({
  open,
  onClose,
  user,
  lang
}: SystemSettingsModalProps) {
  const { t } = useTranslation();
  const message = useMessage();
  const isSuperAdmin = user.role === "superadmin";

  // 系统设置查询
  const settingsQuery = trpc.admin.getSystemSettings.useQuery(undefined, {
    enabled: open
  });
  const updateSettingsMutation = trpc.admin.updateSystemSettings.useMutation();

  // 用户列表查询（仅超管）
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, {
    enabled: open && isSuperAdmin
  });
  const updateRoleMutation = trpc.admin.updateUserRole.useMutation();
  const forceResetPasswordMutation = trpc.admin.forceResetPassword.useMutation();
  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const createUserMutation = trpc.admin.createUser.useMutation();

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
    role: "user" as UserRole
  });

  const handleToggleRegistration = async (checked: boolean) => {
    await updateSettingsMutation.mutateAsync({ allowRegistration: checked });
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
      message.error(lang === "zh" ? "密码至少4位" : "Password must be at least 4 characters");
      return;
    }
    await forceResetPasswordMutation.mutateAsync({
      userId: resetPasswordModal.userId,
      newPassword
    });
    setResetPasswordModal({ open: false, userId: "", userName: "" });
    setNewPassword("");
    message.success(t("systemSettings.resetSuccess"));
  };

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.email || !addUserForm.password) {
      message.error(lang === "zh" ? "请填写完整信息" : "Please fill in all fields");
      return;
    }
    if (addUserForm.password.length < 4) {
      message.error(lang === "zh" ? "密码至少4位" : "Password must be at least 4 characters");
      return;
    }
    try {
      await createUserMutation.mutateAsync(addUserForm);
      setAddUserModal(false);
      setAddUserForm({ name: "", email: "", password: "", role: "user" });
      usersQuery.refetch();
      message.success(t("systemSettings.addUserSuccess"));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("已被注册")) {
        message.error(t("systemSettings.emailExists"));
      } else {
        throw error;
      }
    }
  };

  const getRoleTag = (role: UserRole) => {
    const config: Record<UserRole, { color: string; label: string }> = {
      superadmin: { color: "red", label: t("systemSettings.roleSuperAdmin") },
      admin: { color: "blue", label: t("systemSettings.roleAdmin") },
      user: { color: "default", label: t("systemSettings.roleUser") }
    };
    return <Tag color={config[role].color}>{config[role].label}</Tag>;
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: lang === "zh" ? "用户名" : "Name",
      dataIndex: "name",
      key: "name"
    },
    {
      title: lang === "zh" ? "邮箱" : "Email",
      dataIndex: "email",
      key: "email"
    },
    {
      title: t("systemSettings.userRole"),
      dataIndex: "role",
      key: "role",
      render: (role: UserRole) => getRoleTag(role)
    },
    {
      title: t("systemSettings.lastLoginAt"),
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : (lang === "zh" ? "从未登录" : "Never")
    },
    {
      title: t("systemSettings.userCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: t("systemSettings.userActions"),
      key: "actions",
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
                { value: "superadmin", label: t("systemSettings.roleSuperAdmin") }
              ]}
            />
            <Button
              size="small"
              disabled={isCurrentUser}
              onClick={() =>
                setResetPasswordModal({
                  open: true,
                  userId: record.id,
                  userName: record.name
                })
              }
            >
              {t("systemSettings.resetPassword")}
            </Button>
            <Popconfirm
              title={t("systemSettings.confirmDelete")}
              description={t("systemSettings.confirmDeleteDesc", { name: record.name })}
              onConfirm={() => handleDeleteUser(record.id)}
              disabled={isCurrentUser || isSuperAdminUser}
            >
              <Button size="small" danger disabled={isCurrentUser || isSuperAdminUser}>
                {t("systemSettings.deleteUser")}
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
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
      </Form>
    </div>
  );

  const usersTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserModal(true)}>
          {t("systemSettings.addUser")}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={usersQuery.data ?? []}
        rowKey="id"
        loading={usersQuery.isLoading}
        size="small"
        pagination={{ pageSize: 10 }}
      />
    </div>
  );

  const tabItems = [
    {
      key: "general",
      label: t("systemSettings.generalTab"),
      children: generalTab
    },
    // 超管才显示用户管理 Tab
    ...(isSuperAdmin
      ? [
          {
            key: "users",
            label: t("systemSettings.usersTab"),
            children: usersTab
          }
        ]
      : [])
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={t("systemSettings.title")}
        footer={null}
        width={isSuperAdmin ? 900 : 500}
        destroyOnClose
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
          {t("systemSettings.resetPasswordDesc", { name: resetPasswordModal.userName })}
        </p>
        <Form layout="vertical">
          <Form.Item label={t("systemSettings.newPassword")} required>
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={lang === "zh" ? "请输入新密码（至少4位）" : "Enter new password (min 4 chars)"}
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
              onChange={(e) => setAddUserForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={lang === "zh" ? "请输入用户名" : "Enter username"}
            />
          </Form.Item>
          <Form.Item label={t("systemSettings.userEmail")} required>
            <Input
              type="email"
              value={addUserForm.email}
              onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={lang === "zh" ? "请输入邮箱" : "Enter email"}
            />
          </Form.Item>
          <Form.Item label={t("systemSettings.userPassword")} required>
            <Input.Password
              value={addUserForm.password}
              onChange={(e) => setAddUserForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={lang === "zh" ? "请输入密码（至少4位）" : "Enter password (min 4 chars)"}
            />
          </Form.Item>
          <Form.Item label={t("systemSettings.userRoleSelect")}>
            <Select
              value={addUserForm.role}
              onChange={(role) => setAddUserForm((f) => ({ ...f, role }))}
              options={[
                { value: "user", label: t("systemSettings.roleUser") },
                { value: "admin", label: t("systemSettings.roleAdmin") },
                { value: "superadmin", label: t("systemSettings.roleSuperAdmin") }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
