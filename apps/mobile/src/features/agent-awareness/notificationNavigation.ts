import { useCallback, useEffect, useMemo, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useLinkTo } from "@react-navigation/native";

import {
  setPendingConnectionError,
  useSavedRemoteConnections,
} from "../../state/use-remote-environment-registry";
import { ensureAgentNotificationChannels } from "./notificationChannels";
import {
  isAgentNotificationEnvironmentLinked,
  routeAgentNotificationResponseOnce,
} from "./notificationPayload";
import { consumeLastAgentNotificationResponse } from "./notificationResponseConsumer";

export function useAgentNotificationNavigation(): void {
  const linkTo = useLinkTo();
  const handledResponseIds = useRef(new Set<string>());
  const pendingResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const { isLoadingSavedConnection, savedConnectionsById } = useSavedRemoteConnections();
  const linkedEnvironmentIds = useMemo(
    () => new Set(Object.keys(savedConnectionsById)),
    [savedConnectionsById],
  );

  const routeResponse = useCallback(
    (response: Notifications.NotificationResponse, allowQueue = true): void => {
      if (allowQueue && isLoadingSavedConnection) {
        pendingResponseRef.current = response;
        return;
      }

      routeAgentNotificationResponseOnce({
        handledResponseIds: handledResponseIds.current,
        response,
        isDeepLinkAuthorized: (deepLink) =>
          isAgentNotificationEnvironmentLinked(deepLink, linkedEnvironmentIds),
        onUnauthorizedDeepLink: () => {
          setPendingConnectionError(
            "This notification refers to an environment that is not linked on this device.",
          );
        },
        navigate: linkTo,
      });
    },
    [isLoadingSavedConnection, linkTo, linkedEnvironmentIds],
  );

  useEffect(() => {
    void ensureAgentNotificationChannels();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      routeResponse(response),
    );
    void consumeLastAgentNotificationResponse({
      getLastResponse: () => Notifications.getLastNotificationResponseAsync(),
      clearLastResponse: () => Notifications.clearLastNotificationResponseAsync(),
      handleResponse: (response) => routeResponse(response),
    });

    return () => {
      subscription.remove();
    };
  }, [routeResponse]);

  useEffect(() => {
    if (isLoadingSavedConnection || pendingResponseRef.current === null) {
      return;
    }

    const pending = pendingResponseRef.current;
    pendingResponseRef.current = null;
    routeResponse(pending, false);
  }, [isLoadingSavedConnection, routeResponse]);
}
