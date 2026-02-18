import type { User } from "@acme/types";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { Avatar, Button, Form, Input, Modal, Select, Tabs, Upload } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMessage } from "../../hooks";
import { getAvatarColor, getAvatarInitial } from "../../lib/avatar";
import { trpc } from "../../lib/trpc";
import type { LangMode, ThemeMode } from "../../lib/types";

type UserSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  langMode: LangMode;
  themeMode: ThemeMode;
  onUpdateUser: (user: User) => void;
  onChangeLangMode: (mode: LangMode) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
};

export default function UserSettingsModal({
  open,
  onClose,
  user,
  langMode,
  themeMode,
  onUpdateUser,
  onChangeLangMode,
  onChangeThemeMode,
}: UserSettingsModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const message = useMessage();
  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: open,
  });
  const updateMutation = trpc.user.updateProfile.useMutation();
  const deleteAvatarMutation = trpc.user.deleteAvatar.useMutation();
  const changePasswordMutation = trpc.user.changePassword.useMutation();
  const [avatarValue, setAvatarValue] = useState<string | null>(
    user.settings?.avatarUrl ?? null,
  );
  const [activeTab, setActiveTab] = useState("profile");

  const profile = profileQuery.data ?? user;
  const displayName = profile.name || profile.email;
  const avatarColor = getAvatarColor(displayName);
  const avatarInitial = getAvatarInitial(profile.name, profile.email);

  const initialLangMode = profile.settings?.langMode ?? langMode;
  const initialThemeMode = profile.settings?.themeMode ?? themeMode;

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
    setAvatarValue(profile.settings?.avatarUrl ?? null);
    form.setFieldsValue({
      name: profile.name,
      email: profile.email,
      langMode: initialLangMode,
      themeMode: initialThemeMode,
    });
  }, [
    open,
    profile.settings?.avatarUrl,
    profile.email,
    profile.name,
    initialLangMode,
    initialThemeMode,
    form,
    passwordForm,
  ]);

  const uploadProps: UploadProps = useMemo(
    () => ({
      showUploadList: false,
      beforeUpload: (file) => {
        if (!file.type.startsWith("image/")) {
          message.error(t("userSettings.pleaseUploadImage"));
          return Upload.LIST_IGNORE;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarValue(reader.result as string);
        };
        reader.readAsDataURL(file);
        return false;
      },
    }),
    [t, message.error],
  );

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name?.trim(),
      email: values.email?.trim(),
      settings: {
        avatarUrl: avatarValue,
        langMode: values.langMode as LangMode,
        themeMode: values.themeMode as ThemeMode,
      },
    };

    const updated = await updateMutation.mutateAsync(payload);
    onUpdateUser(updated as User);

    if (payload.settings?.langMode) {
      onChangeLangMode(payload.settings.langMode);
    }
    if (payload.settings?.themeMode) {
      onChangeThemeMode(payload.settings.themeMode);
    }

    message.success(t("userSettings.settingsSaved"));
    onClose();
  };

  const handleRemoveAvatar = async () => {
    setAvatarValue(null);
    const updated = await deleteAvatarMutation.mutateAsync();
    onUpdateUser(updated as User);
    message.success(t("userSettings.avatarRemoved"));
  };

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields();
    try {
      await changePasswordMutation.mutateAsync({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success(t("userSettings.passwordChanged"));
    } catch (_error) {
      // 错误由 tRPC 错误处理器处理
    }
  };

  const profileTab = (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Avatar
          size={64}
          src={avatarValue ?? undefined}
          style={{ backgroundColor: avatarValue ? undefined : avatarColor }}
        >
          {avatarInitial}
        </Avatar>
        <div className="flex flex-col gap-2">
          <Upload {...uploadProps}>
            <Button size="small">{t("userSettings.uploadAvatar")}</Button>
          </Upload>
          <Button
            size="small"
            danger
            disabled={!avatarValue}
            onClick={handleRemoveAvatar}
          >
            {t("userSettings.removeAvatar")}
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical">
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
                { value: "lzh", label: "文言文" },
                { value: "wuu", label: "吴语" },
                { value: "hak", label: "客家話" },
                { value: "yue", label: "粥語" },
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
      </Form>

      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          type="primary"
          loading={updateMutation.isPending}
          onClick={handleSave}
        >
          {t("common.save")}
        </Button>
      </div>
    </>
  );

  const passwordTab = (
    <>
      <Form form={passwordForm} layout="vertical">
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

      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          type="primary"
          loading={changePasswordMutation.isPending}
          onClick={handleChangePassword}
        >
          {t("userSettings.changePassword")}
        </Button>
      </div>
    </>
  );

  return (
    <Modal
      open={open}
      title={t("userSettings.title")}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={480}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "profile",
            label: (
              <span>
                <UserOutlined className="mr-1" />
                {t("userSettings.profileTab")}
              </span>
            ),
            children: profileTab,
          },
          {
            key: "password",
            label: (
              <span>
                <LockOutlined className="mr-1" />
                {t("userSettings.passwordTab")}
              </span>
            ),
            children: passwordTab,
          },
        ]}
      />
    </Modal>
  );
}
