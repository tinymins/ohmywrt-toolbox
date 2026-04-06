import { resolve } from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, "../.."), [
    "SERVER_PORT",
    "WEB_PORT",
    "VITE_",
    "RUST_",
  ]);

  const serverPort = Number(env.SERVER_PORT) || 4000;
  const webPort = Number(env.WEB_PORT) || 5173;

  return {
    plugins: [reactRouter(), tailwindcss()],
    envPrefix: ["VITE_", "RUST_"],
    resolve: {
      tsconfigPaths: true,
      alias: {
        "@/": `${resolve(__dirname, "src")}/`,
      },
      "/public": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
    server: {
      host: "0.0.0.0",
      port: webPort,
      watch: {
        // Prevent Vite from caching empty file content when external tools
        // (CLI editors, git operations) truncate+write files — chokidar would
        // otherwise pick up the intermediate empty state and cache it.
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      },
      proxy: {
        "/api": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        "/upload": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
        "/storage": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
