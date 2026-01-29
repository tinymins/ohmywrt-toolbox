import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spin } from "antd";
import { trpc } from "../../lib/trpc";

/**
 * Proxy 全局路由重定向
 * 访问 /dashboard/proxy 时，自动重定向到用户默认 workspace 下的 proxy 页面
 */
export default function ProxyRedirect() {
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery();

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      // 重定向到第一个 workspace 的 proxy 页面
      navigate(`/dashboard/${workspaces[0].slug}/proxy`, { replace: true });
    }
  }, [workspaces, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return null;
}
