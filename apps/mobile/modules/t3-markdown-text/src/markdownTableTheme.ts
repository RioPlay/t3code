export interface MarkdownTableThemeColors {
  readonly surface: string;
  readonly surfaceLight: string;
  readonly tableBorder: string;
  readonly tableHeader: string;
  readonly tableHeaderText: string;
  readonly tableRowOdd: string;
  readonly tableRowEven: string;
  readonly textMuted: string;
}

export function resolveMarkdownTableThemeColors(input: {
  readonly isDark: boolean;
  readonly strong: string;
  readonly blockquoteBackground: string;
  readonly horizontalRule: string;
}): MarkdownTableThemeColors {
  if (input.isDark) {
    return {
      surface: "#1a1a1a",
      surfaceLight: input.blockquoteBackground,
      tableBorder: input.horizontalRule,
      tableHeader: "rgba(255, 255, 255, 0.06)",
      tableHeaderText: input.strong,
      tableRowOdd: "transparent",
      tableRowEven: "rgba(255, 255, 255, 0.02)",
      textMuted: "#a3a3a3",
    };
  }

  return {
    surface: "#ffffff",
    surfaceLight: input.blockquoteBackground,
    tableBorder: input.horizontalRule,
    tableHeader: input.blockquoteBackground,
    tableHeaderText: input.strong,
    tableRowOdd: "transparent",
    tableRowEven: "#f8fafc",
    textMuted: "#64748b",
  };
}
