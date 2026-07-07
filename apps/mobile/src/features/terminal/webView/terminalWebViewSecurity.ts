export const TERMINAL_WEBVIEW_ALLOWED_ORIGINS = ["about:blank", "file://"] as const;

export function terminalWebViewAllowsNavigation(url: string): boolean {
  if (url.length === 0) {
    return true;
  }
  return TERMINAL_WEBVIEW_ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
}

export function terminalWebViewUsesBundledHtmlSource(source: {
  readonly html?: string | null;
  readonly uri?: string | null;
}): boolean {
  return typeof source.html === "string" && source.html.length > 0 && !source.uri;
}
