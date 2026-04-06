import type { FieldOrigin } from "@acme/types";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// ─── Key color by transform type (risk-ordered: green=safe → red=risky) ───

const KEY_COLORS: Record<string, string> = {
  direct: "text-green-700 dark:text-green-400",
  rename: "text-sky-700 dark:text-sky-400",
  convert: "text-violet-700 dark:text-violet-400",
  extract: "text-amber-700 dark:text-amber-400",
  fallback: "text-orange-600 dark:text-orange-400",
  container: "text-teal-600 dark:text-teal-400",
  generated: "text-red-600 dark:text-red-400",
};

const DEFAULT_KEY_COLOR = "text-gray-700 dark:text-gray-300";

function resolveOrigin(
  path: string,
  fieldOrigins?: Record<string, FieldOrigin>,
): FieldOrigin | undefined {
  if (!fieldOrigins) return undefined;
  const direct = fieldOrigins[path];
  if (direct) return direct;
  // Array element inherits parent
  const parent = path.replace(/\[\d+\]$/, "");
  return parent !== path ? fieldOrigins[parent] : undefined;
}

function keyColorClass(
  path: string,
  fieldOrigins?: Record<string, FieldOrigin>,
): string {
  const origin = resolveOrigin(path, fieldOrigins);
  if (!origin) return DEFAULT_KEY_COLOR;
  return KEY_COLORS[origin.transform] ?? DEFAULT_KEY_COLOR;
}

// ─── Tooltip ───

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

function useKeyTooltip(fieldOrigins?: Record<string, FieldOrigin>) {
  const { t } = useTranslation();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(
    (path: string, e: React.MouseEvent) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const origin = resolveOrigin(path, fieldOrigins);
      if (!origin) return;

      const stepLabel = t(`proxy.debug.originStep.${origin.step}`);
      const transformLabel = t(
        `proxy.debug.originTransform.${origin.transform}`,
      );
      const icon = STEP_ICONS[origin.step] ?? "❓";
      let text = `${transformLabel} · ${icon} ${stepLabel}`;
      if (origin.sourceKey) text += ` ← ${origin.sourceKey}`;
      if (
        origin.reason &&
        origin.reason !== "converter_internal" &&
        origin.transform === "generated"
      ) {
        const reasonText = t(
          `proxy.debug.originReason.${origin.reason}`,
          origin.reason,
        );
        text += ` · ${reasonText}`;
      }

      // Position above the key element, not at cursor
      const target = e.currentTarget as HTMLElement;
      const targetRect = target.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      const x = targetRect.left - (containerRect?.left ?? 0);
      const y = targetRect.top - (containerRect?.top ?? 0);
      setTooltip({ text, x, y });
    },
    [fieldOrigins, t],
  );

  const hide = useCallback(() => {
    hideTimer.current = setTimeout(() => setTooltip(null), 150);
  }, []);

  return { tooltip, show, hide, containerRef };
}

function Tooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null;
  return (
    <div
      className="absolute z-50 max-w-xs px-2 py-1 text-[10px] leading-tight font-sans rounded shadow-lg bg-gray-800 text-gray-100 dark:bg-gray-200 dark:text-gray-900 pointer-events-none whitespace-nowrap"
      style={{ left: state.x, top: state.y - 28 }}
    >
      {state.text}
    </div>
  );
}

// ─── Exports ───

interface InteractiveJsonViewerProps {
  data: Record<string, unknown>;
  fieldOrigins?: Record<string, FieldOrigin>;
  maxHeight?: number;
}

