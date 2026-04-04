export interface ToastPayload {
  type: string;
  content: string;
  route?: string;
}

let _toastCallback: ((msg: ToastPayload) => void) | null = null;

export const registerToastCallback = (cb: (msg: ToastPayload) => void) => {
  _toastCallback = cb;
};

type MessageArg = string | { content: string; key?: string; route?: string };

const notify = (type: string, arg: MessageArg) => {
  const content = typeof arg === "string" ? arg : arg.content;
  const route = typeof arg === "string" ? undefined : arg.route;
  if (_toastCallback) {
    _toastCallback({ type, content, route });
  } else {
    if (type === "error") console.error(content);
    else console.log(content);
  }
};

export const message = {
  success: (arg: MessageArg) => notify("success", arg),
  error: (arg: MessageArg) => notify("error", arg),
  info: (arg: MessageArg) => notify("info", arg),
  warning: (arg: MessageArg) => notify("warning", arg),
};
