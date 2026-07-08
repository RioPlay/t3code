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
  const primary = useThemeColor("--color-primary");
  const primaryFg = useThemeColor("--color-primary-foreground");

  return (
    <View
      accessibilityRole="text"
      testID="composer-strip-coach-mark"
      style={{
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: card,
      }}
    >
      <Text className="text-sm font-t3-bold leading-snug text-foreground">
        Attachments appear below your message
      </Text>
      <Text className="text-xs leading-normal" style={{ color: muted }}>
        Files and skills you add show as chips under the text field until mirror editing ships.
      </Text>
      {props.onDismiss ? (
        <Pressable
          accessibilityLabel="Got it"
          accessibilityRole="button"
          hitSlop={8}
          onPress={props.onDismiss}
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: primary,
          }}
        >
          <Text className="text-xs font-t3-bold" style={{ color: primaryFg }}>
            Got it
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
