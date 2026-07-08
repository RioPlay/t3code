import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import * as Notifications from "expo-notifications";

import {
  AGENT_NOTIFICATION_CHANNEL_IDS,
  ensureAgentNotificationChannels,
  resetAgentNotificationChannelsForTests,
} from "./notificationChannels";

const platformState = vi.hoisted(() => ({
  OS: "android" as "ios" | "android" | "web",
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return platformState.OS;
    },
  },
}));

vi.mock("expo-notifications", () => ({
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
  },
  setNotificationChannelAsync: vi.fn(() => Promise.resolve(null)),
}));

describe("ensureAgentNotificationChannels", () => {
  beforeEach(() => {
    platformState.OS = "android";
    resetAgentNotificationChannelsForTests();
    vi.mocked(Notifications.setNotificationChannelAsync).mockClear();
  });

  it("registers all AGT-002 channel ids on Android", async () => {
    await ensureAgentNotificationChannels();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(5);
    expect(
      vi.mocked(Notifications.setNotificationChannelAsync).mock.calls.map(([id]) => id),
    ).toEqual([
      AGENT_NOTIFICATION_CHANNEL_IDS.approval,
      AGENT_NOTIFICATION_CHANNEL_IDS.input,
      AGENT_NOTIFICATION_CHANNEL_IDS.failed,
      AGENT_NOTIFICATION_CHANNEL_IDS.completed,
      AGENT_NOTIFICATION_CHANNEL_IDS.running,
    ]);
  });

  it("uses system default sound for audible channels and disables sound for low-importance", async () => {
    await ensureAgentNotificationChannels();

    const channelOptions = Object.fromEntries(
      vi
        .mocked(Notifications.setNotificationChannelAsync)
        .mock.calls.map(([id, options]) => [id, options]),
    );

    for (const id of [
      AGENT_NOTIFICATION_CHANNEL_IDS.approval,
      AGENT_NOTIFICATION_CHANNEL_IDS.input,
      AGENT_NOTIFICATION_CHANNEL_IDS.failed,
      AGENT_NOTIFICATION_CHANNEL_IDS.completed,
    ]) {
      expect(channelOptions[id]).not.toHaveProperty("sound");
    }

    expect(channelOptions[AGENT_NOTIFICATION_CHANNEL_IDS.running]).toEqual(
      expect.objectContaining({ sound: null }),
    );
  });

  it("skips channel registration on non-Android platforms", async () => {
    platformState.OS = "ios";
    await ensureAgentNotificationChannels();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
