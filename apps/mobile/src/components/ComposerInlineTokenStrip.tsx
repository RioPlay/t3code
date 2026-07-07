import { markdownFileIconSource } from "@t3tools/mobile-markdown-text/file-icons";
import { resolveMarkdownFileIcon } from "@t3tools/mobile-markdown-text/links";
import type { ComposerInlineToken } from "@t3tools/shared/composerInlineTokens";
import { SymbolView } from "expo-symbols";
import { Image, Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "./AppText";
import { useThemeColor } from "../lib/useThemeColor";

const CHIP_HEIGHT = 48;

export interface ComposerInlineTokenStripProps {
  readonly tokens: ReadonlyArray<ComposerInlineToken>;
  readonly skillLabels?: ReadonlyMap<string, string>;
  readonly onRemove: (token: ComposerInlineToken) => void;
  readonly onPressToken?: (token: ComposerInlineToken) => void;
}

function basename(path: string): string {
  const separator = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return separator >= 0 ? path.slice(separator + 1) : path;
}

function tokenLabel(token: ComposerInlineToken, skillLabels: ReadonlyMap<string, string>): string {
  if (token.type === "skill") {
    return skillLabels.get(token.value) ?? token.value;
  }
  return basename(token.value);
}

export function ComposerInlineTokenStrip(props: ComposerInlineTokenStripProps) {
  const subtleBg = useThemeColor("--color-subtle");
  const borderColor = useThemeColor("--color-border");
  const foreground = useThemeColor("--color-foreground");
  const skillBackground = useThemeColor("--color-inline-skill-background");
  const skillBorder = useThemeColor("--color-inline-skill-border");
  const skillText = useThemeColor("--color-inline-skill-foreground");
  const skillLabels = props.skillLabels ?? new Map<string, string>();

  if (props.tokens.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        {props.tokens.map((token) => {
          const isSkill = token.type === "skill";
          const label = tokenLabel(token, skillLabels);
          const iconSource =
            token.type === "mention"
              ? markdownFileIconSource(resolveMarkdownFileIcon(token.value))
              : null;

          return (
            <View
              key={`${token.type}:${token.start}:${token.end}:${token.value}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingRight: 10,
              }}
            >
              <Pressable
                accessibilityLabel={`${isSkill ? "Skill" : "File"} ${label}`}
                onPress={props.onPressToken ? () => props.onPressToken!(token) : undefined}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: CHIP_HEIGHT,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isSkill ? skillBorder : borderColor,
                  backgroundColor: isSkill ? skillBackground : subtleBg,
                }}
              >
                {iconSource ? (
                  <Image
                    source={iconSource}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                  />
                ) : (
                  <SymbolView
                    name="sparkles"
                    size={16}
                    tintColor={skillText}
                    type="monochrome"
                    weight="medium"
                  />
                )}
                <Text
                  className="text-sm font-t3-medium"
                  style={{ color: isSkill ? skillText : foreground }}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${label}`}
                hitSlop={8}
                onPress={() => props.onRemove(token)}
                style={{
                  marginLeft: 6,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              >
                <SymbolView
                  name="xmark"
                  size={9}
                  tintColor="#ffffff"
                  type="monochrome"
                  weight="bold"
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
