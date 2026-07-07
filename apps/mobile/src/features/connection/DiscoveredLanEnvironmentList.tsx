import { ActivityIndicator, Pressable, View } from "react-native";

import { AppText as Text } from "../../components/AppText";
import { useThemeColor } from "../../lib/useThemeColor";
import type { DiscoveredLanEnvironmentView } from "./useLanDiscoveryController";

export function DiscoveredLanEnvironmentList(props: {
  readonly environments: ReadonlyArray<DiscoveredLanEnvironmentView>;
  readonly isScanning: boolean;
  readonly isOffline: boolean;
  readonly onSelect: (environment: DiscoveredLanEnvironmentView) => void;
  readonly onRefresh: () => void;
}) {
  const accentColor = useThemeColor("--color-icon-muted");

  if (props.isOffline) {
    return (
      <View collapsable={false} className="gap-2 rounded-[24px] bg-card px-4 py-4">
        <Text className="text-sm font-t3-bold text-foreground">Nearby environments</Text>
        <Text className="text-sm leading-normal text-foreground-muted">
          Connect to Wi‑Fi to search for desktops on your local network.
        </Text>
      </View>
    );
  }

  return (
    <View collapsable={false} className="gap-3 rounded-[24px] bg-card p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-t3-bold text-foreground">Nearby environments</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh nearby environment search"
          className="h-8 w-8 items-center justify-center rounded-full bg-subtle active:opacity-70"
          disabled={props.isScanning}
          onPress={props.onRefresh}
        >
          {props.isScanning ? (
            <ActivityIndicator color={accentColor} size="small" />
          ) : (
            <Text className="text-xs font-t3-bold text-foreground-muted">↻</Text>
          )}
        </Pressable>
      </View>

      {props.environments.length === 0 ? (
        <Text className="text-sm leading-normal text-foreground-muted">
          {props.isScanning
            ? "Searching the local network for T3 Code desktops..."
            : "No nearby desktops found. Enable network access on the desktop app, then try again."}
        </Text>
      ) : (
        <View collapsable={false} className="overflow-hidden rounded-[18px] border border-border">
          {props.environments.map((environment, index) => {
            const selectable = environment.status === "available";
            return (
              <Pressable
                key={environment.key}
                accessibilityRole="button"
                accessibilityLabel={`${environment.label}, ${environment.hostInput}`}
                accessibilityState={{ disabled: !selectable }}
                className="px-4 py-3.5 active:opacity-70"
                disabled={!selectable}
                style={{ borderTopWidth: index === 0 ? 0 : 1, opacity: selectable ? 1 : 0.55 }}
                onPress={() => props.onSelect(environment)}
              >
                <Text className="text-base font-t3-bold text-foreground" numberOfLines={1}>
                  {environment.label}
                </Text>
                <Text className="mt-0.5 text-xs text-foreground-muted" numberOfLines={1}>
                  {environment.hostInput}
                </Text>
                {environment.detailLine ? (
                  <Text
                    className={
                      environment.status === "unavailable"
                        ? "mt-1 text-xs text-destructive"
                        : "mt-1 text-xs text-foreground-tertiary"
                    }
                    numberOfLines={2}
                  >
                    {environment.detailLine}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
