import { Skeleton } from "antd";

export default function WorkspaceRedirectSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="card space-y-4">
        <Skeleton active title paragraph={{ rows: 3 }} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <Skeleton active title paragraph={{ rows: 4 }} />
        </div>
        <div className="card">
          <Skeleton active title paragraph={{ rows: 4 }} />
        </div>
      </div>
    </div>
  );
}
