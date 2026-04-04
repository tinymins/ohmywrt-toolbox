/**
 * Rust API Runtime — typed React Query hooks for calling the Rust server.
 *
 * Provides `createQuery` / `createMutation` factories that produce
 * `.useQuery()` / `.useMutation()` hooks:
 *
 *   const { data } = api.user.getProfile.useQuery();
 *   const mutation = api.user.updateProfile.useMutation();
 */

import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useErrorDisplay } from "@/lib/error-display";

// ── Base URL ─────────────────────────────────────────────────────────────────

import { DEV_SERVER } from "@/lib/server-base";

export function rustUrl(path: string): string {
  return DEV_SERVER ? `${DEV_SERVER}${path}` : path;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

interface ApiOk<T> {
  success: true;
  data: T;
}
interface ApiErr {
  success: false;
  error: string;
}
type ApiResult<T> = ApiOk<T> | ApiErr;

class RustApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "RustApiError";
  }
}

function langHeader(): string {
  try {
    // Dynamic import would be async; read the html lang attr set by i18next as a sync fallback.
    return document.documentElement.lang || "zh-CN";
  } catch {
    return "zh-CN";
  }
}

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-lang": langHeader(),
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new RustApiError("Network error", 0);
  }
  let json: ApiResult<T>;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    throw new RustApiError("Invalid JSON response", res.status);
  }
  if (!json.success) {
    throw new RustApiError(
      (json as ApiErr).error ?? "Unknown error",
      res.status,
    );
  }
  return (json as ApiOk<T>).data;
}

// ── Hook factories ───────────────────────────────────────────────────────────

interface RouteConfig {
  /** HTTP method. Defaults to "GET" for queries, "POST" for mutations. */
  method?: string;
  /** URL path, e.g. "/api/user/profile". Also used as the query-key base. */
  path: string;
}

interface QueryRouteConfig<TInput> extends RouteConfig {
  /** Build a dynamic URL path from the input (overrides `path` for the actual fetch). */
  pathFn?: (input: TInput) => string;
  /** Extract query-string params from the input (used instead of serializing the full input). */
  paramsFn?: (input: TInput) => Record<string, string>;
}

interface MutationRouteConfig<TInput> extends RouteConfig {
  /** Build a dynamic URL path from the input (overrides `path` for the actual fetch). */
  pathFn?: (input: TInput) => string;
  /** Extract the JSON body from the input (used instead of serializing the full input). */
  bodyFn?: (input: TInput) => unknown;
}

/**
 * Create a typed query hook (GET-style, read-only).
 *
 * Usage:
 *   getProfile: createQuery<void, User>({ path: "/api/user/profile" })
 *   // → api.user.getProfile.useQuery()
 *
 *   // Dynamic path with explicit query params:
 *   browse: createQuery<{ id: string; path: string }, Response>({
 *     path: "/api/file-systems",
 *     pathFn: (input) => `/api/file-systems/${input.id}/browse`,
 *     paramsFn: (input) => ({ path: input.path }),
 *   })
 */
export function createQuery<TInput, TOutput>(cfg: QueryRouteConfig<TInput>) {
  const method = cfg.method ?? "GET";

  function queryKey(input?: TInput): QueryKey {
    return input != null ? [cfg.path, input] : [cfg.path];
  }

  function queryFn(input?: TInput): () => Promise<TOutput> {
    return () => {
      const actualPath =
        cfg.pathFn && input != null ? cfg.pathFn(input) : cfg.path;

      if (method === "GET") {
        let qs = "";
        if (cfg.paramsFn && input != null) {
          qs = `?${new URLSearchParams(cfg.paramsFn(input)).toString()}`;
        } else if (!cfg.pathFn && input != null) {
          qs = `?${new URLSearchParams(input as Record<string, string>).toString()}`;
        }
        return callApi<TOutput>(rustUrl(`${actualPath}${qs}`));
      }
      return callApi<TOutput>(rustUrl(actualPath), {
        method,
        body: input != null ? JSON.stringify(input) : undefined,
      });
    };
  }

  return {
    queryKey,
    /**
     * React Query `useQuery` hook.
     * Pass `input` as the first arg (skip/omit for void), query options as the second.
     */
    useQuery: (
      ...args: TInput extends void
        ? [opts?: Partial<UseQueryOptions<TOutput>>]
        : [input: TInput, opts?: Partial<UseQueryOptions<TOutput>>]
    ) => {
      const [inputOrOpts, maybeOpts] = args as [unknown, unknown];
      // Detect whether the first argument is React Query options (void input)
      // or actual query input. Check if ALL keys belong to known RQ option names.
      const RQ_OPTS = new Set([
        "enabled",
        "retry",
        "retryDelay",
        "staleTime",
        "gcTime",
        "refetchOnMount",
        "refetchOnWindowFocus",
        "refetchOnReconnect",
        "refetchInterval",
        "queryKey",
        "select",
        "placeholderData",
        "initialData",
        "meta",
        "throwOnError",
        "networkMode",
        "notifyOnChangeProps",
        "structuralSharing",
      ]);
      const isVoidInput =
        inputOrOpts === undefined ||
        (typeof inputOrOpts === "object" &&
          inputOrOpts !== null &&
          Object.keys(inputOrOpts as Record<string, unknown>).every((k) =>
            RQ_OPTS.has(k),
          ));
      const input = isVoidInput ? undefined : (inputOrOpts as TInput);
      const opts = (isVoidInput ? inputOrOpts : maybeOpts) as
        | Partial<UseQueryOptions<TOutput>>
        | undefined;

      return useQuery<TOutput>({
        queryKey: queryKey(input),
        queryFn: queryFn(input),
        ...opts,
      });
    },
    /** Raw fetch (non-hook). Useful in event handlers / loaders. */
    fetch: (input?: TInput) => queryFn(input)(),
    /** Invalidate this query in a mutation's onSuccess. */
    invalidate: (qc: ReturnType<typeof useQueryClient>, input?: TInput) =>
      qc.invalidateQueries({ queryKey: queryKey(input) }),
    /** Directly update the query cache. */
    setData: (
      qc: ReturnType<typeof useQueryClient>,
      input: TInput | undefined,
      updater: TOutput | ((prev: TOutput | undefined) => TOutput | undefined),
    ) => qc.setQueryData(queryKey(input), updater),
  };
}

