import { Button, Input, Modal, Select, Tabs } from "@acme/components";
import type { AdminUser, InvitationCode, User, UserRole } from "@acme/types";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { adminApi, authApi } from "@/generated/rust-api";
import { message } from "@/lib/message";
import { RustApiError } from "@/lib/rust-api-runtime";

type SystemSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
};

function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useTranslation();
  const config: Record<UserRole, { bg: string; label: string }> = {
    superadmin: {
      bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      label: t("systemSettings.roleSuperAdmin"),
    },
    admin: {
      bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      label: t("systemSettings.roleAdmin"),
    },
    user: {
      bg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      label: t("systemSettings.roleUser"),
    },
  };
  const c = config[role];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.bg}`}
    >
      {c.label}
    </span>
  );
}

function InvitationStatusBadge({ invitation }: { invitation: InvitationCode }) {
  const { t } = useTranslation();
  if (invitation.usedBy) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {t("systemSettings.invitationStatusUsed")}
      </span>
    );
  }
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        {t("systemSettings.invitationStatusExpired")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
      {t("systemSettings.invitationStatusUnused")}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SystemSettingsModal({
  open,
  onClose,
  user,
}: SystemSettingsModalProps) {
  const { t } = useTranslation();
  const isSuperAdmin = user.role === "superadmin";
  const queryClient = useQueryClient();

  const settingsQuery = adminApi.getSystemSettings.useQuery({
    enabled: open,
  });
  const updateSettingsMutation = adminApi.updateSystemSettings.useMutation();

  const usersQuery = adminApi.listUsers.useQuery({
    enabled: open && isSuperAdmin,
  });
  const updateRoleMutation = adminApi.updateUserRole.useMutation();
  const forceResetPasswordMutation = adminApi.forceResetPassword.useMutation();
  const deleteUserMutation = adminApi.deleteUser.useMutation();
  const createUserMutation = adminApi.createUser.useMutation();

  const invitationsQuery = adminApi.listInvitationCodes.useQuery({
    enabled: open && isSuperAdmin,
  });
  const generateInvitationMutation =
    adminApi.generateInvitationCode.useMutation();
  const deleteInvitationMutation = adminApi.deleteInvitationCode.useMutation();

  const [activeTab, setActiveTab] = useState("general");

  // Local state for General tab — only saved on OK
  const [localAllowRegistration, setLocalAllowRegistration] = useState<
    boolean | null
  >(null);
  const [localSingleWorkspaceMode, setLocalSingleWorkspaceMode] = useState<
    boolean | null
  >(null);

  // Sync local state when settings are fetched
  const effectiveAllowRegistration =
    localAllowRegistration ?? settingsQuery.data?.allowRegistration ?? true;
  const effectiveSingleWorkspaceMode =
    localSingleWorkspaceMode ??
    settingsQuery.data?.singleWorkspaceMode ??
    false;

  const hasGeneralChanges =
    localAllowRegistration !== null || localSingleWorkspaceMode !== null;

  const [resetPasswordModal, setResetPasswordModal] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: "", userName: "" });
  const [newPassword, setNewPassword] = useState("");

  const [addUserModal, setAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UserRole,
  });

  const [invitationExpiresHours, setInvitationExpiresHours] = useState("");

  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(
    null,
  );
  const [confirmDeleteInvitation, setConfirmDeleteInvitation] = useState<
    string | null
  >(null);

  const handleSaveGeneral = async () => {
    const updates: Record<string, boolean> = {};
    if (localAllowRegistration !== null) {
      updates.allowRegistration = localAllowRegistration;
    }
    if (localSingleWorkspaceMode !== null) {
      updates.singleWorkspaceMode = localSingleWorkspaceMode;
    }
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    await updateSettingsMutation.mutateAsync(updates);
    settingsQuery.refetch();
    if (localSingleWorkspaceMode !== null) {
      authApi.systemSettings.invalidate(queryClient);
    }
    setLocalAllowRegistration(null);
    setLocalSingleWorkspaceMode(null);
    message.success(t("systemSettings.saveSuccess"));
    onClose();
  };

  const handleCancelGeneral = () => {
    setLocalAllowRegistration(null);
    setLocalSingleWorkspaceMode(null);
    onClose();
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    await updateRoleMutation.mutateAsync({ userId, role });
    usersQuery.refetch();
    message.success(t("systemSettings.saveSuccess"));
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync({ userId });
    usersQuery.refetch();
    setConfirmDeleteUser(null);
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
      if (error instanceof RustApiError && error.status === 409) {
        message.error(t("systemSettings.emailExists"));
      } else {
        throw error;
      }
    }
  };

  const handleGenerateInvitation = async () => {
    const hours = invitationExpiresHours
      ? Number.parseInt(invitationExpiresHours, 10)
      : undefined;
    const result = await generateInvitationMutation.mutateAsync({
      expiresInHours: hours,
    });
    invitationsQuery.refetch();
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
    await deleteInvitationMutation.mutateAsync({ code: codeId });
    invitationsQuery.refetch();
    setConfirmDeleteInvitation(null);
    message.success(t("systemSettings.invitationDeleted"));
  };

  const generalTabContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("systemSettings.allowRegistration")}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t("systemSettings.allowRegistrationDesc")}
          </p>
        </div>
        <Toggle
          checked={effectiveAllowRegistration}
          onChange={setLocalAllowRegistration}
        />
      </div>
      {isSuperAdmin && !settingsQuery.data?.singleWorkspaceModeOverridden && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {t("systemSettings.singleWorkspaceMode")}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {t("systemSettings.singleWorkspaceModeDesc")}
            </p>
          </div>
          <Toggle
            checked={effectiveSingleWorkspaceMode}
            onChange={setLocalSingleWorkspaceMode}
          />
        </div>
      )}
    </div>
  );

  const usersTabContent = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="small" onClick={() => setAddUserModal(true)}>
          + {t("systemSettings.addUser")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-base)]">
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.userNameColumn")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.emailColumn")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.userRole")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.lastLoginAt")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.userActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(usersQuery.data ?? []).map((record: AdminUser) => {
              const isCurrentUser = record.id === user.id;
              const isSuperAdminUser = record.role === "superadmin";
              return (
                <tr
                  key={record.id}
                  className="border-b border-[var(--border-base)] last:border-0"
                >
                  <td className="py-2 px-3">{record.name}</td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">
                    {record.email}
                  </td>
                  <td className="py-2 px-3">
                    <RoleBadge role={record.role} />
                  </td>
                  <td className="py-2 px-3 text-xs text-[var(--text-muted)]">
                    {record.lastLoginAt
                      ? new Date(record.lastLoginAt).toLocaleString()
                      : t("systemSettings.neverLogin")}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={record.role}
                        disabled={isCurrentUser || isSuperAdminUser}
                        onChange={(role) =>
                          handleChangeRole(record.id, role as UserRole)
                        }
                        options={[
                          {
                            value: "user",
                            label: t("systemSettings.roleUser"),
                          },
                          {
                            value: "admin",
                            label: t("systemSettings.roleAdmin"),
                          },
                          {
                            value: "superadmin",
                            label: t("systemSettings.roleSuperAdmin"),
                          },
                        ]}
                        className="w-28"
                      />
                      <Button
                        size="small"
                        variant="text"
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
                      {confirmDeleteUser === record.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => handleDeleteUser(record.id)}
                          >
                            {t("common.confirm")}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setConfirmDeleteUser(null)}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="small"
                          variant="danger"
                          disabled={isCurrentUser || isSuperAdminUser}
                          onClick={() => setConfirmDeleteUser(record.id)}
                        >
                          {t("systemSettings.deleteUser")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {usersQuery.isLoading && (
          <div className="py-8 text-center text-[var(--text-muted)]">
            {t("common.loading")}
          </div>
        )}
      </div>
    </div>
  );

  const invitationsTabContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t("systemSettings.expiresInHours")}
            value={invitationExpiresHours}
            onChange={(e) => setInvitationExpiresHours(e.target.value)}
            className="w-32"
          />
          <span className="text-sm text-[var(--text-muted)]">
            {t("systemSettings.hoursUnit")}
          </span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {invitationExpiresHours ? "" : t("systemSettings.noExpiration")}
        </span>
        <Button
          size="small"
          onClick={handleGenerateInvitation}
          disabled={generateInvitationMutation.isPending}
        >
          🔗 {t("systemSettings.generateInvitation")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-base)]">
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.invitationCode")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.invitationStatus")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.invitationExpiresAt")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.invitationCreatedAt")}
              </th>
              <th className="py-2 px-3 text-left font-medium text-[var(--text-muted)]">
                {t("systemSettings.userActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(invitationsQuery.data ?? []).map((record: InvitationCode) => {
              const isUsed = !!record.usedBy;
              return (
                <tr
                  key={record.id}
                  className="border-b border-[var(--border-base)] last:border-0"
                >
                  <td className="py-2 px-3">
                    <code className="text-xs cursor-help" title={record.code}>
                      {record.code.slice(0, 8)}...
                    </code>
                  </td>
                  <td className="py-2 px-3">
                    <InvitationStatusBadge invitation={record} />
                  </td>
                  <td className="py-2 px-3 text-xs text-[var(--text-muted)]">
                    {record.expiresAt
                      ? new Date(record.expiresAt).toLocaleString()
                      : t("systemSettings.invitationNeverExpire")}
                  </td>
                  <td className="py-2 px-3 text-xs text-[var(--text-muted)]">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        variant="text"
                        disabled={isUsed}
                        onClick={() => handleCopyInvitationLink(record.code)}
                      >
                        📋 {t("systemSettings.copyInvitationLink")}
                      </Button>
                      {confirmDeleteInvitation === record.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="small"
                            variant="danger"
                            onClick={() => handleDeleteInvitation(record.id)}
                          >
                            {t("common.confirm")}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setConfirmDeleteInvitation(null)}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => setConfirmDeleteInvitation(record.id)}
                        >
                          {t("systemSettings.deleteInvitation")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invitationsQuery.isLoading && (
          <div className="py-8 text-center text-[var(--text-muted)]">
            {t("common.loading")}
          </div>
        )}
      </div>
    </div>
  );

  const tabItems = [
    {
      key: "general",
      label: t("systemSettings.generalTab"),
      children: generalTabContent,
    },
    ...(isSuperAdmin
      ? [
          {
            key: "users",
            label: t("systemSettings.usersTab"),
            children: usersTabContent,
          },
          {
            key: "invitations",
            label: t("systemSettings.invitationTab"),
            children: invitationsTabContent,
          },
        ]
      : []),
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={handleCancelGeneral}
        onOk={handleSaveGeneral}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
        okButtonProps={{
          disabled: !hasGeneralChanges,
          loading: updateSettingsMutation.isPending,
        }}
        title={t("systemSettings.title")}
        width={isSuperAdmin ? 800 : 520}
      >
        <Tabs
          className="[&_[role=tabpanel]]:mt-4"
          items={tabItems}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetPasswordModal.open}
        onCancel={() => {
          setResetPasswordModal({ open: false, userId: "", userName: "" });
          setNewPassword("");
        }}
        title={t("systemSettings.resetPasswordTitle")}
      >
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          {t("systemSettings.resetPasswordDesc", {
            name: resetPasswordModal.userName,
          })}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("systemSettings.newPassword")}
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("systemSettings.newPasswordPlaceholder")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="text"
              onClick={() => {
                setResetPasswordModal({
                  open: false,
                  userId: "",
                  userName: "",
                });
                setNewPassword("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={forceResetPasswordMutation.isPending}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add User Modal */}
      <Modal
        open={addUserModal}
        onCancel={() => {
          setAddUserModal(false);
          setAddUserForm({ name: "", email: "", password: "", role: "user" });
        }}
        title={t("systemSettings.addUserTitle")}
      >
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          {t("systemSettings.addUserDesc")}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("systemSettings.userName")}
            </label>
            <Input
              value={addUserForm.name}
              onChange={(e) =>
                setAddUserForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder={t("systemSettings.usernamePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("systemSettings.userEmail")}
            </label>
            <Input
              type="email"
              value={addUserForm.email}
              onChange={(e) =>
                setAddUserForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder={t("systemSettings.emailPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("systemSettings.userPassword")}
            </label>
            <Input
              type="password"
              value={addUserForm.password}
              onChange={(e) =>
                setAddUserForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={t("systemSettings.passwordPlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t("systemSettings.userRoleSelect")}
            </label>
            <Select
              value={addUserForm.role}
              onChange={(role) =>
                setAddUserForm((f) => ({ ...f, role: role as UserRole }))
              }
              options={[
                { value: "user", label: t("systemSettings.roleUser") },
                { value: "admin", label: t("systemSettings.roleAdmin") },
                {
                  value: "superadmin",
                  label: t("systemSettings.roleSuperAdmin"),
                },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="text"
              onClick={() => {
                setAddUserModal(false);
                setAddUserForm({
                  name: "",
                  email: "",
                  password: "",
                  role: "user",
                });
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={createUserMutation.isPending}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
