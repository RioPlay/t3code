import { SymbolView, type SFSymbol, type SymbolViewProps } from "expo-symbols";

import { resolvePlatformSymbol } from "../lib/platformSymbol";

export type AppSymbolName = SFSymbol;

export function AppSymbol(
  props: Omit<SymbolViewProps, "name"> & {
    readonly name: AppSymbolName;
  },
) {
  return <SymbolView {...props} name={resolvePlatformSymbol(props.name)} />;
}
