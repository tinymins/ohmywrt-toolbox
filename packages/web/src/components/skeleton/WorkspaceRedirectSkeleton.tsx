export default function WorkspaceRedirectSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="animate-pulse space-y-4 rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] p-6">
        <div className="h-5 w-1/3 rounded bg-[var(--bg-skeleton)]" />
        <div className="h-4 w-2/3 rounded bg-[var(--bg-skeleton)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--bg-skeleton)]" />
      </div>
    </div>
  );
}
