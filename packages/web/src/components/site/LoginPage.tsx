import type { User } from "@acme/types";
import { Alert, Button, Form, Input } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "../../lib/trpc";

type LoginPageProps = {
  onLogin: (user: User) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mutation = trpc.auth.login.useMutation();
  const systemSettingsQuery = trpc.auth.systemSettings.useQuery();
  const singleWorkspaceMode =
    systemSettingsQuery.data?.singleWorkspaceMode ?? false;
  const error = mutation.error?.message;
  const { t } = useTranslation();
  const redirect = searchParams.get("redirect");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t("login.title")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {t("login.pleaseLogin")}
            </p>
          </div>

          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={async (values) => {
              const result = await mutation.mutateAsync({
                email: values.email,
                password: values.password,
              });
              onLogin(result.user as User);
              // 根据系统设置决定跳转路径
              if (singleWorkspaceMode) {
                navigate(redirect || "/dashboard");
              } else {
                navigate(
                  redirect || `/dashboard/${result.defaultWorkspaceSlug}`,
                );
              }
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
              />
            </Form.Item>

            {error ? <Alert type="error" title={error} showIcon /> : null}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={mutation.isPending}
              className="!mt-4"
            >
              {mutation.isPending ? t("login.loading") : t("login.submit")}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