/** Interactive JSON viewer with clickable keys for field provenance tracing */
export function InteractiveJsonViewer({
  data,
  fieldOrigins,
  maxHeight,
}: InteractiveJsonViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const { tooltip, show, hide, containerRef } = useKeyTooltip(fieldOrigins);

  const origin = selectedPath ? fieldOrigins?.[selectedPath] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="relative">
        <div
          className="!p-3 !text-xs !bg-gray-50 dark:!bg-gray-900 !rounded-md !overflow-auto !font-mono leading-5"
          style={{ maxHeight: maxHeight ?? 400 }}
        >
          <JsonNode
            value={data}
            path=""
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            fieldOrigins={fieldOrigins}
            onHoverKey={show}
            onLeaveKey={hide}
            indent={0}
            isLast
          />
        </div>
        <Tooltip state={tooltip} />
      </div>
      <FieldOriginPanel
        path={selectedPath}
        origin={origin}
        fieldOrigins={fieldOrigins}
      />
    </div>
  );
}

/** Read-only JSON syntax highlighter (no provenance, no click) */
export function SyntaxJsonViewer({
  data,
  maxHeight,
}: {
  data: unknown;
  maxHeight?: number;
}) {
  return (
    <div
      className="!p-3 !text-xs !bg-gray-50 dark:!bg-gray-900 !rounded-md !overflow-auto !font-mono leading-5"
      style={{ maxHeight: maxHeight ?? 400 }}
    >
      <JsonNode
        value={data}
        path=""
        selectedPath={null}
        onSelect={() => {}}
        indent={0}
        isLast
      />
    </div>
  );
}

// ─── JSON recursive renderer ───

