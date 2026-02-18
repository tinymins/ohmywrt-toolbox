import type { User } from "@acme/types";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadUser, saveUser } from "../lib/storage";
import { trpc } from "../lib/trpc";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const navigate = useNavigate();
  const logoutMutation = trpc.auth.logout.useMutation();

  const login = useCallback((nextUser: User) => {
    setUser(nextUser);
    saveUser(nextUser);
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    saveUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setUser(null);
      saveUser(null);
      navigate("/");
    }
  }, [logoutMutation, navigate]);

  return {
    user,
    isAuthed: Boolean(user),
    login,
    updateUser,
    logout,
  };
}
