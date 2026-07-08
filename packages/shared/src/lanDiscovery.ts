export const T3_CODE_LAN_SERVICE_TYPE = "_t3code._tcp";
export const T3_CODE_LAN_SERVICE_DOMAIN = "local.";

export function normalizeLanServiceType(serviceType: string): string {
  const trimmed = serviceType.trim();
  if (trimmed.length === 0) {
    return T3_CODE_LAN_SERVICE_TYPE;
  }
  if (trimmed.startsWith("_") && trimmed.includes("._tcp")) {
    return trimmed.replace(/\.$/u, "");
  }
  const base = trimmed.replace(/^_?|\._tcp\.?$/gu, "");
  return `_${base}._tcp`;
}

export function lanDiscoveryServiceKey(host: string, port: number): string {
  return `${host.trim().toLowerCase()}:${port}`;
}

export function resolveLanDiscoveryHttpBaseUrl(host: string, port: number): string {
  const normalizedHost = host.trim();
  if (normalizedHost.length === 0) {
    throw new Error("LAN discovery host is required.");
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`LAN discovery port is invalid: ${port}`);
  }
  if (normalizedHost.includes(":") && !normalizedHost.startsWith("[")) {
    return `http://[${normalizedHost}]:${port}/`;
  }
  return `http://${normalizedHost}:${port}/`;
}

export function resolveLanDiscoveryHostInput(httpBaseUrl: string): string {
  const url = new URL(httpBaseUrl);
  const hostname = url.hostname.replace(/^\[|\]$/gu, "");
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (hostname.includes(":")) {
    return `[${hostname}]:${port}`;
  }
  return port === "80" && url.protocol === "http:"
    ? hostname
    : port === "443" && url.protocol === "https:"
      ? hostname
      : `${hostname}:${port}`;
}