function JsonNode({
  value,
  path,
  selectedPath,
  onSelect,
  fieldOrigins,
  onHoverKey,
  onLeaveKey,
  indent,
  isLast,
}: {
  value: unknown;
  path: string;
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  fieldOrigins?: Record<string, FieldOrigin>;
  onHoverKey?: (path: string, e: React.MouseEvent) => void;
  onLeaveKey?: () => void;
  indent: number;
  isLast: boolean;
}) {
  if (value === null)
    return <span className="text-gray-500">null{!isLast && ","}</span>;
  if (typeof value === "boolean")
    return (
      <span className="text-purple-600 dark:text-purple-400">
        {String(value)}
        {!isLast && ","}
      </span>
    );
  if (typeof value === "number")
    return (
      <span className="text-blue-600 dark:text-blue-400">
        {value}
        {!isLast && ","}
      </span>
    );
  if (typeof value === "string")
    return (
      <span className="text-green-700 dark:text-green-400">
        &quot;{value}&quot;{!isLast && ","}
      </span>
    );

  if (Array.isArray(value)) {
    if (value.length === 0)
      return (
        <span>
          {"[]"}
          {!isLast && ","}
        </span>
      );
    return (
      <span>
        {"["}
        {value.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: JSON array order is deterministic
          <div key={`${path}[${i}]`} style={{ paddingLeft: 16 }}>
            <JsonNode
              value={item}
              path={`${path}[${i}]`}
              selectedPath={selectedPath}
              onSelect={onSelect}
              fieldOrigins={fieldOrigins}
              onHoverKey={onHoverKey}
              onLeaveKey={onLeaveKey}
              indent={indent + 1}
              isLast={i === value.length - 1}
            />
          </div>
        ))}
        {"]"}
        {!isLast && ","}
      </span>
    );
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0)
      return (
        <span>
          {"{}"}
          {!isLast && ","}
        </span>
      );

    return (
      <span>
        {"{"}
        {entries.map(([key, val], i) => {
          const childPath = path ? `${path}.${key}` : key;
          const isSelected = selectedPath === childPath;
          const isChildSelected =
            selectedPath?.startsWith(`${childPath}.`) ||
            selectedPath?.startsWith(`${childPath}[`);
          const color = fieldOrigins
            ? keyColorClass(childPath, fieldOrigins)
            : DEFAULT_KEY_COLOR;

          return (
            <div key={key} style={{ paddingLeft: 16 }}>
              <span
                className={`cursor-pointer rounded px-0.5 -mx-0.5 transition-colors ${color} ${
                  isSelected
                    ? "!bg-yellow-200 dark:!bg-yellow-800/60 ring-1 ring-yellow-400 dark:ring-yellow-600"
                    : isChildSelected
                      ? "bg-yellow-50 dark:bg-yellow-900/20"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(isSelected ? null : childPath);
                }}
                onMouseEnter={(e) => onHoverKey?.(childPath, e)}
                onMouseLeave={() => onLeaveKey?.()}
              >
                &quot;{key}&quot;
              </span>
              {": "}
              <JsonNode
                value={val}
                path={childPath}
                selectedPath={selectedPath}
                onSelect={onSelect}
                fieldOrigins={fieldOrigins}
                onHoverKey={onHoverKey}
                onLeaveKey={onLeaveKey}
                indent={indent + 1}
                isLast={i === entries.length - 1}
              />
            </div>
          );
        })}
        {"}"}
        {!isLast && ","}
      </span>
    );
  }

  return (
    <span>
      {String(value)}
      {!isLast && ","}
    </span>
  );
}

// ─── Provenance panel ───

const STEP_ICONS: Record<string, string> = {
  core: "🏗️",
  tls: "🔒",
  transport: "🔀",
  multiplex: "📡",
  dial: "📞",
  type: "🔧",
  unknown: "❓",
};

const TRANSFORM_COLORS: Record<string, string> = {
  direct:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rename: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  convert:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  extract:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  fallback:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  container: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  generated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function FieldOriginPanel({
  path,
  origin,
  fieldOrigins,
}: {
  path: string | null;
  origin?: FieldOrigin;
  fieldOrigins?: Record<string, FieldOrigin>;
}) {
  const { t } = useTranslation();

  if (!path) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-md">
        💡 {t("proxy.debug.originClickHint")}
      </div>
    );
  }

  if (!origin) {
    // Try parent path for array elements
    const parentPath = path.replace(/\[\d+\]$/, "");
    const parentOrigin =
      parentPath !== path ? fieldOrigins?.[parentPath] : undefined;

    if (parentOrigin) {
      return (
        <OriginCard
          path={path}
          origin={parentOrigin}
          isInherited
          parentPath={parentPath}
        />
      );
    }

    return (
      <div className="text-xs text-gray-500 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <span className="font-mono font-semibold">{path}</span>
        <span className="ml-2">{t("proxy.debug.originNoData")}</span>
      </div>
    );
  }

  return <OriginCard path={path} origin={origin} />;
}

function OriginCard({
  path,
  origin,
  isInherited,
  parentPath,
}: {
  path: string;
  origin: FieldOrigin;
  isInherited?: boolean;
  parentPath?: string;
}) {
  const { t } = useTranslation();
  const icon = STEP_ICONS[origin.step] ?? "❓";
  const transformClass =
    TRANSFORM_COLORS[origin.transform] ?? TRANSFORM_COLORS.direct;

  return (
    <div className="text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
          {path}
        </span>
        {isInherited && parentPath && (
          <span className="text-gray-400">
            ← {t("proxy.debug.originInherited")} {parentPath}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {/* Transform + Step */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${transformClass}`}
          >
            {t(`proxy.debug.originTransform.${origin.transform}`)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {icon} {t(`proxy.debug.originStep.${origin.step}`)}
          </span>
        </div>

        {/* Source info */}
        {origin.transform === "container" && origin.sources && (
          <div className="text-gray-600 dark:text-gray-400">
            {t("proxy.debug.originContainerSources")}:{" "}
            {origin.sources.map((s, i) => (
              <span key={s}>
                {i > 0 && ", "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {s}
                </code>
              </span>
            ))}
          </div>
        )}

        {origin.sourceKey && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400 shrink-0">
              {t("proxy.debug.originSourceKey")}:
            </span>
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded font-semibold">
              {origin.sourceKey}
            </code>
            {origin.sourceValue !== undefined && (
              <>
                <span className="text-gray-400">=</span>
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-green-700 dark:text-green-400 truncate max-w-[300px]">
                  {JSON.stringify(origin.sourceValue)}
                </code>
              </>
            )}
          </div>
        )}

        {/* Reason for generated fields */}
        {origin.reason && origin.reason !== "converter_internal" && (
          <div className="text-gray-600 dark:text-gray-400">
            💡 {t(`proxy.debug.originReason.${origin.reason}`, origin.reason)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Provenance Table ───

interface ProvenanceRow {
  path: string;
  key: string;
  depth: number;
  value: unknown;
  origin?: FieldOrigin;
  hasChildren: boolean;
}

function buildProvenanceRows(
  data: Record<string, unknown>,
  fieldOrigins: Record<string, FieldOrigin>,
  prefix: string,
  depth: number,
): ProvenanceRow[] {
  const rows: ProvenanceRow[] = [];
  for (const [key, val] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const origin = fieldOrigins[path];
    const isObj =
      val !== null && typeof val === "object" && !Array.isArray(val);
    const isArr = Array.isArray(val);
    rows.push({
      path,
      key,
      depth,
      value: val,
      origin,
      hasChildren:
        (isObj && Object.keys(val as object).length > 0) ||
        (isArr && (val as unknown[]).length > 0),
    });
    if (isObj) {
      rows.push(
        ...buildProvenanceRows(
          val as Record<string, unknown>,
          fieldOrigins,
          path,
          depth + 1,
        ),
      );
    } else if (isArr) {
      for (let i = 0; i < (val as unknown[]).length; i++) {
        const item = (val as unknown[])[i];
        const itemPath = `${path}[${i}]`;
        const itemOrigin = fieldOrigins[itemPath];
        if (item !== null && typeof item === "object" && !Array.isArray(item)) {
          rows.push({
            path: itemPath,
            key: `[${i}]`,
            depth: depth + 1,
            value: item,
            origin: itemOrigin,
            hasChildren: Object.keys(item as object).length > 0,
          });
          rows.push(
            ...buildProvenanceRows(
              item as Record<string, unknown>,
              fieldOrigins,
              itemPath,
              depth + 2,
            ),
          );
        }
      }
    }
  }
  return rows;
}

function isDescendant(childPath: string, parentPath: string): boolean {
  return (
    childPath.startsWith(`${parentPath}.`) ||
    childPath.startsWith(`${parentPath}[`)
  );
}

function formatCellValue(
  value: unknown,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value))
    return t("proxy.debug.originTableJsonArray", { count: value.length });
  if (typeof value === "object") return t("proxy.debug.originTableJsonObject");
  return String(value);
}

function getSourceDescription(
  origin: FieldOrigin | undefined,
  t: (key: string, opts?: string | Record<string, unknown>) => string,
): string {
  if (!origin) return "—";
  const icon = STEP_ICONS[origin.step] ?? "❓";
  const step = t(`proxy.debug.originStep.${origin.step}`);
  const parts: string[] = [`${icon} ${step}`];

  if (origin.transform === "container" && origin.sources) {
    parts.push(
      t("proxy.debug.originTableFromFields", {
        fields: origin.sources.join(", "),
      }) as string,
    );
  } else if (origin.sourceKey) {
    let src = `${t("proxy.debug.originSourceKey")}: .${origin.sourceKey}`;
    if (origin.sourceValue !== undefined) {
      const sv = JSON.stringify(origin.sourceValue);
      if (sv.length <= 40) src += ` = ${sv}`;
    }
    parts.push(src);
  }

  if (origin.reason && origin.reason !== "converter_internal") {
    parts.push(
      `💡 ${t(`proxy.debug.originReason.${origin.reason}`, origin.reason)}`,
    );
  }

  return parts.join(" · ");
}

const TRANSFORM_TEXT_COLORS: Record<string, string> = {
  direct: "text-green-700 dark:text-green-400",
  rename: "text-sky-700 dark:text-sky-400",
  convert: "text-violet-700 dark:text-violet-400",
  extract: "text-amber-700 dark:text-amber-400",
  fallback: "text-orange-600 dark:text-orange-400",
  container: "text-teal-600 dark:text-teal-400",
  generated: "text-red-600 dark:text-red-400",
};

/** Hierarchical provenance tree-table for field origin tracing */
export function ProvenanceTable({
  data,
  fieldOrigins,
  maxHeight,
}: {
  data: Record<string, unknown>;
  fieldOrigins: Record<string, FieldOrigin>;
  maxHeight?: number;
}) {
  const { t } = useTranslation();
  const allRows = useMemo(
    () => buildProvenanceRows(data, fieldOrigins, "", 0),
    [data, fieldOrigins],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback(
    (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          // Collapse: also collapse all descendants
          next.delete(path);
          for (const row of allRows) {
            if (isDescendant(row.path, path)) next.delete(row.path);
          }
        } else {
          next.add(path);
        }
        return next;
      });
    },
    [allRows],
  );

  const visibleRows = useMemo(() => {
    return allRows.filter((row) => {
      if (row.depth === 0) return true;
      // Walk up: every ancestor with children must be expanded
      for (const other of allRows) {
        if (
          other.hasChildren &&
          isDescendant(row.path, other.path) &&
          !expanded.has(other.path)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allRows, expanded]);

  return (
    <div
      className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-md"
      style={{ maxHeight: maxHeight ?? 500 }}
    >
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
              {t("proxy.debug.originTablePath")}
            </th>
            <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
              {t("proxy.debug.originTableValue")}
            </th>
            <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
              {t("proxy.debug.originTableTransform")}
            </th>
            <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-200 dark:border-gray-700">
              {t("proxy.debug.originTableSource")}
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const isExpanded = expanded.has(row.path);
            const transformColor = row.origin
              ? (TRANSFORM_TEXT_COLORS[row.origin.transform] ?? "")
              : "";
            const transformBgColor = row.origin
              ? (TRANSFORM_COLORS[row.origin.transform] ?? "")
              : "";

            return (
              <tr
                key={row.path}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-2 py-1 font-mono whitespace-nowrap align-top">
                  <span style={{ paddingLeft: row.depth * 16 }}>
                    {row.hasChildren ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 cursor-pointer"
                        onClick={() => toggleExpand(row.path)}
                      >
                        <span className="w-3.5 text-gray-400 text-[10px] select-none">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                        <span
                          className={
                            transformColor || "text-gray-700 dark:text-gray-300"
                          }
                        >
                          {row.key}
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">
                        <span className="w-3.5" />
                        <span
                          className={
                            transformColor || "text-gray-700 dark:text-gray-300"
                          }
                        >
                          {row.key}
                        </span>
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-1 font-mono max-w-[200px] truncate align-top">
                  <span
                    className={
                      typeof row.value === "string"
                        ? "text-green-700 dark:text-green-400"
                        : typeof row.value === "number"
                          ? "text-blue-700 dark:text-blue-400"
                          : typeof row.value === "boolean"
                            ? "text-purple-700 dark:text-purple-400"
                            : row.value === null
                              ? "text-gray-400"
                              : "text-gray-500 dark:text-gray-400"
                    }
                    title={
                      typeof row.value === "string" ||
                      typeof row.value === "number" ||
                      typeof row.value === "boolean"
                        ? String(row.value)
                        : undefined
                    }
                  >
                    {formatCellValue(row.value, t)}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap align-top">
                  {row.origin && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${transformBgColor}`}
                    >
                      {t(`proxy.debug.originTransform.${row.origin.transform}`)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 text-gray-600 dark:text-gray-400 align-top max-w-[300px]">
                  <span className="break-words">
                    {getSourceDescription(row.origin, t)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
