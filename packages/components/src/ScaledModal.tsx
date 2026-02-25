import { Modal, type ModalProps } from "antd";
import type { CSSProperties } from "react";

/**
 * Modal 全屏程度
 * - "full": 完全全屏，无圆角，紧贴四边
 * - "almost-full": 几乎全屏，四周留小间距，保留弹出层感
 * - "large": 大窗口，比默认大很多
 * - "default": antd 默认大小
 */
export type ScaledModalSize = "full" | "almost-full" | "large" | "default";

export interface ScaledModalProps extends Omit<ModalProps, "width"> {
  /** 弹窗尺寸模式，默认 "default" */
  size?: ScaledModalSize;
  /** 允许直接传 width，仅 size="default" 时生效 */
  width?: ModalProps["width"];
}

interface SizeConfig {
  width: string | number;
  style: CSSProperties;
  bodyStyle: CSSProperties;
  wrapperStyle?: CSSProperties;
  /** 对应 antd Modal styles.container（即 content 面板） */
  containerStyle?: CSSProperties;
}

/** 细滚动条样式，半透明灰色同时适配亮色/暗色主题 */
const THIN_SCROLLBAR: CSSProperties = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(128,128,128,0.4) transparent",
};

const SIZE_CONFIG: Record<ScaledModalSize, SizeConfig> = {
  full: {
    width: "100vw",
    style: { top: 0, maxWidth: "100vw", margin: 0, padding: 0 },
    bodyStyle: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      ...THIN_SCROLLBAR,
    },
    wrapperStyle: { overflow: "hidden" },
    containerStyle: {
      borderRadius: 0,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
    },
  },
  "almost-full": {
    width: "calc(100vw - 48px)",
    style: { top: 24, maxWidth: "calc(100vw - 48px)", padding: 0 },
    bodyStyle: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      ...THIN_SCROLLBAR,
    },
    wrapperStyle: { overflow: "hidden" },
    containerStyle: {
      height: "calc(100vh - 48px)",
      display: "flex",
      flexDirection: "column",
    },
  },
  large: {
    width: "90vw",
    style: { top: 40, maxWidth: 1400 },
    bodyStyle: {
      maxHeight: `calc(100vh - 200px)`,
      overflowY: "auto",
      overflowX: "hidden",
      ...THIN_SCROLLBAR,
    },
  },
  default: {
    width: 520,
    style: {},
    bodyStyle: {},
  },
};

export default function ScaledModal({
  size = "default",
  width,
  style,
  styles,
  children,
  ...rest
}: ScaledModalProps) {
  const config = SIZE_CONFIG[size];

  const mergedWidth =
    size === "default" ? (width ?? config.width) : config.width;

  const mergedStyle: CSSProperties = {
    ...config.style,
    ...style,
  };

  // Antd 6 的 styles 类型为 Resolvable 联合类型，这里用函数形式确保类型安全
  const mergedStyles: ModalProps["styles"] = (info) => {
    const userStyles =
      typeof styles === "function" ? styles(info) : (styles ?? {});
    return {
      ...userStyles,
      body: { ...config.bodyStyle, ...userStyles.body },
      wrapper: { ...config.wrapperStyle, ...userStyles.wrapper },
      container: { ...config.containerStyle, ...userStyles.container },
    };
  };

  return (
    <Modal
      width={mergedWidth}
      style={mergedStyle}
      styles={mergedStyles}
      {...rest}
    >
      {children}
    </Modal>
  );
}
