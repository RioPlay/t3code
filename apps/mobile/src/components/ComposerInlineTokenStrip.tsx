import { markdownFileIconSource } from "@t3tools/mobile-markdown-text/file-icons";
import { resolveMarkdownFileIcon } from "@t3tools/mobile-markdown-text/links";
import type { ComposerInlineToken } from "@t3tools/shared/composerInlineTokens";
import { SymbolView } from "expo-symbols";
import { Alert, Image, Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "./AppText";
import { truncateMiddle } from "../lib/truncateMiddle";
import { useThemeColor } from "../lib/useThemeColor";

const CHIP_HEIGHT = 48;
const CHIP_BORDER_RADIUS = 12;
const CHIP_LABEL_MAX_LENGTH = 28;
const REMOVE_BUTTON_SIZE = 24;

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
      style={{ flexGrow: 0, marginBottom: 8 }}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        {props.tokens.map((token) => {
          const isSkill = token.type === "skill";
          const label = tokenLabel(token, skillLabels);
          const displayLabel = truncateMiddle(label, CHIP_LABEL_MAX_LENGTH);
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
                onLongPress={() => {
                  Alert.alert("Remove attachment?", label, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => props.onRemove(token),
                    },
                  ]);
                }}
                onPress={props.onPressToken ? () => props.onPressToken!(token) : undefined}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: CHIP_HEIGHT,
                  paddingHorizontal: 12,
                  borderRadius: CHIP_BORDER_RADIUS,
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
                ) : isSkill ? (
                  <SymbolView
                    name="bolt.fill"
                    size={16}
                    tintColor={skillText}
                    type="monochrome"
                    weight="medium"
                  />
                ) : null}
                <Text
                  className="text-sm font-t3-medium"
                  ellipsizeMode="middle"
                  numberOfLines={1}
                  style={{ color: isSkill ? skillText : foreground, maxWidth: 180 }}
                >
                  {displayLabel}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${label}`}
                hitSlop={8}
                onPress={() => props.onRemove(token)}
                style={{
                  marginLeft: 6,
                  width: REMOVE_BUTTON_SIZE,
                  height: REMOVE_BUTTON_SIZE,
                  borderRadius: REMOVE_BUTTON_SIZE / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              >
                <SymbolView
                  name="xmark"
                  size={10}
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
