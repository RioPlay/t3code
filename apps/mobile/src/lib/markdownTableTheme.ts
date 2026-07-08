export interface MarkdownTableColorInput {
  readonly body: string;
  readonly strong: string;
  readonly horizontalRule: string;
}

export interface MarkdownTableThemeColors {
  readonly surface: string;
  readonly tableBorder: string;
  readonly tableHeader: string;
  readonly tableHeaderText: string;
  readonly tableRowOdd: string;
  readonly tableRowEven: string;
}

export function resolveMarkdownTableThemeColors(
  scheme: "light" | "dark",
  input: MarkdownTableColorInput,
): MarkdownTableThemeColors {
  if (scheme === "dark") {
    return {
      surface: "#171717",
      tableBorder: "rgba(255, 255, 255, 0.12)",
      tableHeader: "#262626",
      tableHeaderText: input.strong,
      tableRowOdd: "#171717",
      tableRowEven: "#1f1f1f",
    };
  }

  return {
    surface: "#ffffff",
    tableBorder: input.horizontalRule,
    tableHeader: "rgba(0, 0, 0, 0.04)",
    tableHeaderText: input.strong,
    tableRowOdd: "transparent",
    tableRowEven: "rgba(0, 0, 0, 0.02)",
  };
}
