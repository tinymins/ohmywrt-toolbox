import type { SystemSettings } from "@acme/types";
import type { ReactElement, ReactNode } from "react";
import { createContext, useContext } from "react";
import { authApi } from "@/generated/rust-api";

type SystemSettingsState = {
  settings: SystemSettings | null;
  isLoading: boolean;
  singleWorkspaceMode: boolean;
};

const SystemSettingsContext = createContext<SystemSettingsState>({
  settings: null,
  isLoading: true,
  singleWorkspaceMode: false,
});

export function SystemSettingsProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const settingsQuery = authApi.systemSettings.useQuery({
    staleTime: 60_000,
  });

  const settings = settingsQuery.data ?? null;

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isLoading: settingsQuery.isPending,
        singleWorkspaceMode: settings?.singleWorkspaceMode ?? false,
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings(): SystemSettingsState {
  return useContext(SystemSettingsContext);
}
