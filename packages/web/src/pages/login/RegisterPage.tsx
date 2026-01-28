import type { User } from "@acme/types";
import LoginPage from "./LoginPage";

type RegisterPageProps = {
  onLogin: (user: User) => void;
};

export default function RegisterPage({ onLogin }: RegisterPageProps) {
  return <LoginPage onLogin={onLogin} initialMode="register" />;
}
