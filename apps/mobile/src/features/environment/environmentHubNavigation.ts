interface EnvironmentHubNavigator {
  readonly navigate: (
    route: "SettingsSheet",
    params: {
      readonly screen: "SettingsEnvironments" | "SettingsEnvironmentNew";
    },
  ) => void;
}

/** Canonical in-app path to the environments list (settings sheet). */
export function navigateToEnvironmentHub(navigation: EnvironmentHubNavigator): void {
  navigation.navigate("SettingsSheet", { screen: "SettingsEnvironments" });
}

/** Canonical in-app path to pair a new environment (settings sheet). */
export function navigateToAddEnvironment(navigation: EnvironmentHubNavigator): void {
  navigation.navigate("SettingsSheet", { screen: "SettingsEnvironmentNew" });
}
