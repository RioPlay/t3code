import { EnvironmentHubLabels } from "@t3tools/client-runtime/environment";
import type {
  EnvironmentId,
  SidebarProjectGroupingMode,
  SidebarThreadSortOrder,
} from "@t3tools/contracts";
import { NativeHeaderToolbar, NativeStackScreenOptions } from "../../native/StackHeader";
import { useCallback, useRef, type RefObject } from "react";
import { Platform } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import { useThemeColor } from "../../lib/useThemeColor";
import { createAndroidStackedSearchBarOptions } from "../layout/androidMailSearchToolbar";
import {
  ANDROID_HEADER_TOOLBAR_GAP,
  resolveAndroidWorkspaceHeaderOptions,
} from "../layout/androidWorkspaceHeader";
import { useHardwareKeyboardCommand } from "../keyboard/hardwareKeyboardCommands";
import { withNativeGlassHeaderItem } from "../layout/native-glass-header-items";
import { createNativeMailSearchToolbarItem } from "../layout/native-mail-search-toolbar";
import type { HomeProjectSortOrder } from "./homeThreadList";
import {
  buildHomeListFilterMenu,
  type HomeListFilterMenuEnvironment,
} from "./home-list-filter-menu";
import {
  hasCustomHomeListOptions,
  PROJECT_GROUPING_OPTIONS,
  PROJECT_SORT_OPTIONS,
  THREAD_SORT_OPTIONS,
} from "./home-list-options";

export type HomeHeaderEnvironment = HomeListFilterMenuEnvironment;

