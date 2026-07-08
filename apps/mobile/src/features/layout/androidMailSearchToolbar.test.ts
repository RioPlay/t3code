import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const platformState = vi.hoisted(() => ({
  OS: "ios" as "ios" | "android" | "web",
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return platformState.OS;
    },
  },
}));

describe("androidMailSearchToolbar", () => {
  beforeEach(() => {
    vi.resetModules();
    platformState.OS = "ios";
  });

  afterEach(() => {
    platformState.OS = "ios";
  });

  it("builds stacked Android search bar options with pinned placement", async () => {
    const onChangeText = vi.fn();
    const onClear = vi.fn();
    const { createAndroidStackedSearchBarOptions } = await import("./androidMailSearchToolbar");
    const options = createAndroidStackedSearchBarOptions({
      placeholder: "Search files",
      onChangeText,
      onClear,
    });
    expect(options.placement).toBe("stacked");
    expect(options.hideWhenScrolling).toBe(false);
    options.onChangeText?.({ nativeEvent: { text: "alpha" } } as never);
    options.onCancelButtonPress?.({} as never);
    expect(onChangeText).toHaveBeenCalledWith("alpha");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("detects Android stacked search toolbar platform", async () => {
    platformState.OS = "android";
    const { shouldUseAndroidStackedSearchToolbar } = await import("./androidMailSearchToolbar");
    expect(shouldUseAndroidStackedSearchToolbar()).toBe(true);
  });
});
