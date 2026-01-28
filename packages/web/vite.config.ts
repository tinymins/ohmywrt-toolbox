import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    host: "0.0.0.0", // 监听所有网络接口，允许内网访问
    port: 5173,
    proxy: {
      "/trpc": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});
