import { describe, expect, it } from "vite-plus/test";

import {
  EnvironmentHubLabels,
  EnvironmentHubMenuEvent,
  isEnvironmentHubMenuEvent,
} from "./environmentHub.ts";

describe("environmentHub", () => {
  it("exposes stable menu event ids", () => {
    expect(EnvironmentHubMenuEvent.manage).toBe("environment-hub:manage");
    expect(EnvironmentHubMenuEvent.add).toBe("environment-hub:add");
  });

  it("recognizes hub menu events", () => {
    expect(isEnvironmentHubMenuEvent(EnvironmentHubMenuEvent.manage)).toBe(true);
    expect(isEnvironmentHubMenuEvent(EnvironmentHubMenuEvent.add)).toBe(true);
    expect(isEnvironmentHubMenuEvent("environment:all")).toBe(false);
  });

  it("keeps the web settings path stable", () => {
    expect(EnvironmentHubLabels.webSettingsPath).toBe("/settings/connections");
  });
});
