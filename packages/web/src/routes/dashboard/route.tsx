import { useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Outlet, useNavigate } from "react-router";
import { WorkspaceRedirectSkeleton } from "@/components/skeleton";
import { workspaceApi } from "@/generated/rust-api";
import { useAuth, WorkspaceListContext } from "@/hooks";

function parseLang(cookieHeader: string): "zh-CN" | "en" {
  const m = cookieHeader.match(/(?:^|;\s*)i18next=([^;]*)/);
  return m?.[1] === "en" ? "en" : "zh-CN";
}

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLang(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title:
      data?.lang === "en"
        ? "Dashboard — OhMyWRT Toolbox"
        : "控制台 — OhMyWRT Toolbox",
  },
  { name: "robots", content: "noindex, nofollow" },
];

export default function DashboardRoot() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const workspacesQuery = workspaceApi.list.useQuery({
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      const params = new URLSearchParams({
        redirect: window.location.pathname + window.location.search,
      });
      navigate(`/login?${params}`, { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return <WorkspaceRedirectSkeleton />;
  }

  if (!user) return null;

  return (
    <WorkspaceListContext.Provider
      value={{
        workspaces: workspacesQuery.data ?? [],
        isLoading: workspacesQuery.isLoading,
      }}
    >
      <Outlet />
    </WorkspaceListContext.Provider>
  );
}
