import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Form, Input, Modal, Select, Upload } from "antd";
import type { UploadProps } from "antd";
import { useMessage } from "../../hooks";
import type { User } from "@acme/types";
import type { Lang, LangMode, ThemeMode } from "../../lib/types";
import { trpc } from "../../lib/trpc";
import { getAvatarColor, getAvatarInitial } from "../../lib/avatar";

type UserSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  lang: Lang;
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
  lang,
  langMode,
  themeMode,
  onUpdateUser,
  onChangeLangMode,
  onChangeThemeMode
}: UserSettingsModalProps) {
  const [form] = Form.useForm();
  const message = useMessage();
  const profileQuery = trpc.user.getProfile.useQuery(undefined, { enabled: open });
  const updateMutation = trpc.user.updateProfile.useMutation();
  const deleteAvatarMutation = trpc.user.deleteAvatar.useMutation();
  const [avatarValue, setAvatarValue] = useState<string | null>(user.settings?.avatarUrl ?? null);

  const profile = profileQuery.data ?? user;
  const displayName = profile.name || profile.email;
  const avatarColor = getAvatarColor(displayName);
  const avatarInitial = getAvatarInitial(profile.name, profile.email);

  const initialLangMode = profile.settings?.langMode ?? langMode;
  const initialThemeMode = profile.settings?.themeMode ?? themeMode;

  useEffect(() => {
    if (!open) return;
    setAvatarValue(profile.settings?.avatarUrl ?? null);
    form.setFieldsValue({
      name: profile.name,
      email: profile.email,
      langMode: initialLangMode,
      themeMode: initialThemeMode
    });
  }, [open, profile.settings?.avatarUrl, profile.email, profile.name, initialLangMode, initialThemeMode, form]);

  const uploadProps: UploadProps = useMemo(
    () => ({
      showUploadList: false,
      beforeUpload: (file) => {
        if (!file.type.startsWith("image/")) {
          message.error(lang === "zh" ? "请上传图片文件" : "Please upload an image file");
          return Upload.LIST_IGNORE;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarValue(reader.result as string);
        };
        reader.readAsDataURL(file);
        return false;
      }
    }),
    [lang]
  );

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name?.trim(),
      email: values.email?.trim(),
      settings: {
        avatarUrl: avatarValue,
        langMode: values.langMode as LangMode,
        themeMode: values.themeMode as ThemeMode
      }
    };

    const updated = await updateMutation.mutateAsync(payload);
    onUpdateUser(updated as User);

    if (payload.settings?.langMode) {
      onChangeLangMode(payload.settings.langMode);
    }
    if (payload.settings?.themeMode) {
      onChangeThemeMode(payload.settings.themeMode);
    }

    message.success(lang === "zh" ? "设置已保存" : "Settings saved");
    onClose();
  };

  const handleRemoveAvatar = async () => {
    setAvatarValue(null);
    const updated = await deleteAvatarMutation.mutateAsync();
    onUpdateUser(updated as User);
    message.success(lang === "zh" ? "头像已移除" : "Avatar removed");
  };

  return (
    <Modal
      open={open}
      title={lang === "zh" ? "账户设置" : "Account Settings"}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div className="flex items-center gap-4">
        <Avatar
          size={64}
          src={avatarValue ?? undefined}
          style={{ backgroundColor: avatarValue ? undefined : avatarColor }}
        >
          {avatarInitial}
        </Avatar>
        <div className="flex flex-col gap-2">
          <Upload {...uploadProps}>
            <Button size="small">{lang === "zh" ? "上传头像" : "Upload avatar"}</Button>
          </Upload>
          <Button size="small" danger disabled={!avatarValue} onClick={handleRemoveAvatar}>
            {lang === "zh" ? "移除头像" : "Remove avatar"}
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical" className="mt-6">
        <Form.Item
          label={lang === "zh" ? "用户名" : "User name"}
          name="name"
          rules={[{ required: true, message: lang === "zh" ? "请输入用户名" : "Please enter a user name" }]}
        >
          <Input placeholder={lang === "zh" ? "例如：陈伟" : "e.g. Chen Wei"} />
        </Form.Item>

        <Form.Item
          label={lang === "zh" ? "邮箱" : "Email"}
          name="email"
          rules={[{ required: true, message: lang === "zh" ? "请输入邮箱" : "Please enter your email" }]}
        >
          <Input type="email" placeholder="name@example.com" />
        </Form.Item>

        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item label={lang === "zh" ? "语言" : "Language"} name="langMode">
            <Select
              options={[
                { value: "auto", label: lang === "zh" ? "自动" : "Auto" },
                { value: "zh", label: "中文" },
                { value: "en", label: "English" }
              ]}
            />
          </Form.Item>

          <Form.Item label={lang === "zh" ? "主题" : "Theme"} name="themeMode">
            <Select
              options={[
                { value: "auto", label: lang === "zh" ? "自动" : "Auto" },
                { value: "light", label: lang === "zh" ? "亮色" : "Light" },
                { value: "dark", label: lang === "zh" ? "暗黑" : "Dark" }
              ]}
            />
          </Form.Item>
        </div>
      </Form>

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>{lang === "zh" ? "取消" : "Cancel"}</Button>
        <Button type="primary" loading={updateMutation.isPending} onClick={handleSave}>
          {lang === "zh" ? "保存" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
