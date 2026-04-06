import type { FieldOrigin } from "@acme/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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

  const origin = selectedPath ? fieldOrigins?.[selectedPath] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="!p-3 !text-xs !bg-gray-50 dark:!bg-gray-900 !rounded-md !overflow-auto !font-mono leading-5"
        style={{ maxHeight: maxHeight ?? 400 }}
      >
        <JsonNode
          value={data}
          path=""
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          indent={0}
          isLast
        />
      </div>
      <FieldOriginPanel
        path={selectedPath}
        origin={origin}
        fieldOrigins={fieldOrigins}
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
  indent,
  isLast,
}: {
  value: unknown;
  path: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
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

          return (
            <div key={key} style={{ paddingLeft: 16 }}>
              <span
                className={`cursor-pointer rounded px-0.5 -mx-0.5 transition-colors ${
                  isSelected
                    ? "bg-yellow-200 dark:bg-yellow-800/60 text-yellow-900 dark:text-yellow-100"
                    : isChildSelected
                      ? "bg-yellow-50 dark:bg-yellow-900/20"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(childPath);
                }}
              >
                &quot;{key}&quot;
              </span>
              {": "}
              <JsonNode
                value={val}
                path={childPath}
                selectedPath={selectedPath}
                onSelect={onSelect}
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
  rename: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  convert:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  extract: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  generated:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  fallback:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  container: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
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