/**
 * Create a typed mutation hook (POST/PATCH/DELETE/PUT, write).
 *
 * Usage:
 *   updateProfile: createMutation<UpdateProfileInput, User>({ method: "PATCH", path: "/api/user/profile" })
 *   // → api.user.updateProfile.useMutation({ onSuccess: … })
 *
 *   // Dynamic path with body extraction:
 *   browseBatch: createMutation<{ id: string; paths: string[] }, Response[]>({
 *     path: "/api/file-systems",
 *     pathFn: (input) => `/api/file-systems/${input.id}/browse-batch`,
 *     bodyFn: (input) => ({ paths: input.paths }),
 *   })
 */
export function createMutation<TInput, TOutput>(
  cfg: MutationRouteConfig<TInput>,
) {
  const method = cfg.method ?? "POST";

  function mutationFn(input: TInput): Promise<TOutput> {
    const actualPath = cfg.pathFn ? cfg.pathFn(input) : cfg.path;
    const body = cfg.bodyFn ? cfg.bodyFn(input) : input;
    return callApi<TOutput>(rustUrl(actualPath), {
      method,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  }

  return {
    useMutation: (
      opts?: Partial<UseMutationOptions<TOutput, RustApiError, TInput>>,
    ) => {
      const errorDisplay = useErrorDisplay();
      return useMutation<TOutput, RustApiError, TInput>({
        mutationFn,
        ...opts,
        onError: (error, variables, ctx) => {
          if (opts?.onError) {
            (opts.onError as (e: RustApiError, v: TInput, c: unknown) => void)(
              error,
              variables,
              ctx,
            );
          } else if (errorDisplay) {
            errorDisplay.error(error.message);
          }
        },
      });
    },
    /** Raw fetch (non-hook). */
    mutate: mutationFn,
  };
}

/**
 * Create a mutation where the path contains a dynamic segment.
 *
 * Usage:
 *   revokeSession: createPathMutation<string, SuccessResponse>({
 *     method: "DELETE",
 *     pathFn: (id) => `/api/user/sessions/${encodeURIComponent(id)}`,
 *   })
 *   // → api.user.revokeSession.useMutation().mutate(sessionId)
 */
export function createPathMutation<TInput, TOutput>(cfg: {
  method?: string;
  pathFn: (input: TInput) => string;
  /** Optional: extract a JSON body from the input (for PATCH/POST with path + body). */
  bodyFn?: (input: TInput) => unknown;
}) {
  const method = cfg.method ?? "POST";

  function mutationFn(input: TInput): Promise<TOutput> {
    const body = cfg.bodyFn ? cfg.bodyFn(input) : undefined;
    return callApi<TOutput>(rustUrl(cfg.pathFn(input)), {
      method,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  }

  return {
    useMutation: (
      opts?: Partial<UseMutationOptions<TOutput, RustApiError, TInput>>,
    ) => {
      const errorDisplay = useErrorDisplay();
      return useMutation<TOutput, RustApiError, TInput>({
        mutationFn,
        ...opts,
        onError: (error, variables, ctx) => {
          if (opts?.onError) {
            (opts.onError as (e: RustApiError, v: TInput, c: unknown) => void)(
              error,
              variables,
              ctx,
            );
          } else if (errorDisplay) {
            errorDisplay.error(error.message);
          }
        },
      });
    },
    mutate: mutationFn,
  };
}

export { RustApiError };

// ── SSE Streaming ─────────────────────────────────────────────────────────────

async function streamApi<TInput, TChunk>(
  path: string,
  input: TInput,
  onChunk: (chunk: TChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(rustUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-lang": langHeader(),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    throw new RustApiError("Streaming request failed", res.status);
  }
  if (!res.body) {
    throw new RustApiError("No response body", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines (\n\n)
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      for (const line of part.split("\n")) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            onChunk(JSON.parse(raw) as TChunk);
          } catch {
            // skip malformed SSE data lines
          }
        }
      }
    }
  }
}

/**
 * Create a streaming mutation — POSTs JSON and reads SSE response chunks.
 *
 * Usage:
 *   searchStream: createStreamMutation<SearchRequest, ResultChunk[]>({ path: "/api/apps/search" })
 *   // → api.subtitle.searchStream.stream(input, (chunk) => ..., signal?)
 */
export function createStreamMutation<TInput, TChunk>(cfg: { path: string }) {
  return {
    /** Start a streaming request. `onChunk` is called with each SSE data batch. */
    stream: (
      input: TInput,
      onChunk: (chunk: TChunk) => void,
      signal?: AbortSignal,
    ): Promise<void> =>
      streamApi<TInput, TChunk>(cfg.path, input, onChunk, signal),
  };
}
