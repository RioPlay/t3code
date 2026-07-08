import { EnvironmentHubLabels } from "@t3tools/client-runtime/environment";
import type {
  EnvironmentId,
  SidebarProjectGroupingMode,
  SidebarThreadSortOrder,
} from "@t3tools/contracts";

import type { HomeProjectSortOrder } from "./homeThreadList";
import {
  PROJECT_GROUPING_OPTIONS,
  PROJECT_SORT_OPTIONS,
  THREAD_SORT_OPTIONS,
} from "./home-list-options";

export interface HomeListFilterMenuEnvironment {
  readonly environmentId: EnvironmentId;
  readonly label: string;
}

type HomeListFilterMenuAction = {
  readonly type: "action";
  readonly title: string;
  readonly subtitle?: string;
  readonly state?: "on" | "off";
  readonly onPress: () => void;
};

type HomeListFilterMenuSubmenu = {
  readonly type: "submenu";
  readonly title: string;
  readonly items: HomeListFilterMenuAction[];
};

export interface HomeListFilterMenu {
  readonly title: string;
  readonly items: Array<HomeListFilterMenuAction | HomeListFilterMenuSubmenu>;
}

export function buildHomeListFilterMenu(props: {
  readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly projectSortOrder: HomeProjectSortOrder;
  readonly threadSortOrder: SidebarThreadSortOrder;
  readonly projectGroupingMode: SidebarProjectGroupingMode;
  readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
  readonly onProjectSortOrderChange: (sortOrder: HomeProjectSortOrder) => void;
  readonly onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
  readonly onProjectGroupingModeChange: (mode: SidebarProjectGroupingMode) => void;
  readonly onOpenSettings?: () => void;
  readonly onManageEnvironments?: () => void;
  readonly onAddEnvironment?: () => void;
}): HomeListFilterMenu {
  const items: Array<HomeListFilterMenuAction | HomeListFilterMenuSubmenu> = [];

  if (props.onOpenSettings) {
    items.push({
      type: "action",
      title: "Settings",
      onPress: props.onOpenSettings,
    });
  }

  const environmentHubItems: HomeListFilterMenuAction[] = [];
  if (props.onManageEnvironments) {
    environmentHubItems.push({
      type: "action",
      title: EnvironmentHubLabels.manageEnvironments,
      onPress: props.onManageEnvironments,
    });
  }
  if (props.onAddEnvironment) {
    environmentHubItems.push({
      type: "action",
      title: EnvironmentHubLabels.addEnvironment,
      subtitle: EnvironmentHubLabels.addEnvironmentSubtitle,
      onPress: props.onAddEnvironment,
    });
  }

  items.push(
    {
      type: "submenu",
      title: "Environment",
      items: [
        {
          type: "action",
          title: EnvironmentHubLabels.filterAllEnvironments,
          subtitle: EnvironmentHubLabels.filterAllEnvironmentsSubtitle,
          state: props.selectedEnvironmentId === null ? "on" : "off",
          onPress: () => props.onEnvironmentChange(null),
        },
        ...props.environments.map((environment) => ({
          type: "action" as const,
          title: environment.label,
          state:
            props.selectedEnvironmentId === environment.environmentId
              ? ("on" as const)
              : ("off" as const),
          onPress: () => props.onEnvironmentChange(environment.environmentId),
        })),
        ...environmentHubItems,
      ],
    },
    {
      type: "submenu",
      title: "Sort projects",
      items: PROJECT_SORT_OPTIONS.map((option) => ({
        type: "action",
        title: option.label,
        state: props.projectSortOrder === option.value ? "on" : "off",
        onPress: () => props.onProjectSortOrderChange(option.value),
      })),
    },
    {
      type: "submenu",
      title: "Sort threads",
      items: THREAD_SORT_OPTIONS.map((option) => ({
        type: "action",
        title: option.label,
        state: props.threadSortOrder === option.value ? "on" : "off",
        onPress: () => props.onThreadSortOrderChange(option.value),
      })),
    },
    {
      type: "submenu",
      title: "Group projects",
      items: PROJECT_GROUPING_OPTIONS.map((option) => ({
        type: "action",
        title: option.label,
        subtitle: option.subtitle,
        state: props.projectGroupingMode === option.value ? "on" : "off",
        onPress: () => props.onProjectGroupingModeChange(option.value),
      })),
    },
  );

  return {
    title: "Thread list options",
    items,
  };
}
