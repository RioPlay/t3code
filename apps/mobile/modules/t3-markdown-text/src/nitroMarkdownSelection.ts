import { Platform, type TextStyle } from "react-native";

export function shouldEnhanceNitroMarkdownSelection(): boolean {
  return Platform.OS === "android";
}

export function nitroSelectableTextStyle(style: TextStyle): TextStyle {
  if (!shouldEnhanceNitroMarkdownSelection()) {
    return style;
  }
  return {
    ...style,
    includeFontPadding: false,
  };
}
