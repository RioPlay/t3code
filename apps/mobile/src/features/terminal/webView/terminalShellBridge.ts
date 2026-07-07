export type TerminalShellOutboundMessage =
  | { readonly type: "ready" }
  | { readonly type: "input"; readonly data: string }
  | { readonly type: "resize"; readonly cols: number; readonly rows: number };

const ALLOWED_TYPES = new Set(["ready", "input", "resize"]);

export function parseTerminalShellOutboundMessage(
  raw: string,
): TerminalShellOutboundMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
    return null;
  }

  const type = (parsed as { readonly type?: unknown }).type;
  if (typeof type !== "string" || !ALLOWED_TYPES.has(type)) {
    return null;
  }

  if (type === "ready") {
    return { type: "ready" };
  }

  if (type === "input") {
    const data = (parsed as { readonly data?: unknown }).data;
    if (typeof data !== "string") {
      return null;
    }
    return { type: "input", data };
  }

  const cols = (parsed as { readonly cols?: unknown }).cols;
  const rows = (parsed as { readonly rows?: unknown }).rows;
  if (typeof cols !== "number" || typeof rows !== "number") {
    return null;
  }
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) {
    return null;
  }

  return {
    type: "resize",
    cols: Math.max(1, Math.floor(cols)),
    rows: Math.max(1, Math.floor(rows)),
  };
}

export function buildTerminalShellConfigureScript(input: {
  readonly fontSize: number;
  readonly isRunning: boolean;
  readonly theme: {
    readonly background: string;
    readonly foreground: string;
    readonly cursor: string;
    readonly selectionBackground: string;
  };
}): string {
  return `window.__T3_TERMINAL__?.configure(${JSON.stringify(input)}); true;`;
}

export function buildTerminalShellWriteScript(data: string): string {
  return `window.__T3_TERMINAL__?.write(${JSON.stringify(data)}); true;`;
}

export function buildTerminalShellClearScript(): string {
  return "window.__T3_TERMINAL__?.clear(); true;";
}

export function buildTerminalShellFocusScript(): string {
  return "window.__T3_TERMINAL__?.focus(); true;";
}
