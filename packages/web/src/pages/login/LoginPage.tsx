import type { User } from "@acme/types";
import { Alert, Button, Form, Input, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "../../lib/trpc";

type LoginPageProps = {
  onLogin: (user: User) => void;
  initialMode?: "login" | "register";
};

export default function LoginPage({
  onLogin,
  initialMode = "login",
}: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  // 查询注册状态
  const registrationStatusQuery = trpc.auth.registrationStatus.useQuery();
  const registrationAllowed = registrationStatusQuery.data?.allowed ?? true;
  const isFirstUser = registrationStatusQuery.data?.isFirstUser ?? false;

  // 获取邀请码参数
  const invitationCode = searchParams.get("invite");
  const hasValidInvitation = !!invitationCode;

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const error = (
    mode === "login" ? loginMutation.error : registerMutation.error
  )?.message;
  const { t } = useTranslation();
  const redirect = searchParams.get("redirect");
  const redirectQuery = redirect
    ? `?redirect=${encodeURIComponent(redirect)}`
    : "";
  const [form] = Form.useForm();
  const submitDisabled = useMemo(
    () => loginMutation.isPending || registerMutation.isPending,
    [loginMutation.isPending, registerMutation.isPending],
  );

  useEffect(() => {
    // 如果有邀请码，自动切换到注册模式
    if (hasValidInvitation && initialMode === "login") {
      setMode("register");
    } else {
      setMode(initialMode);
    }
    form.resetFields();
  }, [initialMode, hasValidInvitation, form.resetFields]);

  // 如果正在检查注册状态，显示加载
  if (registrationStatusQuery.isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Spin size="large" />
        <Form form={form} className="hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t("login.title")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {hasValidInvitation && mode === "register"
                ? t("login.invitedRegister")
                : isFirstUser && mode === "register"
                  ? t("login.firstAdmin")
                  : t("login.pleaseLogin")}
            </p>
          </div>

          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={async (values) => {
              if (mode === "login") {
                const result = await loginMutation.mutateAsync({
                  email: values.email,
                  password: values.password,
                });
                onLogin(result.user as User);
                navigate(
                  redirect || `/dashboard/${result.defaultWorkspaceSlug}`,
                );
                return;
              }

              const result = await registerMutation.mutateAsync({
                name: values.name?.trim(),
                email: values.email,
                password: values.password,
                invitationCode: invitationCode ?? undefined,
              });
              onLogin(result.user as User);
              navigate(redirect || `/dashboard/${result.defaultWorkspaceSlug}`);
            }}
          >
            <Form.Item
              label={t("login.email")}
              name="email"
              rules={[{ required: true, message: t("login.email") }]}
            >
              <Input
                type="email"
                placeholder={t("login.emailPlaceholder")}
                size="large"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label={t("login.password")}
              name="password"
              rules={[{ required: true, message: t("login.password") }]}
            >
              <Input.Password
                placeholder={t("login.passwordPlaceholder")}
                size="large"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </Form.Item>

            {mode === "register" ? (
              <Form.Item
                label={t("login.userName")}
                name="name"
                rules={[
                  { required: true, message: t("login.userNameRequired") },
                ]}
              >
                <Input
                  placeholder={t("login.userNamePlaceholder")}
                  size="large"
                />
              </Form.Item>
            ) : null}

            {error ? (
              <Alert type="error" message={error} showIcon className="mb-4" />
            ) : null}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitDisabled}
              className="!mt-4"
            >
              {submitDisabled
                ? t("login.loading")
                : mode === "login"
                  ? t("login.submit")
                  : t("login.register")}
            </Button>

            {/* 只有允许注册或有邀请码时才显示切换按钮 */}
            {registrationAllowed || hasValidInvitation ? (
              <Button
                type="link"
                block
                onClick={() => {
                  const nextMode = mode === "login" ? "register" : "login";
                  setMode(nextMode);
                  form.resetFields();
                  // 保留邀请码参数
                  const inviteParam = invitationCode
                    ? `&invite=${invitationCode}`
                    : "";
                  navigate(
                    nextMode === "login"
                      ? `/login${redirectQuery}`
                      : `/register${redirectQuery}${inviteParam}`,
                  );
                }}
              >
                {mode === "login"
                  ? t("login.noAccount")
                  : t("login.hasAccount")}
              </Button>
            ) : mode === "register" ? (
              // 如果注册被禁用但当前在注册页，显示提示并跳转到登录
              <div className="mt-4 text-center">
                <Alert
                  type="warning"
                  message={t("login.registrationDisabled")}
                  className="mb-4"
                />
                <Button
                  type="link"
                  onClick={() => {
                    setMode("login");
                    form.resetFields();
                    navigate(`/login${redirectQuery}`);
                  }}
                >
                  {t("login.backToLogin")}
                </Button>
              </div>
            ) : null}
          </Form>
        </div>
      </div>
    </div>
  );
}
