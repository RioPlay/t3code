import { shouldUseNativeComposerEditor } from "../platform/capabilities";
import { ComposerEditor as FallbackComposerEditor } from "./T3ComposerEditor";
import { NativeComposerEditor } from "./T3ComposerEditorNative";
import type { ComposerEditorProps } from "./T3ComposerEditor.types";

export function ComposerEditor(props: ComposerEditorProps) {
  if (shouldUseNativeComposerEditor()) {
    return <NativeComposerEditor {...props} />;
  }
  return <FallbackComposerEditor {...props} />;
}

export type {
  ComposerEditorHandle,
  ComposerEditorProps,
  ComposerEditorSelection,
} from "./T3ComposerEditor.types";
