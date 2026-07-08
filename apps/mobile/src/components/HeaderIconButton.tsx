import { Pressable } from "react-native";

import { AppSymbol, type AppSymbolName } from "./AppSymbol";
import { useThemeColor } from "../lib/useThemeColor";

export function HeaderIconButton(props: {
  readonly accessibilityLabel: string;
  readonly icon: AppSymbolName;
  readonly onPress: () => void;
  readonly testID?: string;
}) {
  const iconColor = useThemeColor("--color-icon");

  return (
    <Pressable
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={props.onPress}
      testID={props.testID}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        marginRight: 4,
        minHeight: 44,
        minWidth: 44,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <AppSymbol name={props.icon} size={22} tintColor={iconColor} type="monochrome" />
    </Pressable>
  );
}
