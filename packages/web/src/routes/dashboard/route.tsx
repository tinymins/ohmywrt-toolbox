import { useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Outlet, useNavigate } from "react-router";
import { WorkspaceRedirectSkeleton } from "@/components/skeleton";
import { workspaceApi } from "@/generated/rust-api";
import { useAuth, WorkspaceListContext } from "@/hooks";
import { parseLangFromCookie, serverT } from "@/lib/server-i18n";

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLangFromCookie(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const lang = data?.lang ?? "zh-CN";
  return [
    { title: serverT(lang, "common.meta.dashboardTitle") },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

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
