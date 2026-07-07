import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { AppText as Text } from "./AppText";
import { useThemeColor } from "../lib/useThemeColor";

export interface ComposerStripModeNoticeProps {
  readonly onDismiss?: () => void;
}

export function ComposerStripModeNotice(props: ComposerStripModeNoticeProps) {
  const muted = useThemeColor("--color-foreground-muted");
  const border = useThemeColor("--color-border");
  const card = useThemeColor("--color-card");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: card,
      }}
    >
      <Text className="flex-1 text-xs leading-normal" style={{ color: muted }}>
        Strip mode — chips below text
      </Text>
      {props.onDismiss ? (
        <Pressable
          accessibilityLabel="Dismiss strip mode notice"
          hitSlop={8}
          onPress={props.onDismiss}
        >
          <SymbolView name="xmark" size={10} tintColor={muted} type="monochrome" weight="bold" />
        </Pressable>
      ) : null}
    </View>
  );
}
