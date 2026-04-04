import type { UploadProps } from "@acme/components";
import {
  Avatar,
  Button,
  cn,
  Form,
  Input,
  LockOutlined,
  Modal,
  Select,
  Upload,
  UserOutlined,
} from "@acme/components";
import type { AccentColor, User } from "@acme/types";
import { ACCENT_COLORS } from "@acme/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { userApi } from "@/generated/rust-api";
import { useTheme } from "@/hooks/useTheme";
import { resolveAvatarUrl } from "@/lib/avatar";
import { message } from "@/lib/message";
import { rustUrl } from "@/lib/rust-api-runtime";

type ProfileSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
};

const ACCENT_CONFIG: Record<AccentColor, { bg: string; label: string }> = {
  emerald: { bg: "#10b981", label: "Emerald" },
  amber: { bg: "#f59e0b", label: "Amber" },
  rose: { bg: "#f43f5e", label: "Rose" },
  violet: { bg: "#8b5cf6", label: "Violet" },
  blue: { bg: "#3b82f6", label: "Blue" },
  cyan: { bg: "#06b6d4", label: "Cyan" },
};

export default function ProfileSettingsModal({
  open,
  onClose,
  user,
  onUpdateUser,
}: ProfileSettingsModalProps) {
  const { t } = useTranslation();
  const { accent, setAccent, themeMode, setThemeMode } = useTheme();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const updateMutation = userApi.updateProfile.useMutation({
    onError: (err) =>
      message.error(err.message || t("userSettings.saveFailed")),
  });
  const changePasswordMutation = userApi.changePassword.useMutation({
    onError: (err) =>
      message.error(err.message || t("userSettings.saveFailed")),
  });

  const [avatarKey, setAvatarKey] = useState<string | null>(
    user.settings?.avatarKey ?? null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    resolveAvatarUrl(user.settings?.avatarKey) ?? null,
  );
  const [activeTab, setActiveTab] = useState("profile");
  const [uploading, setUploading] = useState(false);

  const avatarInitial = (user.name || user.email || "?")
    .charAt(0)
    .toUpperCase();

  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (hasOpenedRef.current) {
        setActiveTab("profile");
        passwordForm.resetFields();
      }
      return;
    }
    hasOpenedRef.current = true;
    const key = user.settings?.avatarKey ?? null;
    setAvatarKey(key);
    setAvatarPreview(resolveAvatarUrl(key) ?? null);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      langMode: user.settings?.langMode ?? "auto",
      themeMode: user.settings?.themeMode ?? themeMode,
    });
  }, [open, user, form, passwordForm, themeMode]);

  const uploadProps: UploadProps = useMemo(
    () => ({
      showUploadList: false,
      beforeUpload: (file) => {
        if (!file.type.startsWith("image/")) {
          message.error(t("userSettings.pleaseUploadImage"));
          return Upload.LIST_IGNORE;
        }
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        setUploading(true);
        const body = new FormData();
        body.append("file", file);
        fetch(rustUrl("/upload/avatar"), {
          method: "POST",
          body,
          credentials: "include",
        })
          .then(async (res) => {
            if (!res.ok) throw new Error("upload failed");
            const data = (await res.json()) as { key: string; user: User };
            setAvatarKey(data.key);
            onUpdateUser(data.user);
          })
          .catch(() => {
            message.error(t("userSettings.uploadFailed"));
            setAvatarPreview(null);
          })
          .finally(() => setUploading(false));
        return false;
      },
    }),
    [t, onUpdateUser],
  );

  const deleteAvatarMutation = userApi.deleteAvatar.useMutation({
    onSuccess: (updated) => {
      setAvatarKey(null);
      setAvatarPreview(null);
      onUpdateUser(updated);
      message.success(t("userSettings.avatarRemoved"));
    },
    onError: (err) =>
      message.error(err.message || t("userSettings.uploadFailed")),
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name?.trim(),
      email: values.email?.trim(),
      settings: {
        avatarKey,
        langMode: values.langMode,
        themeMode: values.themeMode,
        accentColor: accent,
      },
    };

    const updated = await updateMutation.mutateAsync(payload);
    onUpdateUser(updated);

    if (payload.settings.themeMode) {
      setThemeMode(payload.settings.themeMode);
    }

    message.success(t("userSettings.settingsSaved"));
    onClose();
  };

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields();
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success(t("userSettings.passwordChanged"));
    } catch {
      // error handled by mutation onError
    }
  };

  const profileContent = (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Avatar size={64} src={avatarPreview ?? undefined}>
          {avatarInitial}
        </Avatar>
        <div className="flex flex-col gap-2">
          <Upload {...uploadProps}>
            <Button size="small" loading={uploading}>
              {t("userSettings.uploadAvatar")}
            </Button>
          </Upload>
          <Button
            size="small"
            variant="danger"
            disabled={!avatarPreview}
            onClick={() => deleteAvatarMutation.mutate()}
          >
            {t("userSettings.removeAvatar")}
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          label={t("userSettings.userName")}
          name="name"
          rules={[
            { required: true, message: t("userSettings.userNameRequired") },
          ]}
        >
          <Input placeholder={t("userSettings.userNamePlaceholder")} />
        </Form.Item>

        <Form.Item
          label={t("userSettings.email")}
          name="email"
          rules={[{ required: true, message: t("userSettings.emailRequired") }]}
        >
          <Input type="email" placeholder="name@example.com" />
        </Form.Item>

        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item label={t("userSettings.language")} name="langMode">
            <Select
              options={[
                { value: "auto", label: t("common.auto") },
                { value: "zh-CN", label: "简体中文" },
                { value: "zh-TW", label: "繁體中文" },
                { value: "en-US", label: "English" },
                { value: "ja-JP", label: "日本語" },
                { value: "de-DE", label: "Deutsch" },
              ]}
            />
          </Form.Item>

          <Form.Item label={t("userSettings.theme")} name="themeMode">
            <Select
              options={[
                { value: "auto", label: t("common.auto") },
                { value: "light", label: t("common.light") },
                { value: "dark", label: t("common.dark") },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item label={t("userSettings.accentColor")}>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={ACCENT_CONFIG[color].label}
                className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                style={{
                  backgroundColor: ACCENT_CONFIG[color].bg,
                  boxShadow:
                    accent === color
                      ? `0 0 0 2px var(--bg-base), 0 0 0 4px ${ACCENT_CONFIG[color].bg}`
                      : "none",
                }}
                onClick={() => setAccent(color)}
              >
                {accent === color && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    className="w-3.5 h-3.5"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </Form.Item>
      </Form>
    </>
  );

  const passwordContent = (
    <Form form={passwordForm} layout="vertical" autoComplete="off">
      <Form.Item
        label={t("userSettings.currentPassword")}
        name="oldPassword"
        rules={[
          {
            required: true,
            message: t("userSettings.currentPasswordRequired"),
          },
        ]}
      >
        <Input.Password
          placeholder={t("userSettings.currentPasswordPlaceholder")}
        />
      </Form.Item>

      <Form.Item
        label={t("userSettings.newPassword")}
        name="newPassword"
        rules={[
          { required: true, message: t("userSettings.newPasswordRequired") },
          { min: 6, message: t("userSettings.newPasswordMin") },
        ]}
      >
        <Input.Password
          placeholder={t("userSettings.newPasswordPlaceholder")}
        />
      </Form.Item>

      <Form.Item
        label={t("userSettings.confirmPassword")}
        name="confirmPassword"
        dependencies={["newPassword"]}
        rules={[
          {
            required: true,
            message: t("userSettings.confirmPasswordRequired"),
          },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error(t("userSettings.passwordMismatch")),
              );
            },
          }),
        ]}
      >
        <Input.Password
          placeholder={t("userSettings.confirmPasswordPlaceholder")}
        />
      </Form.Item>
    </Form>
  );

  return (
    <Modal
      open={open}
      title={t("userSettings.title")}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={660}
      styles={{ body: { padding: 0 } }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: "168px 1fr", height: 520 }}
      >
        {/* Left sidebar nav */}
        <div className="border-r border-[var(--border-base)] bg-[var(--fill-tertiary)] overflow-y-auto rounded-bl-lg pt-4">
          <div className="px-2">
            {(
              [
                {
                  key: "profile",
                  icon: <UserOutlined />,
                  label: t("userSettings.profileTab"),
                },
                {
                  key: "password",
                  icon: <LockOutlined />,
                  label: t("userSettings.passwordTab"),
                },
              ] as const
            ).map(({ key, icon, label }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-colors cursor-pointer text-sm",
                    isActive
                      ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)]",
                  )}
                >
                  <span className="shrink-0">{icon}</span>
                  <span className="leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: content + footer */}
        <div className="flex flex-col min-h-0">
          <div
            className="flex-1 overflow-y-auto px-6 py-5"
            style={{ scrollbarWidth: "thin" }}
          >
            {activeTab === "profile" && profileContent}
            {activeTab === "password" && passwordContent}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border-base)] shrink-0">
            <Button onClick={onClose}>{t("common.cancel")}</Button>
            {activeTab === "profile" && (
              <Button
                variant="primary"
                loading={updateMutation.isPending}
                onClick={handleSave}
              >
                {t("common.save")}
              </Button>
            )}
            {activeTab === "password" && (
              <Button
                variant="primary"
                loading={changePasswordMutation.isPending}
                onClick={handleChangePassword}
              >
                {t("userSettings.changePassword")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
