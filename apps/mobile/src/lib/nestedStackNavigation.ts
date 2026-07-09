/**
 * Navigate to a screen that lives on the *current* nested stack (SettingsSheet,
 * NewTaskSheet, …). Root `useNavigation()` is typed only for the root param
 * list, so sibling route names need a narrow cast. Prefer this over
 * `navigate("ParentSheet", { screen })` when already inside that parent —
 * re-targeting the parent can no-op on Android.
 */
export function navigateNestedScreen(
  navigation: { readonly navigate: (...args: never[]) => void },
  screen: string,
  params?: object,
): void {
  const navigate = navigation.navigate as (name: string, params?: object) => void;
  if (params === undefined) {
    navigate(screen);
    return;
  }
  navigate(screen, params);
}
