import type { AndroidSymbol, SFSymbol, SymbolViewProps } from "expo-symbols";

const SF_TO_ANDROID: Record<string, AndroidSymbol> = {
  archivebox: "archive",
  "archivebox.fill": "archive",
  "arrow.clockwise": "refresh",
  "arrow.triangle.branch": "merge",
  "arrow.turn.left.up": "undo",
  "arrow.up.right": "open_in_new",
  "arrow.uturn.backward": "undo",
  checkmark: "check",
  "chevron.down": "expand_more",
  "chevron.right": "chevron_right",
  "chevron.up": "expand_less",
  "doc.on.doc": "content_copy",
  "doc.text": "description",
  "doc.text.fill": "description",
  ellipsis: "more_vert",
  "exclamationmark.triangle": "warning",
  folder: "folder",
  "folder.badge.plus": "create_new_folder",
  "folder.fill": "folder",
  gearshape: "settings",
  "info.circle": "info",
  link: "link",
  "list.bullet": "list",
  magnifyingglass: "search",
  plus: "add",
  "point.3.connected.trianglepath.dotted": "hub",
  "point.topleft.down.curvedto.point.bottomright.up": "source",
  "server.rack": "dns",
  "sidebar.left": "menu",
  sparkles: "auto_awesome",
  "square.and.pencil": "edit_note",
  terminal: "terminal",
  "text.bubble": "rate_review",
  "textformat.size.larger": "text_increase",
  "textformat.size.smaller": "text_decrease",
  trash: "delete",
  "tray.and.arrow.up": "outbox",
  "wifi.slash": "wifi_off",
  xmark: "close",
  "line.3.horizontal.decrease": "filter_list",
  "line.3.horizontal.decrease.circle": "filter_list",
  "line.3.horizontal.decrease.circle.fill": "filter_list",
};

export function resolvePlatformSymbol(name: SFSymbol): SymbolViewProps["name"] {
  const android = SF_TO_ANDROID[name];
  if (android) {
    return { ios: name, android };
  }
  return { ios: name, android: name as AndroidSymbol };
}
