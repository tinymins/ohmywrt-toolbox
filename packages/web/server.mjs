import { createRequestHandler } from "react-router";

const PORT = Number(process.env.PORT) || 3000;
const API_URL = process.env.API_URL || "http://server:4000";
const ASSET_DIR = `${import.meta.dir}/build/client`;

const build = await import("./build/server/index.js");
const handler = createRequestHandler(build, process.env.NODE_ENV);

function proxyToApi(request) {
  const url = new URL(request.url);
  const base = new URL(API_URL);
  url.protocol = base.protocol;
  url.host = base.host;
  return fetch(new Request(url.toString(), request));
}

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/trpc") || pathname.startsWith("/upload")) {
      return proxyToApi(request);
    }

    if (!pathname.includes("..")) {
      const file = Bun.file(`${ASSET_DIR}${pathname}`);
      if (await file.exists()) {
        const isImmutable = pathname.startsWith("/assets/");
        return new Response(file, {
          headers: {
            "Cache-Control": isImmutable
              ? "public, max-age=31536000, immutable"
              : "public, max-age=3600",
          },
        });
      }
    }

    return handler(request);
  },

  error(err) {
    console.error("[SSR] Unhandled error:", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`✓ React Router SSR (Bun) on http://0.0.0.0:${PORT}`);
