import { Alert, Button, Form, Input, Spin } from "@acme/components";
import type { User } from "@acme/types";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { authApi } from "@/generated/rust-api";
import { useAuth, useSystemSettings } from "@/hooks";

type LoginPageProps = {
  initialMode?: "login" | "register";
};

export default function AuthPage({ initialMode = "login" }: LoginPageProps) {
  const { t } = useTranslation();
  const { login, isAuthed, isLoading } = useAuth();
  const { singleWorkspaceMode } = useSystemSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = authApi.login.useMutation();
  const registerMutation = authApi.register.useMutation();
  const registrationStatusQuery = authApi.registrationStatus.useQuery({
    staleTime: 30_000,
  });

  const invitationCode = searchParams.get("invite") ?? "";
  const hasValidInvitation = invitationCode.length > 0;
  const registrationAllowed = registrationStatusQuery.data?.allowed ?? false;
  const isFirstUser = registrationStatusQuery.data?.isFirstUser ?? false;

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [form] = Form.useForm();
  const redirect = searchParams.get("redirect");
  const didNavigate = useRef(false);
  const didAutoSwitch = useRef(false);

  const isSetupMode = !registrationStatusQuery.isLoading && isFirstUser;
  const activeMutation = mode === "login" ? loginMutation : registerMutation;
  const isPending = activeMutation.isPending;
  const error = activeMutation.error?.message;

  useEffect(() => {
    if (
      hasValidInvitation &&
      initialMode === "login" &&
      !didAutoSwitch.current
    ) {
      didAutoSwitch.current = true;
      setMode("register");
    }
  }, [hasValidInvitation, initialMode]);

  useEffect(() => {
    if (!isLoading && isAuthed && !didNavigate.current) {
      navigate(redirect || "/dashboard");
    }
  }, [isAuthed, isLoading, navigate, redirect]);

  useEffect(() => {
    setMode(initialMode);
    form.resetFields();
  }, [initialMode, form]);

  if (isLoading || registrationStatusQuery.isLoading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "var(--bg-base)" }}
      >
        <div className="aurora-bg" />
        <Spin size="large" />
      </div>
    );
  }

  const registrationBlocked =
    mode === "register" &&
    !registrationAllowed &&
    !hasValidInvitation &&
    !isFirstUser;

  const canShowSwitchButton =
    mode === "login"
      ? registrationAllowed || hasValidInvitation || isFirstUser
      : true;

  const subtitle = (() => {
    if (mode === "login") return t("login.pleaseLogin");
    if (isFirstUser) return t("login.firstAdmin");
    if (hasValidInvitation) return t("login.invitedRegister");
    return t("login.register");
  })();

  const handleSuccess = (user: User, defaultWorkspaceSlug?: string) => {
    login(user);
    didNavigate.current = true;
    if (singleWorkspaceMode) {
      navigate(redirect || "/dashboard");
    } else {
      navigate(redirect || `/dashboard/${defaultWorkspaceSlug ?? ""}`);
    }
  };

  const switchMode = () => {
    const next = mode === "login" ? "register" : "login";
    setMode(next);
    form.resetFields();
    const q = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";
    const inviteQ = invitationCode
      ? `${q ? "&" : "?"}invite=${encodeURIComponent(invitationCode)}`
      : "";
    navigate(next === "login" ? `/login${q}` : `/register${q}${inviteQ}`);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="aurora-bg" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass glass-accent rounded-2xl shadow-xl p-8">
          {registrationBlocked ? (
            <div className="space-y-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {t("login.register")}
                </h1>
              </div>
              <Alert
                type="error"
                message={t("login.registrationDisabled")}
                showIcon
                className="mb-4"
              />
              <button
                type="button"
                onClick={switchMode}
                className="cursor-pointer w-full text-sm hover:underline text-[var(--text-muted)]"
              >
                {t("login.backToLogin")}
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {mode === "login" ? t("login.title") : t("login.register")}
                </h1>
                <p className="text-[var(--text-secondary)]">{subtitle}</p>
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
                    handleSuccess(
                      result.user as User,
                      result.defaultWorkspaceSlug,
                    );
                  } else {
                    const result = await registerMutation.mutateAsync({
                      name: (values.name as string).trim(),
                      email: values.email,
                      password: values.password,
                      invitationCode: invitationCode || undefined,
                    });
                    handleSuccess(
                      result.user as User,
                      result.defaultWorkspaceSlug,
                    );
                  }
                }}
              >
                {mode === "register" && (
                  <Form.Item
                    label={t("login.name")}
                    name="name"
                    rules={[
                      { required: true, message: t("login.nameRequired") },
                    ]}
                  >
                    <Input
                      placeholder={t("login.namePlaceholder")}
                      size="large"
                    />
                  </Form.Item>
                )}

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
                  rules={[
                    { required: true, message: t("login.password") },
                    ...(isSetupMode
                      ? [
                          {
                            validator: (_: unknown, value: string) => {
                              if (!value) return Promise.resolve();
                              const hasLetter = /[a-zA-Z]/.test(value);
                              const hasDigit = /\d/.test(value);
                              const hasSpecial = /[^a-zA-Z0-9]/.test(value);
                              if (
                                value.length >= 6 &&
                                hasLetter &&
                                hasDigit &&
                                hasSpecial
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error(t("login.passwordComplexityHint")),
                              );
                            },
                          },
                        ]
                      : []),
                  ]}
                  extra={
                    isSetupMode ? t("login.passwordComplexityHint") : undefined
                  }
                >
                  <Input.Password
                    placeholder={t("login.passwordPlaceholder")}
                    size="large"
                    autoComplete={
                      isSetupMode || mode === "register"
                        ? "new-password"
                        : "current-password"
                    }
                  />
                </Form.Item>

                {error ? (
                  <Alert
                    type="error"
                    message={error}
                    showIcon
                    className="mb-4"
                  />
                ) : null}

                <Button
                  variant="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={isPending}
                  className="!mt-4"
                >
                  {isPending
                    ? t("login.loading")
                    : mode === "login"
                      ? t("login.submit")
                      : t("login.register")}
                </Button>
              </Form>

              {canShowSwitchButton && (
                <button
                  type="button"
                  onClick={switchMode}
                  className="cursor-pointer w-full text-sm hover:underline text-[var(--text-muted)] mt-4"
                >
                  {mode === "login"
                    ? t("login.noAccountRegister")
                    : t("login.haveAccountLogin")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
