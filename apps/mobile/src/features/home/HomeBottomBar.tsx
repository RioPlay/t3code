import type { MenuAction } from "@react-native-menu/menu";
import type {
  EnvironmentId,
  SidebarProjectGroupingMode,
  SidebarThreadSortOrder,
} from "@t3tools/contracts";
import { useCallback, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol, type AppSymbolName } from "../../components/AppSymbol";
import { AppText as Text } from "../../components/AppText";
import { ControlPillMenu } from "../../components/ControlPill";
import { useThemeColor } from "../../lib/useThemeColor";
import { hasCustomHomeListOptions } from "./home-list-options";
import type { HomeListFilterMenuEnvironment } from "./home-list-filter-menu";
import { buildHomeListMenuActions, handleHomeListMenuAction } from "./homeListMenuActions";
import type { HomeProjectSortOrder } from "./homeThreadList";

export const HOME_BOTTOM_BAR_HEIGHT = 56;

function BottomBarItem(props: {
  readonly label: string;
  readonly icon: AppSymbolName;
  readonly testID: string;
  readonly active?: boolean;
  readonly onPress?: () => void;
}) {
  const primary = useThemeColor("--color-primary");
  const iconColor = useThemeColor("--color-icon");
  const tint = props.active ? String(primary) : String(iconColor);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      testID={props.testID}
      onPress={props.onPress}
      className="relative min-h-12 flex-1 items-center justify-center px-1"
      style={{ minHeight: 48, opacity: props.active ? 1 : 0.82 }}
    >
      {props.active ? (
        <View
          className="absolute inset-x-2 top-0 h-0.5 rounded-full"
          style={{ backgroundColor: tint }}
        />
      ) : null}
      <AppSymbol name={props.icon} size={24} tintColor={tint} type="monochrome" />
      <Text className="mt-0.5 font-t3 text-[11px]" style={{ color: tint }}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export function homeBottomBarInsetHeight(insetsBottom: number): number {
  return HOME_BOTTOM_BAR_HEIGHT + Math.max(insetsBottom, 8);
}

export function HomeBottomBar(props: {
  readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly projectSortOrder: HomeProjectSortOrder;
  readonly threadSortOrder: SidebarThreadSortOrder;
  readonly projectGroupingMode: SidebarProjectGroupingMode;
  readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
  readonly onProjectSortOrderChange: (sortOrder: HomeProjectSortOrder) => void;
  readonly onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
  readonly onProjectGroupingModeChange: (mode: SidebarProjectGroupingMode) => void;
  readonly onOpenSettings: () => void;
  readonly onManageEnvironments: () => void;
  readonly onAddEnvironment: () => void;
  readonly onStartNewTask: () => void;
  readonly onFocusSearch: () => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetColor = useThemeColor("--color-sheet");
  const borderColor = useThemeColor("--color-border");
  const hasCustomListOptions = hasCustomHomeListOptions(props);
  const filterIcon: AppSymbolName = hasCustomListOptions
    ? "line.3.horizontal.decrease.circle.fill"
    : "line.3.horizontal.decrease.circle";

  const menuActions = useMemo<MenuAction[]>(
    () =>
      buildHomeListMenuActions({
        environments: props.environments,
        selectedEnvironmentId: props.selectedEnvironmentId,
        projectSortOrder: props.projectSortOrder,
        threadSortOrder: props.threadSortOrder,
        projectGroupingMode: props.projectGroupingMode,
      }),
    [props],
  );

  const handleMenuAction = useCallback(
    ({ nativeEvent }: { readonly nativeEvent: { readonly event: string } }) => {
      handleHomeListMenuAction(nativeEvent.event, props);
    },
    [props],
  );

  return (
    <View
      className="border-t"
      style={{
        backgroundColor: String(sheetColor),
        borderColor: String(borderColor),
        paddingBottom: Math.max(insets.bottom, 8),
      }}
      testID="home-bottom-bar"
    >
      <View className="flex-row items-stretch" style={{ height: HOME_BOTTOM_BAR_HEIGHT }}>
        <BottomBarItem
          icon="gearshape"
          label="Settings"
          testID="home-bottom-settings"
          onPress={props.onOpenSettings}
        />
        <BottomBarItem
          icon="square.and.pencil"
          label="New"
          testID="home-bottom-new-task"
          onPress={props.onStartNewTask}
        />
        <ControlPillMenu actions={menuActions} onPressAction={handleMenuAction} style={{ flex: 1 }}>
          <BottomBarItem
            active={hasCustomListOptions}
            icon={filterIcon}
            label="Filter"
            testID="home-bottom-filter"
          />
        </ControlPillMenu>
        <BottomBarItem
          icon="magnifyingglass"
          label="Search"
          testID="home-bottom-search"
          onPress={props.onFocusSearch}
        />
      </View>
    </View>
  );
}
