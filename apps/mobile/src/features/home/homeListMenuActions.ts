import {
  EnvironmentHubLabels,
  EnvironmentHubMenuEvent,
  isEnvironmentHubMenuEvent,
} from "@t3tools/client-runtime/environment";
import type { MenuAction } from "@react-native-menu/menu";
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
import type { HomeListFilterMenuEnvironment } from "./home-list-filter-menu";

export function buildHomeListMenuActions(input: {
  readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly projectSortOrder: HomeProjectSortOrder;
  readonly threadSortOrder: SidebarThreadSortOrder;
  readonly projectGroupingMode: SidebarProjectGroupingMode;
}): MenuAction[] {
  return [
    {
      id: "environment",
      title: "Environment",
      subactions: [
        {
          id: "environment:all",
          title: "All environments",
          subtitle: "Show threads from every environment",
          state: input.selectedEnvironmentId === null ? "on" : "off",
        },
        ...input.environments.map((environment) => ({
          id: `environment:${environment.environmentId}`,
          title: environment.label,
          state:
            input.selectedEnvironmentId === environment.environmentId
              ? ("on" as const)
              : ("off" as const),
        })),
        {
          id: EnvironmentHubMenuEvent.manage,
          title: EnvironmentHubLabels.manageEnvironments,
        },
        {
          id: EnvironmentHubMenuEvent.add,
          title: EnvironmentHubLabels.addEnvironment,
          subtitle: EnvironmentHubLabels.addEnvironmentSubtitle,
        },
      ],
    },
    {
      id: "project-sort",
      title: "Sort projects",
      subactions: PROJECT_SORT_OPTIONS.map((option) => ({
        id: `project-sort:${option.value}`,
        title: option.label,
        state: input.projectSortOrder === option.value ? "on" : "off",
      })),
    },
    {
      id: "thread-sort",
      title: "Sort threads",
      subactions: THREAD_SORT_OPTIONS.map((option) => ({
        id: `thread-sort:${option.value}`,
        title: option.label,
        state: input.threadSortOrder === option.value ? "on" : "off",
      })),
    },
    {
      id: "project-grouping",
      title: "Group projects",
      subactions: PROJECT_GROUPING_OPTIONS.map((option) => ({
        id: `project-grouping:${option.value}`,
        title: option.label,
        subtitle: option.subtitle,
        state: input.projectGroupingMode === option.value ? "on" : "off",
      })),
    },
  ];
}

export function handleHomeListMenuAction(
  event: string,
  input: {
    readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
    readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
    readonly onProjectSortOrderChange: (sortOrder: HomeProjectSortOrder) => void;
    readonly onThreadSortOrderChange: (sortOrder: SidebarThreadSortOrder) => void;
    readonly onProjectGroupingModeChange: (mode: SidebarProjectGroupingMode) => void;
    readonly onManageEnvironments?: () => void;
    readonly onAddEnvironment?: () => void;
  },
): void {
  if (isEnvironmentHubMenuEvent(event)) {
    if (event === EnvironmentHubMenuEvent.manage) {
      input.onManageEnvironments?.();
      return;
    }
    input.onAddEnvironment?.();
    return;
  }
  if (event === "environment:all") {
    input.onEnvironmentChange(null);
    return;
  }
  if (event.startsWith("environment:")) {
    const environment = input.environments.find(
      (candidate) => String(candidate.environmentId) === event.slice("environment:".length),
    );
    if (environment) {
      input.onEnvironmentChange(environment.environmentId);
    }
    return;
  }
  const projectSort = PROJECT_SORT_OPTIONS.find(
    (option) => `project-sort:${option.value}` === event,
  );
  if (projectSort) {
    input.onProjectSortOrderChange(projectSort.value);
    return;
  }
  const threadSort = THREAD_SORT_OPTIONS.find((option) => `thread-sort:${option.value}` === event);
  if (threadSort) {
    input.onThreadSortOrderChange(threadSort.value);
    return;
  }
  const projectGrouping = PROJECT_GROUPING_OPTIONS.find(
    (option) => `project-grouping:${option.value}` === event,
  );
  if (projectGrouping) {
    input.onProjectGroupingModeChange(projectGrouping.value);
  }
}
