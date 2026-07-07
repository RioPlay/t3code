import { describe, expect, it } from "vite-plus/test";

import {
  lanDiscoveryServiceKey,
  normalizeLanServiceType,
  resolveLanDiscoveryHostInput,
  resolveLanDiscoveryHttpBaseUrl,
  T3_CODE_LAN_SERVICE_TYPE,
} from "./lanDiscovery.js";

describe("lanDiscovery", () => {
  it("normalizes service types to _t3code._tcp", () => {
    expect(normalizeLanServiceType("t3code")).toBe(T3_CODE_LAN_SERVICE_TYPE);
    expect(normalizeLanServiceType("_t3code._tcp.")).toBe(T3_CODE_LAN_SERVICE_TYPE);
  });

  it("builds http base urls for ipv4 and ipv6 hosts", () => {
    expect(resolveLanDiscoveryHttpBaseUrl("192.168.1.42", 3773)).toBe("http://192.168.1.42:3773/");
    expect(resolveLanDiscoveryHttpBaseUrl("fe80::1", 3773)).toBe("http://[fe80::1]:3773/");
  });

  it("creates stable service keys", () => {
    expect(lanDiscoveryServiceKey("192.168.1.42", 3773)).toBe("192.168.1.42:3773");
  });

  it("formats host inputs for the mobile pairing form", () => {
    expect(resolveLanDiscoveryHostInput("http://192.168.1.42:3773/")).toBe("192.168.1.42:3773");
    expect(resolveLanDiscoveryHostInput("http://[fe80::1]:3773/")).toBe("[fe80::1]:3773");
  });
});
