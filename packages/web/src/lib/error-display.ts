import { createContext, useContext } from "react";

export interface ErrorDisplay {
  error: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const ErrorDisplayContext = createContext<ErrorDisplay | null>(null);

export function useErrorDisplay(): ErrorDisplay | null {
  return useContext(ErrorDisplayContext);
}
