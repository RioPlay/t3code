import * as Notifications from "expo-notifications";
import { AppState, Platform, useColorScheme, type AppStateStatus } from "react-native";
import { useEffect, useMemo, useState } from "react";

import { useProjects, useThreadShells } from "../../state/entities";
import { buildLocalAgentActivityAggregate } from "./localAgentActivityAggregate";
import { syncOngoingAgentNotification } from "./ongoingNotificationSync";

async function readAndroidNotificationsEnabled(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status === "granted";
}

export function useOngoingAgentNotification(): void {
  const projects = useProjects();
  const threads = useThreadShells();
  const colorScheme = useColorScheme() === "light" ? "light" : "dark";
  // Bump when returning to foreground so permission toggles are re-read.
  const [appActiveEpoch, setAppActiveEpoch] = useState(0);

  const aggregate = useMemo(
    () => buildLocalAgentActivityAggregate({ projects, threads }),
    [projects, threads],
  );

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const onChange = (next: AppStateStatus) => {
      if (next === "active") {
        setAppActiveEpoch((value) => value + 1);
      }
    };
    const subscription = AppState.addEventListener("change", onChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    let cancelled = false;
    void (async () => {
      const notificationsEnabled = await readAndroidNotificationsEnabled();
      if (cancelled) {
        return;
      }
      await syncOngoingAgentNotification({
        aggregate,
        notificationsEnabled,
        colorScheme,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [aggregate, colorScheme, appActiveEpoch]);
}
