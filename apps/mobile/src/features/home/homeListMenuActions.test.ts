import { EnvironmentHubMenuEvent } from "@t3tools/client-runtime/environment";
import { describe, expect, it, vi } from "vite-plus/test";

import { handleHomeListMenuAction } from "./homeListMenuActions";

describe("handleHomeListMenuAction environment hub", () => {
  it("routes manage and add hub events to callbacks", () => {
    const onManageEnvironments = vi.fn();
    const onAddEnvironment = vi.fn();

    handleHomeListMenuAction(EnvironmentHubMenuEvent.manage, {
      environments: [],
      onEnvironmentChange: vi.fn(),
      onProjectSortOrderChange: vi.fn(),
      onThreadSortOrderChange: vi.fn(),
      onProjectGroupingModeChange: vi.fn(),
      onManageEnvironments,
      onAddEnvironment,
    });
    handleHomeListMenuAction(EnvironmentHubMenuEvent.add, {
      environments: [],
      onEnvironmentChange: vi.fn(),
      onProjectSortOrderChange: vi.fn(),
      onThreadSortOrderChange: vi.fn(),
      onProjectGroupingModeChange: vi.fn(),
      onManageEnvironments,
      onAddEnvironment,
    });

    expect(onManageEnvironments).toHaveBeenCalledTimes(1);
    expect(onAddEnvironment).toHaveBeenCalledTimes(1);
  });
});
