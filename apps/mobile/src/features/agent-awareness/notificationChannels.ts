import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const AGENT_NOTIFICATION_CHANNEL_IDS = {
  approval: "agent_approval",
  input: "agent_input",
  failed: "agent_failed",
  completed: "agent_completed",
  running: "agent_running",
} as const;

export type AgentNotificationChannelId =
  (typeof AGENT_NOTIFICATION_CHANNEL_IDS)[keyof typeof AGENT_NOTIFICATION_CHANNEL_IDS];

const CHANNEL_DEFINITIONS: ReadonlyArray<{
  readonly id: AgentNotificationChannelId;
  readonly name: string;
  readonly description: string;
  readonly importance: Notifications.AndroidImportance;
}> = [
  {
    id: AGENT_NOTIFICATION_CHANNEL_IDS.approval,
    name: "Agent approval",
    description: "Tool approvals waiting for your review.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: AGENT_NOTIFICATION_CHANNEL_IDS.input,
    name: "Agent input",
    description: "Agents waiting for your reply.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: AGENT_NOTIFICATION_CHANNEL_IDS.failed,
    name: "Agent failed",
    description: "Agent runs that failed and need attention.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    id: AGENT_NOTIFICATION_CHANNEL_IDS.completed,
    name: "Agent completed",
    description: "Completed agent runs.",
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  {
    id: AGENT_NOTIFICATION_CHANNEL_IDS.running,
    name: "Agent running",
    description: "Low-priority updates while agents are running.",
    importance: Notifications.AndroidImportance.LOW,
  },
];

let channelsEnsured = false;

export async function ensureAgentNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android" || channelsEnsured) {
    return;
  }

  await Promise.all(
    CHANNEL_DEFINITIONS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        // Omit `sound` for audible channels so Android uses the system default. Unlike iOS APNs,
        // the string "default" here refers to a bundled custom filename.
        ...(channel.importance === Notifications.AndroidImportance.LOW ? { sound: null } : {}),
        vibrationPattern:
          channel.importance === Notifications.AndroidImportance.HIGH
            ? [0, 250, 250, 250]
            : undefined,
      }),
    ),
  );
  channelsEnsured = true;
}

export function resetAgentNotificationChannelsForTests(): void {
  channelsEnsured = false;
}
