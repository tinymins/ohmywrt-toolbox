import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Input, Spin } from "antd";
import type { User } from "@acme/types";
import { trpc } from "../../lib/trpc";

type LoginPageProps = {
  onLogin: (user: User) => void;
  initialMode?: "login" | "register";
};

export default function LoginPage({ onLogin, initialMode = "login" }: LoginPageProps) {
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
  const error = (mode === "login" ? loginMutation.error : registerMutation.error)?.message;
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "zh" ? "zh" : "en";
  const redirect = searchParams.get("redirect");
  const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
  const [form] = Form.useForm();
  const submitDisabled = useMemo(
    () => loginMutation.isPending || registerMutation.isPending,
    [loginMutation.isPending, registerMutation.isPending]
  );

  useEffect(() => {
    // 如果有邀请码，自动切换到注册模式
    if (hasValidInvitation && initialMode === "login") {
      setMode("register");
    } else {
      setMode(initialMode);
    }
    form.resetFields();
  }, [initialMode, hasValidInvitation]);

  // 如果正在检查注册状态，显示加载
  if (registrationStatusQuery.isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <Spin size="large" />
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
                ? lang === "zh"
                  ? "您已收到邀请，请注册账户"
                  : "You have been invited, please register"
                : isFirstUser && mode === "register"
                  ? lang === "zh"
                    ? "创建第一个管理员账户"
                    : "Create the first admin account"
                  : lang === "zh"
                    ? "请登录您的账户"
                    : "Please sign in to your account"}
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
                  password: values.password
                });
                onLogin(result.user as User);
                navigate(redirect || `/dashboard/${result.defaultWorkspaceSlug}`);
                return;
              }

              const result = await registerMutation.mutateAsync({
                name: values.name?.trim(),
                email: values.email,
                password: values.password,
                invitationCode: invitationCode ?? undefined
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
              <Input type="email" placeholder="请输入邮箱" size="large" />
            </Form.Item>

            <Form.Item
              label={t("login.password")}
              name="password"
              rules={[{ required: true, message: t("login.password") }]}
            >
              <Input.Password placeholder="请输入密码" size="large" />
            </Form.Item>

            {mode === "register" ? (
              <Form.Item
                label={lang === "zh" ? "用户名称" : "User name"}
                name="name"
                rules={[{ required: true, message: lang === "zh" ? "请输入用户名称" : "Please enter your name" }]}
              >
                <Input placeholder={lang === "zh" ? "例如：张三" : "e.g. Alex"} size="large" />
              </Form.Item>
            ) : null}

            {error ? <Alert type="error" message={error} showIcon className="mb-4" /> : null}

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
                  : lang === "zh"
                    ? "注册"
                    : "Register"}
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
                  const inviteParam = invitationCode ? `&invite=${invitationCode}` : "";
                  navigate(nextMode === "login" ? `/login${redirectQuery}` : `/register${redirectQuery}${inviteParam}`);
                }}
              >
                {mode === "login"
                  ? lang === "zh"
                    ? "没有账号？去注册"
                    : "No account? Register"
                  : lang === "zh"
                    ? "已有账号？去登录"
                    : "Already have an account? Login"}
              </Button>
            ) : mode === "register" ? (
              // 如果注册被禁用但当前在注册页，显示提示并跳转到登录
              <div className="mt-4 text-center">
                <Alert
                  type="warning"
                  message={lang === "zh" ? "系统暂不开放注册" : "Registration is currently disabled"}
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
                  {lang === "zh" ? "返回登录" : "Back to login"}
                </Button>
              </div>
            ) : null}
          </Form>
        </div>
      </div>
    </div>
  );
}
