import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Alert, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "../../components/AppText";
import { useThemeColor } from "../../lib/useThemeColor";
import {
  THREAD_ACCESSORY_BAR_HEIGHT,
  THREAD_ACCESSORY_MIN_TOUCH_TARGET,
  threadAccessoryDisabledMessage,
  type ThreadAccessoryBadge,
  type ThreadAccessoryItemId,
} from "./threadAccessoryBarModel";

type AccessoryIcon = ComponentProps<typeof SymbolView>["name"];

const ACCESSORY_ITEMS: ReadonlyArray<{
  readonly id: ThreadAccessoryItemId;
  readonly label: string;
  readonly accessibilityLabel?: string;
  readonly icon: AccessoryIcon;
  readonly testID: string;
}> = [
  { id: "files", label: "Files", icon: "folder", testID: "thread-accessory-files" },
  {
    id: "terminal",
    label: "Term.",
    accessibilityLabel: "Terminal",
    icon: "terminal",
    testID: "thread-accessory-terminal",
  },
  { id: "review", label: "Review", icon: "text.bubble", testID: "thread-accessory-review" },
  {
    id: "git",
    label: "Git",
    icon: "point.topleft.down.curvedto.point.bottomright.up",
    testID: "thread-accessory-git",
  },
];

function AccessoryBadge(props: {
  readonly badge: ThreadAccessoryBadge;
  readonly accentColor: string;
}) {
  if (props.badge.kind === "count") {
    return (
      <View
        className="absolute -right-1 -top-1 min-h-[14px] min-w-[14px] items-center justify-center rounded-full px-1"
        style={{ backgroundColor: props.accentColor }}
      >
        <Text className="font-t3-bold text-[9px] text-primary-foreground">
          {props.badge.count > 9 ? "9+" : String(props.badge.count)}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: props.accentColor }}
    />
  );
}

function AccessoryBarItem(props: {
  readonly id: ThreadAccessoryItemId;
  readonly label: string;
  readonly accessibilityLabel?: string;
  readonly icon: AccessoryIcon;
  readonly testID: string;
  readonly active: boolean;
  readonly disabled: boolean;
  readonly badge?: ThreadAccessoryBadge;
  readonly layout: "phone" | "rail";
  readonly onPress: (item: ThreadAccessoryItemId) => void;
}) {
  const primary = useThemeColor("--color-primary");
  const iconColor = useThemeColor("--color-icon");
  const inactiveTint = String(iconColor);
  const activeTint = String(primary);
  const tint = props.active ? activeTint : inactiveTint;
  const opacity = props.disabled ? 0.38 : props.active ? 1 : 0.7;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      accessibilityHint={props.disabled ? threadAccessoryDisabledMessage(props.id) : undefined}
      accessibilityState={{ disabled: props.disabled, selected: props.active }}
      testID={props.testID}
      onPress={() => {
        if (props.disabled) {
          Alert.alert("Unavailable", threadAccessoryDisabledMessage(props.id));
          return;
        }
        props.onPress(props.id);
      }}
      className={
        props.layout === "rail"
          ? "relative min-h-12 min-w-12 items-center justify-center"
          : "relative min-h-12 flex-1 items-center justify-center px-1"
      }
      style={{ minHeight: THREAD_ACCESSORY_MIN_TOUCH_TARGET, opacity }}
    >
      {props.active && props.layout === "rail" ? (
        <View
          className="absolute h-10 w-10 rounded-full"
          style={{ backgroundColor: `${activeTint}22` }}
        />
      ) : null}
      {props.active && props.layout === "phone" ? (
        <View
          className="absolute inset-x-2 top-0 h-0.5 rounded-full"
          style={{ backgroundColor: activeTint }}
        />
      ) : null}
      <View className="relative items-center justify-center">
        <SymbolView name={props.icon} size={24} tintColor={tint} type="monochrome" />
        {props.badge ? <AccessoryBadge badge={props.badge} accentColor={activeTint} /> : null}
      </View>
      {props.layout === "phone" ? (
        <Text className="mt-0.5 font-t3 text-[11px]" style={{ color: tint }}>
          {props.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ThreadAccessoryBar(props: {
  readonly activeItem: ThreadAccessoryItemId | null;
  readonly badges: Readonly<Partial<Record<ThreadAccessoryItemId, ThreadAccessoryBadge>>>;
  readonly canOpenFiles: boolean;
  readonly canOpenTerminal: boolean;
  readonly canOpenReview: boolean;
  readonly canOpenGit: boolean;
  readonly layout: "phone" | "rail";
  readonly onPressItem: (item: ThreadAccessoryItemId) => void;
}) {
  const insets = useSafeAreaInsets();
  const sheetColor = useThemeColor("--color-sheet");
  const borderColor = useThemeColor("--color-border");

  const disabledByItem: Readonly<Record<ThreadAccessoryItemId, boolean>> = {
    files: !props.canOpenFiles,
    terminal: !props.canOpenTerminal,
    review: !props.canOpenReview,
    git: !props.canOpenGit,
  };

  if (props.layout === "rail") {
    return (
      <View
        className="border-r"
        style={{
          backgroundColor: String(sheetColor),
          borderColor: String(borderColor),
          width: THREAD_ACCESSORY_BAR_HEIGHT,
        }}
      >
        {ACCESSORY_ITEMS.map((item) => (
          <AccessoryBarItem
            key={item.id}
            {...item}
            active={props.activeItem === item.id}
            badge={props.badges[item.id]}
            disabled={disabledByItem[item.id]}
            layout="rail"
            onPress={props.onPressItem}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      className="border-t"
      style={{
        backgroundColor: String(sheetColor),
        borderColor: String(borderColor),
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      <View className="flex-row items-stretch" style={{ height: THREAD_ACCESSORY_BAR_HEIGHT }}>
        {ACCESSORY_ITEMS.map((item) => (
          <AccessoryBarItem
            key={item.id}
            {...item}
            active={props.activeItem === item.id}
            badge={props.badges[item.id]}
            disabled={disabledByItem[item.id]}
            layout="phone"
            onPress={props.onPressItem}
          />
        ))}
      </View>
    </View>
  );
}

export function threadAccessoryBarInsetHeight(insetsBottom: number): number {
  return THREAD_ACCESSORY_BAR_HEIGHT + Math.max(insetsBottom, 8);
}
