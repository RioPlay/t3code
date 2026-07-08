/**
 * Shared copy and menu identifiers for environment configuration surfaces.
 * Keeps web and mobile labels, search terms, and filter-menu events aligned.
 */
export const EnvironmentHubLabels = {
  sectionTitle: "Environments",
  manageEnvironments: "Manage environments",
  addEnvironment: "Add environment",
  addEnvironmentSubtitle: "Pair another backend",
  filterAllEnvironments: "All environments",
  filterAllEnvironmentsSubtitle: "Show threads from every environment",
  webSettingsPath: "/settings/connections",
} as const;

export const EnvironmentHubSearchTerms = [
  "environments",
  "environment",
  "connections",
  "connection",
  "backend",
  "remote",
  "pair",
  "pairing",
  "ssh",
  "manage environments",
  "add environment",
] as const;

export const EnvironmentHubMenuEvent = {
  manage: "environment-hub:manage",
  add: "environment-hub:add",
} as const;

export type EnvironmentHubMenuEvent =
  (typeof EnvironmentHubMenuEvent)[keyof typeof EnvironmentHubMenuEvent];

export function isEnvironmentHubMenuEvent(event: string): event is EnvironmentHubMenuEvent {
  return event === EnvironmentHubMenuEvent.manage || event === EnvironmentHubMenuEvent.add;
}
