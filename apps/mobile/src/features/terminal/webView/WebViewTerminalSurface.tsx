import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, type ViewProps, useColorScheme } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { platformCapabilities } from "../../../platform/capabilities";
import { getPierreTerminalTheme, type TerminalTheme } from "../terminalTheme";
import { terminalDebugLog } from "../terminalDebugLog";
import { TERMINAL_WEBVIEW_SHELL_HTML } from "./terminalShellDocument";
import {
  buildTerminalShellClearScript,
  buildTerminalShellConfigureScript,
  buildTerminalShellFocusScript,
  buildTerminalShellWriteScript,
  parseTerminalShellOutboundMessage,
} from "./terminalShellBridge";
import {
  TERMINAL_WEBVIEW_ALLOWED_ORIGINS,
  terminalWebViewAllowsNavigation,
} from "./terminalWebViewSecurity";

interface WebViewTerminalSurfaceProps extends ViewProps {
  readonly terminalKey: string;
  readonly buffer: string;
  readonly fontSize?: number;
  readonly isRunning: boolean;
  readonly keyboardFocusRequest?: number;
  readonly theme?: TerminalTheme;
  readonly onInput: (data: string) => void;
  readonly onResize: (size: { readonly cols: number; readonly rows: number }) => void;
}

export const WebViewTerminalSurface = memo(function WebViewTerminalSurface(
  props: WebViewTerminalSurfaceProps,
) {
  const appearanceScheme = useColorScheme() === "light" ? "light" : "dark";
  const theme = props.theme ?? getPierreTerminalTheme(appearanceScheme);
  const webViewRef = useRef<WebView>(null);
  const [isShellReady, setIsShellReady] = useState(false);
  const lastBufferRef = useRef("");
  const lastConfigureKeyRef = useRef<string | null>(null);

  const configureScript = useMemo(
    () =>
      buildTerminalShellConfigureScript({
        fontSize: props.fontSize ?? 12,
        isRunning: props.isRunning,
        theme: {
          background: theme.background,
          foreground: theme.foreground,
          cursor: theme.cursorForeground,
          selectionBackground: theme.cursorForeground,
        },
      }),
    [props.fontSize, props.isRunning, theme],
  );

  const configureKey = useMemo(
    () =>
      JSON.stringify({
        fontSize: props.fontSize ?? 12,
        isRunning: props.isRunning,
        theme,
      }),
    [props.fontSize, props.isRunning, theme],
  );

  useEffect(() => {
    terminalDebugLog("webview:surface", {
      terminalKey: props.terminalKey,
      preferWebView: platformCapabilities.terminal.preferWebView,
      bufferLen: props.buffer.length,
      isRunning: props.isRunning,
    });
  }, [props.buffer.length, props.isRunning, props.terminalKey]);

  useEffect(() => {
    if (!isShellReady) {
      return;
    }
    if (configureKey === lastConfigureKeyRef.current) {
      return;
    }
    lastConfigureKeyRef.current = configureKey;
    webViewRef.current?.injectJavaScript(configureScript);
  }, [configureKey, configureScript, isShellReady]);

  useEffect(() => {
    if (!isShellReady) {
      return;
    }
    if (props.buffer === lastBufferRef.current) {
      return;
    }
    const previousBuffer = lastBufferRef.current;
    lastBufferRef.current = props.buffer;
    if (props.buffer.length === 0) {
      webViewRef.current?.injectJavaScript(buildTerminalShellClearScript());
      return;
    }
    if (props.buffer.startsWith(previousBuffer)) {
      const delta = props.buffer.slice(previousBuffer.length);
      if (delta.length > 0) {
        webViewRef.current?.injectJavaScript(buildTerminalShellWriteScript(delta));
      }
      return;
    }
    webViewRef.current?.injectJavaScript(buildTerminalShellClearScript());
    webViewRef.current?.injectJavaScript(buildTerminalShellWriteScript(props.buffer));
  }, [isShellReady, props.buffer]);

  useEffect(() => {
    if (!isShellReady || (props.keyboardFocusRequest ?? 0) <= 0) {
      return;
    }
    webViewRef.current?.injectJavaScript(buildTerminalShellFocusScript());
  }, [isShellReady, props.keyboardFocusRequest]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseTerminalShellOutboundMessage(event.nativeEvent.data);
      if (!message) {
        return;
      }
      if (message.type === "ready") {
        setIsShellReady(true);
        lastBufferRef.current = "";
        lastConfigureKeyRef.current = null;
        return;
      }
      if (message.type === "input") {
        if (!props.isRunning) {
          return;
        }
        props.onInput(message.data);
        return;
      }
      props.onResize({ cols: message.cols, rows: message.rows });
    },
    [props],
  );

  return (
    <View style={props.style}>
      <WebView
        ref={webViewRef}
        originWhitelist={[...TERMINAL_WEBVIEW_ALLOWED_ORIGINS]}
        source={{ html: TERMINAL_WEBVIEW_SHELL_HTML }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => terminalWebViewAllowsNavigation(request.url)}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        automaticallyAdjustContentInsets={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: theme.background }}
      />
    </View>
  );
});
