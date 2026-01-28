import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Form, Input } from "antd";
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
    setMode(initialMode);
    form.resetFields();
  }, [initialMode]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t("login.title")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              请登录您的账户
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
                password: values.password
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

            {error ? <Alert type="error" title={error} showIcon /> : null}

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

            <Button
              type="link"
              block
              onClick={() => {
                const nextMode = mode === "login" ? "register" : "login";
                setMode(nextMode);
                form.resetFields();
                navigate(nextMode === "login" ? `/login${redirectQuery}` : `/register${redirectQuery}`);
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
          </Form>
        </div>
      </div>
    </div>
  );
}
