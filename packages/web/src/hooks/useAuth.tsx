import type { User } from "@acme/types";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext } from "react";
import { useNavigate } from "react-router";
import { authApi, userApi } from "@/generated/rust-api";

type AuthState = {
  user: User | null;
  isAuthed: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  isAuthed: false,
  isLoading: true,
  login: () => {},
  updateUser: () => {},
  logout: async () => {},
});

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutMutation = authApi.logout.useMutation();

  const profileQuery = userApi.getProfile.useQuery({
    retry: false,
  });

  // Derive user directly from query data — no useState/useEffect sync gap.
  const user = profileQuery.data ?? null;
  const isLoading = profileQuery.isPending;

  const login = useCallback(
    (nextUser: User) => {
      userApi.getProfile.setData(queryClient, undefined, nextUser);
    },
    [queryClient],
  );

  const updateUser = login;

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync(undefined as never);
    } finally {
      queryClient.resetQueries({
        queryKey: userApi.getProfile.queryKey(),
      });
      navigate("/");
    }
  }, [logoutMutation, queryClient, navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthed: Boolean(user),
        isLoading,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