export function HomeHeader(props: {
  readonly environments: ReadonlyArray<HomeHeaderEnvironment>;
  readonly searchBarRef?: RefObject<SearchBarCommands | null>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly projectSortOrder: HomeProjectSortOrder;
  readonly threadSortOrder: SidebarThreadSortOrder;
  readonly projectGroupingMode: SidebarProjectGroupingMode;
  readonly onSearchQueryChange: (query: string) => void;
  readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
  readonly onProjectSortOrderChange: (sortOrder: HomeProjectSortOrder) => void;
  readonly onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
  readonly onProjectGroupingModeChange: (mode: SidebarProjectGroupingMode) => void;
  readonly onOpenSettings: () => void;
  readonly onManageEnvironments: () => void;
  readonly onAddEnvironment: () => void;
  readonly onStartNewTask: () => void;
}) {
  const localSearchBarRef = useRef<SearchBarCommands>(null);
  const searchBarRef = props.searchBarRef ?? localSearchBarRef;
  const iconColor = useThemeColor("--color-icon");
  const sheetColor = String(useThemeColor("--color-sheet"));
  const hasCustomListOptions = hasCustomHomeListOptions(props);
  const focusSearch = useCallback(() => {
    searchBarRef.current?.focus();
    return searchBarRef.current !== null;
  }, []);
  useHardwareKeyboardCommand("focusSearch", focusSearch);
  const filterMenu = buildHomeListFilterMenu(props);

  return (
    <>
      <NativeStackScreenOptions
        options={{
          // Static header config (glass, title, fonts) lives in Stack.tsx
          // (WORKSPACE_HEADER_OPTIONS). Only dynamic values are set here.
          ...resolveAndroidWorkspaceHeaderOptions(sheetColor),
          headerTintColor: iconColor,
          unstable_headerRightItems:
            Platform.OS === "ios"
              ? () => [
                  withNativeGlassHeaderItem({
                    accessibilityLabel: "Open settings",
                    icon: { name: "ellipsis", type: "sfSymbol" } as const,
                    identifier: "home-settings",
                    label: "",
                    onPress: props.onOpenSettings,
                    type: "button",
                  }),
                ]
              : undefined,
          unstable_headerToolbarItems:
            Platform.OS === "ios"
              ? () => [
                  createNativeMailSearchToolbarItem({
                    composeButtonId: "home-new-task",
                    composeSystemImageName: "square.and.pencil",
                    filterMenu,
                    filterButtonId: "home-filter",
                    filterSystemImageName: hasCustomListOptions
                      ? "line.3.horizontal.decrease.circle.fill"
                      : "line.3.horizontal.decrease",
                    onComposePress: props.onStartNewTask,
                    onSearchTextChange: props.onSearchQueryChange,
                    placeholder: "Search",
                    searchTextChangeId: "home-search-text",
                  }),
                ]
              : undefined,
          headerSearchBarOptions:
            Platform.OS === "ios"
              ? undefined
              : createAndroidStackedSearchBarOptions({
                  ref: searchBarRef,
                  placeholder: "Search",
                  onChangeText: props.onSearchQueryChange,
                  onClear: () => {
                    props.onSearchQueryChange("");
                  },
                }),
        }}
      />

      {Platform.OS === "ios" ? null : (
        <NativeHeaderToolbar placement="right">
          <NativeHeaderToolbar.Button
            accessibilityLabel="Open settings"
            icon="gearshape"
            onPress={props.onOpenSettings}
            separateBackground
          />
        </NativeHeaderToolbar>
      )}

      {Platform.OS === "ios" ? null : (
        <NativeHeaderToolbar placement="bottom">
          <NativeHeaderToolbar.Menu
            accessibilityLabel="Filter and sort threads"
            icon={
              hasCustomListOptions
                ? "line.3.horizontal.decrease.circle.fill"
                : "line.3.horizontal.decrease.circle"
            }
            title="Thread list options"
            separateBackground
          >
            <NativeHeaderToolbar.MenuAction onPress={props.onOpenSettings}>
              <NativeHeaderToolbar.Label>Settings</NativeHeaderToolbar.Label>
            </NativeHeaderToolbar.MenuAction>

            <NativeHeaderToolbar.Menu title="Environment">
              <NativeHeaderToolbar.Label>Environment</NativeHeaderToolbar.Label>
              <NativeHeaderToolbar.MenuAction
                isOn={props.selectedEnvironmentId === null}
                onPress={() => props.onEnvironmentChange(null)}
                subtitle="Show threads from every environment"
              >
                <NativeHeaderToolbar.Label>All environments</NativeHeaderToolbar.Label>
              </NativeHeaderToolbar.MenuAction>
              {props.environments.map((environment) => (
                <NativeHeaderToolbar.MenuAction
                  key={environment.environmentId}
                  isOn={props.selectedEnvironmentId === environment.environmentId}
                  onPress={() => props.onEnvironmentChange(environment.environmentId)}
                >
                  <NativeHeaderToolbar.Label>{environment.label}</NativeHeaderToolbar.Label>
                </NativeHeaderToolbar.MenuAction>
              ))}
              <NativeHeaderToolbar.MenuAction onPress={props.onManageEnvironments}>
                <NativeHeaderToolbar.Label>
                  {EnvironmentHubLabels.manageEnvironments}
                </NativeHeaderToolbar.Label>
              </NativeHeaderToolbar.MenuAction>
              <NativeHeaderToolbar.MenuAction
                onPress={props.onAddEnvironment}
                subtitle={EnvironmentHubLabels.addEnvironmentSubtitle}
              >
                <NativeHeaderToolbar.Label>
                  {EnvironmentHubLabels.addEnvironment}
                </NativeHeaderToolbar.Label>
              </NativeHeaderToolbar.MenuAction>
            </NativeHeaderToolbar.Menu>

            <NativeHeaderToolbar.Menu title="Sort projects">
              <NativeHeaderToolbar.Label>Sort projects</NativeHeaderToolbar.Label>
              {PROJECT_SORT_OPTIONS.map((option) => (
                <NativeHeaderToolbar.MenuAction
                  key={option.value}
                  isOn={props.projectSortOrder === option.value}
                  onPress={() => props.onProjectSortOrderChange(option.value)}
                >
                  <NativeHeaderToolbar.Label>{option.label}</NativeHeaderToolbar.Label>
                </NativeHeaderToolbar.MenuAction>
              ))}
            </NativeHeaderToolbar.Menu>

            <NativeHeaderToolbar.Menu title="Sort threads">
              <NativeHeaderToolbar.Label>Sort threads</NativeHeaderToolbar.Label>
              {THREAD_SORT_OPTIONS.map((option) => (
                <NativeHeaderToolbar.MenuAction
                  key={option.value}
                  isOn={props.threadSortOrder === option.value}
                  onPress={() => props.onThreadSortOrderChange(option.value)}
                >
                  <NativeHeaderToolbar.Label>{option.label}</NativeHeaderToolbar.Label>
                </NativeHeaderToolbar.MenuAction>
              ))}
            </NativeHeaderToolbar.Menu>

            <NativeHeaderToolbar.Menu title="Group projects">
              <NativeHeaderToolbar.Label>Group projects</NativeHeaderToolbar.Label>
              {PROJECT_GROUPING_OPTIONS.map((option) => (
                <NativeHeaderToolbar.MenuAction
                  key={option.value}
                  isOn={props.projectGroupingMode === option.value}
                  onPress={() => props.onProjectGroupingModeChange(option.value)}
                  subtitle={option.subtitle}
                >
                  <NativeHeaderToolbar.Label>{option.label}</NativeHeaderToolbar.Label>
                </NativeHeaderToolbar.MenuAction>
              ))}
            </NativeHeaderToolbar.Menu>
          </NativeHeaderToolbar.Menu>
          <NativeHeaderToolbar.Spacer width={ANDROID_HEADER_TOOLBAR_GAP} sharesBackground={false} />
          <NativeHeaderToolbar.SearchBarSlot />
        </NativeHeaderToolbar>
      )}
    </>
  );
}
