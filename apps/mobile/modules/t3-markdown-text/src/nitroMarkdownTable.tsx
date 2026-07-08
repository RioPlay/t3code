import { type ComponentType, type ReactNode } from "react";
import { ScrollView, Text as NativeText, View, type ColorValue } from "react-native";
import type { MarkdownNode, NodeRendererProps } from "react-native-nitro-markdown";

import type { MarkdownTableThemeColors } from "./markdownTableTheme";
import { nitroSelectableTextStyle } from "./nitroMarkdownSelection";

const COLUMN_WIDTH = 160;

function collectTableRows(node: MarkdownNode): MarkdownNode[] {
  const rows: MarkdownNode[] = [];
  const visit = (child: MarkdownNode) => {
    if (child.type === "table_row") {
      rows.push(child);
      return;
    }
    for (const nested of child.children ?? []) {
      visit(nested);
    }
  };
  visit(node);
  return rows;
}

function cellKey(cell: MarkdownNode, index: number): string {
  return `${cell.type}:${cell.beg ?? "unknown"}:${cell.end ?? "unknown"}:${index}`;
}

function NitroMarkdownTableCell(props: {
  readonly cell: MarkdownNode;
  readonly isHeader: boolean;
  readonly Renderer: ComponentType<NodeRendererProps>;
  readonly bodyColor: ColorValue;
  readonly headerColor: ColorValue;
  readonly fontSize: number;
  readonly lineHeight: number;
}) {
  const textColor = props.isHeader ? props.headerColor : props.bodyColor;
  const children = props.cell.children ?? [];
  const content: ReactNode =
    children.length === 0
      ? (props.cell.content ?? "")
      : children.map((child, index) => (
          <props.Renderer
            key={cellKey(child, index)}
            node={child}
            depth={0}
            inListItem={false}
            parentIsText
          />
        ));

  return (
    <NativeText
      selectable
      style={nitroSelectableTextStyle({
        color: textColor,
        fontFamily: props.isHeader ? "DMSans_700Bold" : "DMSans_400Regular",
        fontSize: props.fontSize,
        lineHeight: props.lineHeight,
        fontWeight: props.isHeader ? "700" : "400",
      })}
    >
      {content}
    </NativeText>
  );
}

export function NitroMarkdownTable(props: {
  readonly node: MarkdownNode;
  readonly Renderer: ComponentType<NodeRendererProps>;
  readonly tableTheme: MarkdownTableThemeColors;
  readonly bodyColor: ColorValue;
  readonly fontSize: number;
  readonly lineHeight: number;
}) {
  const rows = collectTableRows(props.node);
  if (rows.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      bounces={false}
      nestedScrollEnabled
      showsHorizontalScrollIndicator
      style={{ marginVertical: 8, flexGrow: 0 }}
    >
      <View
        style={{
          backgroundColor: props.tableTheme.surface,
          borderColor: props.tableTheme.tableBorder,
          borderRadius: 8,
          borderWidth: 1,
          overflow: "hidden",
        }}
      >
        {rows.map((row, rowIndex) => (
          <View
            key={cellKey(row, rowIndex)}
            style={{
              flexDirection: "row",
              backgroundColor:
                rowIndex === 0
                  ? props.tableTheme.tableHeader
                  : rowIndex % 2 === 0
                    ? props.tableTheme.tableRowEven
                    : props.tableTheme.tableRowOdd,
              borderTopColor: props.tableTheme.tableBorder,
              borderTopWidth: rowIndex === 0 ? 0 : 1,
            }}
          >
            {(row.children ?? []).map((cell, cellIndex) => (
              <View
                key={cellKey(cell, cellIndex)}
                style={{
                  width: COLUMN_WIDTH,
                  borderLeftColor: props.tableTheme.tableBorder,
                  borderLeftWidth: cellIndex === 0 ? 0 : 1,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                <NitroMarkdownTableCell
                  cell={cell}
                  isHeader={rowIndex === 0 || cell.isHeader === true}
                  Renderer={props.Renderer}
                  bodyColor={props.bodyColor}
                  headerColor={props.tableTheme.tableHeaderText}
                  fontSize={props.fontSize}
                  lineHeight={props.lineHeight}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
