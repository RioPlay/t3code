import type { AgentAwarenessState } from "@t3tools/shared/agentAwareness";
import { SymbolView } from "expo-symbols";
import { memo, useState } from "react";
import { Pressable, useColorScheme, View } from "react-native";

import { AppText as Text } from "../../components/AppText";
import { useThemeColor } from "../../lib/useThemeColor";
import {
  agentPhaseAccentColor,
  agentPhaseStatusLabel,
  shouldShowAgentPhaseDetail,
} from "./agentPhaseIndicatorModel";

export function AgentPhaseIndicator(props: {
  readonly awareness: AgentAwarenessState;
  readonly onPress: (awareness: AgentAwarenessState) => void;
}) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const accent = agentPhaseAccentColor(props.awareness.phase, colorScheme);
  const muted = useThemeColor("--color-foreground-muted");
  const [expanded, setExpanded] = useState(false);
  const showDetail = shouldShowAgentPhaseDetail(props.awareness, expanded);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.awareness.headline}. ${agentPhaseStatusLabel(props.awareness.phase)}`}
      testID="agent-phase-indicator"
      onPress={() => {
        if (props.awareness.phase === "running" || props.awareness.phase === "starting") {
          setExpanded((current) => !current);
          return;
        }
        props.onPress(props.awareness);
      }}
      className="min-h-12 flex-row items-center gap-2 border-b border-border/60 bg-screen px-4 py-2"
      style={{ minHeight: 48 }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <View className="min-w-0 flex-1">
        <Text className="font-t3-semibold text-[13px] text-foreground" numberOfLines={1}>
          {props.awareness.headline}
        </Text>
        {showDetail && props.awareness.detail ? (
          <Text className="font-t3 text-[11px] text-foreground-muted" numberOfLines={1}>
            {props.awareness.detail}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="font-t3-semibold text-[11px]" style={{ color: accent }}>
          {agentPhaseStatusLabel(props.awareness.phase)}
        </Text>
        <SymbolView
          name="chevron.right"
          size={10}
          tintColor={muted}
          type="monochrome"
          weight="semibold"
        />
      </View>
    </Pressable>
  );
}

export const MemoAgentPhaseIndicator = memo(AgentPhaseIndicator);
