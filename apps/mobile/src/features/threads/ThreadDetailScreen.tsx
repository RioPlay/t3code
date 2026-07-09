import { type EnvironmentConnectionPhase } from "@t3tools/client-runtime/connection";
import type { EnvironmentThreadStatus } from "@t3tools/client-runtime/state/threads";
import { useKeyboardChatComposerInset, useKeyboardScrollToEnd } from "@legendapp/list/keyboard";
import type { LegendListRef } from "@legendapp/list/react-native";
import type {
  ApprovalRequestId,
  EnvironmentId,
  MessageId,
  ModelSelection,
  OrchestrationThreadShell,
  ProviderApprovalDecision,
  ProviderInteractionMode,
  RuntimeMode,
  ServerConfig as T3ServerConfig,
  ThreadId,
} from "@t3tools/contracts";
import type { AgentAwarenessState } from "@t3tools/shared/agentAwareness";
import { collectComposerInlineTokens } from "@t3tools/shared/composerInlineTokens";
import { formatElapsed } from "@t3tools/shared/orchestrationTiming";
import * as Haptics from "expo-haptics";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Platform,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import {
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "../../components/AppText";
import type { ComposerEditorHandle } from "../../components/ComposerEditor";
import type { StatusTone } from "../../components/StatusPill";
import type { DraftComposerImageAttachment } from "../../lib/composerImages";
import { CHAT_CONTENT_MAX_WIDTH, type LayoutVariant } from "../../lib/layout";
import { scopedThreadKey } from "../../lib/scopedEntities";
import type {
  PendingApproval,
  PendingUserInput,
  PendingUserInputDraftAnswer,
  ThreadFeedEntry,
} from "../../lib/threadActivity";
import { platformCapabilities } from "../../platform/capabilities";
import { MemoAgentPhaseIndicator } from "./AgentPhaseIndicator";
import { PendingApprovalCard } from "./PendingApprovalCard";
import { PendingUserInputCard } from "./PendingUserInputCard";
import { ThreadComposer } from "./ThreadComposer";
import {
  estimateThreadComposerOverlayHeight,
  minimumThreadComposerContentInsetEnd,
  resolveThreadComposerContentInsetEnd,
  threadComposerOverlayHeightAdjustment,
} from "./threadComposerOverlayInset";
import { ThreadFeed } from "./ThreadFeed";
import type { ThreadContentPresentation } from "./threadContentPresentation";

export interface ThreadDetailScreenProps {
  readonly selectedThread: OrchestrationThreadShell;
  readonly contentPresentation: ThreadContentPresentation;
  readonly screenTone: StatusTone;
  readonly connectionError: string | null;
  readonly environmentLabel: string | null;
  readonly selectedThreadFeed: ReadonlyArray<ThreadFeedEntry>;
  readonly activeWorkStartedAt: string | null;
  readonly activePendingApproval: PendingApproval | null;
  readonly respondingApprovalId: ApprovalRequestId | null;
  readonly activePendingUserInput: PendingUserInput | null;
  readonly activePendingUserInputDrafts: Record<string, PendingUserInputDraftAnswer>;
  readonly activePendingUserInputAnswers: Record<string, string> | null;
  readonly respondingUserInputId: ApprovalRequestId | null;
  readonly draftMessage: string;
  readonly draftAttachments: ReadonlyArray<DraftComposerImageAttachment>;
  readonly connectionStateLabel: EnvironmentConnectionPhase;
  /** Message sync status for the selected thread (drives the composer status pill). */
  readonly threadSyncStatus?: EnvironmentThreadStatus;
  readonly activeThreadBusy: boolean;
  readonly environmentId: EnvironmentId;
  readonly projectWorkspaceRoot: string | null;
  readonly threadCwd: string | null;
  readonly selectedThreadQueueCount: number;
  readonly serverConfig: T3ServerConfig | null;
  readonly layoutVariant?: LayoutVariant;
  readonly usesAutomaticContentInsets?: boolean;
  readonly onHeaderMaterialVisibilityChange?: (visible: boolean) => void;
  readonly onOpenConnectionEditor: () => void;
  readonly onChangeDraftMessage: (value: string) => void;
  readonly onPickDraftImages: () => Promise<void>;
  readonly onNativePasteImages: (uris: ReadonlyArray<string>) => Promise<void>;
  readonly onRemoveDraftImage: (imageId: string) => void;
  readonly onStopThread: () => void;
  readonly onSendMessage: () => Promise<MessageId | null>;
  readonly onReconnectEnvironment: () => void;
  readonly onUpdateThreadModelSelection: (modelSelection: ModelSelection) => void;
  readonly onUpdateThreadRuntimeMode: (runtimeMode: RuntimeMode) => void;
  readonly onUpdateThreadInteractionMode: (interactionMode: ProviderInteractionMode) => void;
  readonly onRespondToApproval: (
    requestId: ApprovalRequestId,
    decision: ProviderApprovalDecision,
  ) => Promise<unknown>;
  readonly onSelectUserInputOption: (
    requestId: ApprovalRequestId,
    questionId: string,
    label: string,
  ) => void;
  readonly onChangeUserInputCustomAnswer: (
    requestId: ApprovalRequestId,
    questionId: string,
    customAnswer: string,
  ) => void;
  readonly onSubmitUserInput: () => Promise<unknown>;
  readonly showContent?: boolean;
  readonly agentAwareness?: AgentAwarenessState | null;
  readonly footerChrome?: ReactNode;
  readonly footerChromeInset?: number;
  readonly onRefreshThread?: () => void;
}

function latestStreamingAssistantMessage(
  feed: ReadonlyArray<ThreadFeedEntry>,
): { readonly id: string; readonly textLength: number } | null {
  for (let index = feed.length - 1; index >= 0; index -= 1) {
    const entry = feed[index];
    if (entry?.type !== "message") {
      continue;
    }
    if (entry.message.role !== "assistant" || !entry.message.streaming) {
      continue;
    }
    return {
      id: entry.message.id,
      textLength: entry.message.text.length,
    };
  }

  return null;
}

function useStreamingHaptics(threadId: ThreadId, feed: ReadonlyArray<ThreadFeedEntry>) {
  const lastStreamingAssistantRef = useRef<{
    readonly id: string;
    readonly textLength: number;
  } | null>(null);
  const lastStreamHapticAtRef = useRef(0);
  const hydratedRef = useRef(false);
  const previousThreadIdRef = useRef(threadId);

  useEffect(() => {
    if (previousThreadIdRef.current !== threadId) {
      previousThreadIdRef.current = threadId;
      hydratedRef.current = false;
    }

    const latestStreamingMessage = latestStreamingAssistantMessage(feed);

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      lastStreamingAssistantRef.current = latestStreamingMessage;
      return;
    }

    if (!latestStreamingMessage) {
      lastStreamingAssistantRef.current = null;
      return;
    }

    const previousStreamingMessage = lastStreamingAssistantRef.current;
    lastStreamingAssistantRef.current = latestStreamingMessage;

    const isNewStream = previousStreamingMessage?.id !== latestStreamingMessage.id;
    const textGrew =
      previousStreamingMessage?.id === latestStreamingMessage.id &&
      latestStreamingMessage.textLength > previousStreamingMessage.textLength;

    if (!isNewStream && !textGrew) {
      return;
    }

    const now = Date.now();
    if (!isNewStream && now - lastStreamHapticAtRef.current < 320) {
      return;
    }

    lastStreamHapticAtRef.current = now;
    void Haptics.selectionAsync();
  }, [threadId, feed]);
}

// Pre-measurement estimate for the working pill's slot (the real height is
// measured via onComposerLayout since the pill lives inside the composer
// overlay). Matches the rendered pill: pt-2 + pb-2 (16) wrapping a bordered
// px-3/py-2 row (~36), so ~52 — keep in sync with THREAD_WORKING_INDICATOR_CHROME.
const WORKING_INDICATOR_HEIGHT = 52;

const WorkingDurationPill = memo(function WorkingDurationPill(props: {
  readonly startedAt: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);
    return () => clearInterval(intervalId);
  }, [props.startedAt]);

  const durationLabel = formatElapsed(props.startedAt, new Date(nowMs).toISOString()) ?? "0s";

  return (
    <Animated.View
      className="shrink-0 px-4 pb-2 pt-2"
      entering={FadeInDown.duration(200)}
      exiting={FadeOut.duration(140)}
    >
      <View className="self-start rounded-full border border-neutral-200/80 bg-neutral-50/90 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.04]">
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1">
            <View className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
            <View className="h-1.5 w-1.5 rounded-full bg-neutral-400/80 dark:bg-neutral-500/80" />
            <View className="h-1.5 w-1.5 rounded-full bg-neutral-400/60 dark:bg-neutral-500/60" />
          </View>
          <Text className="font-t3-medium text-xs text-neutral-600 dark:text-neutral-400">
            Working for {durationLabel}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

export const ThreadDetailScreen = memo(function ThreadDetailScreen(props: ThreadDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const agentLabel = `${props.selectedThread.modelSelection.instanceId} agent`;
  const selectedThreadKey = scopedThreadKey(props.environmentId, props.selectedThread.id);
  const composerEditorRef = useRef<ComposerEditorHandle>(null);
  const composerOverlayRef = useRef<View>(null);
  const listRef = useRef<LegendListRef>(null);
  const feedTouchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const selectedThreadKeyRef = useRef(selectedThreadKey);
  const lastScrolledAnchorMessageIdRef = useRef<MessageId | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [anchorMessageId, setAnchorMessageId] = useState<MessageId | null>(null);
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const footerChromeInset = props.footerChromeInset ?? 0;
  const composerBottomInset =
    footerChromeInset > 0 ? 0 : composerExpanded ? 0 : Math.max(insets.bottom, 12);
  const contentPresentationKind = props.contentPresentation.kind;
  // The raw sync status enters "synchronizing" on every full fetch, cached or
  // not. Whether messages are already on screen decides the pill label: no
  // data yet → "Loading messages", cached data reconciling → "Syncing".
  const threadSyncPhase = (() => {
    switch (props.threadSyncStatus) {
      case "empty":
      case "cached":
      case "synchronizing":
        if (contentPresentationKind === "ready") {
          return "syncing" as const;
        }
        return contentPresentationKind === "loading" ? ("loading" as const) : null;
      default:
        return null;
    }
  })();
  const selectedThreadFeed = props.selectedThreadFeed;
  const inlineTokenCount =
    platformCapabilities.composer.chipMode === "strip"
      ? collectComposerInlineTokens(props.draftMessage).length
      : 0;
  const estimatedOverlayHeight = estimateThreadComposerOverlayHeight({
    expanded: composerExpanded,
    attachmentCount: props.draftAttachments.length,
    inlineTokenCount,
    hasActiveWorkIndicator: props.activeWorkStartedAt !== null,
    footerChromeInset,
  });
  // The overlay's measured height includes the home-indicator inset (the
  // composer pads it), but contentInsetAdjustmentBehavior="automatic" makes
  // UIKit add the safe-area bottom to the content inset AGAIN — leaving a
  // dead strip between the resting content and the composer. Report the
  // overlay height minus the safe area; UIKit adds it back, and ThreadFeed
  // hands LegendList the same delta via contentInsetEndStaticAdjustment so
  // its end-scroll math matches the real resting position.
  const nativeInsetOvercount =
    props.usesAutomaticContentInsets === true && Platform.OS === "ios" ? insets.bottom : 0;
  const overlayInsetAdjustment = useMemo(
    () => ({
      footerChromeInset,
      nativeInsetOvercount,
    }),
    [footerChromeInset, nativeInsetOvercount],
  );
  const minimumComposerContentInsetEnd = minimumThreadComposerContentInsetEnd(
    estimatedOverlayHeight,
    nativeInsetOvercount,
  );
  const composerOverlayHeightAdjustment =
    threadComposerOverlayHeightAdjustment(overlayInsetAdjustment);
  const { contentInsetEndAdjustment } = useKeyboardChatComposerInset(
    listRef,
    composerOverlayRef,
    minimumComposerContentInsetEnd,
    composerOverlayHeightAdjustment,
  );
  const reportComposerContentInsetEnd = useCallback(
    (nextInset: number) => {
      if (!Number.isFinite(nextInset) || nextInset === contentInsetEndAdjustment.value) {
        return;
      }
      contentInsetEndAdjustment.value = nextInset;
      listRef.current?.reportContentInset({ bottom: nextInset });
    },
    [contentInsetEndAdjustment, listRef],
  );
  const onComposerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const resolvedInset = resolveThreadComposerContentInsetEnd({
        measuredComposerHeight: event.nativeEvent.layout.height,
        estimatedOverlayHeight,
        adjustment: overlayInsetAdjustment,
      });
      reportComposerContentInsetEnd(resolvedInset);
    },
    [estimatedOverlayHeight, overlayInsetAdjustment, reportComposerContentInsetEnd],
  );
  useLayoutEffect(() => {
    if (contentInsetEndAdjustment.value < minimumComposerContentInsetEnd) {
      reportComposerContentInsetEnd(minimumComposerContentInsetEnd);
    }
  }, [contentInsetEndAdjustment, minimumComposerContentInsetEnd, reportComposerContentInsetEnd]);
  const { freeze, scrollMessageToEnd } = useKeyboardScrollToEnd({ listRef });
  const showContent = props.showContent ?? true;
  const layoutVariant = props.layoutVariant ?? "compact";
  const isSplitLayout = layoutVariant === "split";
  const contentMaxWidth = isSplitLayout ? CHAT_CONTENT_MAX_WIDTH : undefined;
  const selectedInstanceId = props.selectedThread.modelSelection.instanceId;
  useStreamingHaptics(props.selectedThread.id, props.selectedThreadFeed);
  const selectedProviderSkills = useMemo(
    () =>
      props.serverConfig?.providers.find((provider) => provider.instanceId === selectedInstanceId)
        ?.skills ?? [],
    [props.serverConfig, selectedInstanceId],
  );

  useLayoutEffect(() => {
    selectedThreadKeyRef.current = selectedThreadKey;
  }, [selectedThreadKey]);

  useEffect(() => {
    setAnchorMessageId(null);
    lastScrolledAnchorMessageIdRef.current = null;
    freeze.set(false);
  }, [freeze, selectedThreadKey]);

  useEffect(() => {
    if (
      anchorMessageId === null ||
      lastScrolledAnchorMessageIdRef.current === anchorMessageId ||
      contentPresentationKind !== "ready" ||
      !selectedThreadFeed.some((entry) => entry.type === "message" && entry.id === anchorMessageId)
    ) {
      return;
    }

    const targetThreadKey = selectedThreadKey;
    const frame = requestAnimationFrame(() => {
      if (selectedThreadKeyRef.current !== targetThreadKey) {
        return;
      }
      lastScrolledAnchorMessageIdRef.current = anchorMessageId;
      // Wait for the keyboard dismissal (started by blur() on send) to finish
      // before scrolling: scrollMessageToEnd freezes keyboard-driven inset
      // updates while it runs, and a close event swallowed by that freeze
      // leaves the keyboard padding permanently applied — overshooting the
      // anchor and leaving a phantom bottom inset once the reply streams in.
      void KeyboardController.dismiss()
        .then(() => {
          if (
            selectedThreadKeyRef.current !== targetThreadKey ||
            lastScrolledAnchorMessageIdRef.current !== anchorMessageId
          ) {
            return;
          }
          return scrollMessageToEnd({ animated: true, closeKeyboard: false });
        })
        .catch(() => {
          if (
            selectedThreadKeyRef.current !== targetThreadKey ||
            lastScrolledAnchorMessageIdRef.current !== anchorMessageId
          ) {
            return;
          }
          lastScrolledAnchorMessageIdRef.current = null;
          freeze.set(false);
        });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    anchorMessageId,
    freeze,
    contentPresentationKind,
    selectedThreadFeed,
    scrollMessageToEnd,
    selectedThreadKey,
  ]);

  const handleSendMessage = useCallback(async () => {
    const targetThreadKey = selectedThreadKey;
    const messageId = await props.onSendMessage();
    if (messageId === null || selectedThreadKeyRef.current !== targetThreadKey) {
      return messageId;
    }

    setAnchorMessageId(messageId);
    // Dismiss before blur: image-picker returns on Android can leave a stale
    // keyboard height in KeyboardStickyView while the soft keyboard is hidden.
    await KeyboardController.dismiss();
    composerEditorRef.current?.blur();
    return messageId;
  }, [props.onSendMessage, selectedThreadKey]);

  const collapseComposer = useCallback(() => {
    composerEditorRef.current?.blur();
  }, []);

  const handleFeedTouchStart = useCallback((event: GestureResponderEvent) => {
    feedTouchStartRef.current = {
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    };
  }, []);

  const handleFeedTouchMove = useCallback((event: GestureResponderEvent) => {
    const start = feedTouchStartRef.current;
    if (!start) {
      return;
    }
    const deltaX = event.nativeEvent.pageX - start.pageX;
    const deltaY = event.nativeEvent.pageY - start.pageY;
    if (Math.hypot(deltaX, deltaY) > 8) {
      feedTouchStartRef.current = null;
    }
  }, []);

  const handleFeedTouchEnd = useCallback(() => {
    if (feedTouchStartRef.current) {
      collapseComposer();
    }
    feedTouchStartRef.current = null;
  }, [collapseComposer]);

  const handleFeedTouchCancel = useCallback(() => {
    feedTouchStartRef.current = null;
  }, []);

  const handleAgentPhasePress = useCallback(
    (awareness: AgentAwarenessState) => {
      switch (awareness.phase) {
        case "waiting_for_approval":
          void Haptics.selectionAsync();
          void scrollMessageToEnd({ animated: true, closeKeyboard: false });
          return;
        case "waiting_for_input":
          composerEditorRef.current?.focus();
          return;
        case "failed":
          if (awareness.detail) {
            Alert.alert(awareness.headline, awareness.detail);
          } else {
            void scrollMessageToEnd({ animated: true, closeKeyboard: false });
          }
          return;
        case "completed":
          void scrollMessageToEnd({ animated: true, closeKeyboard: false });
          return;
        case "stale":
          Alert.alert("Checking for updates…", "Refreshing thread status.");
          props.onRefreshThread?.();
          return;
        default:
          return;
      }
    },
    [props.onRefreshThread, scrollMessageToEnd],
  );

  return (
    <View className="flex-1">
      {showContent && props.agentAwareness ? (
        <MemoAgentPhaseIndicator awareness={props.agentAwareness} onPress={handleAgentPhasePress} />
      ) : null}
      {showContent ? (
        <View
          className="flex-1"
          onTouchStart={handleFeedTouchStart}
          onTouchMove={handleFeedTouchMove}
          onTouchEnd={handleFeedTouchEnd}
          onTouchCancel={handleFeedTouchCancel}
        >
          <ThreadFeed
            key={props.selectedThread.id}
            environmentId={props.environmentId}
            threadId={props.selectedThread.id}
            workspaceRoot={props.threadCwd}
            feed={props.selectedThreadFeed}
            contentPresentation={props.contentPresentation}
            agentLabel={agentLabel}
            latestTurn={props.selectedThread.latestTurn}
            listRef={listRef}
            freeze={freeze}
            anchorMessageId={anchorMessageId}
            contentInsetEndAdjustment={contentInsetEndAdjustment}
            contentTopInset={0}
            contentBottomInset={estimatedOverlayHeight}
            contentMaxWidth={contentMaxWidth}
            layoutVariant={layoutVariant}
            usesAutomaticContentInsets={props.usesAutomaticContentInsets}
            onHeaderMaterialVisibilityChange={props.onHeaderMaterialVisibilityChange}
            skills={selectedProviderSkills}
          />
        </View>
      ) : (
        <View className="flex-1" />
      )}

      {/* Floating composer — sticks to keyboard via KeyboardStickyView */}
      {props.footerChrome ? (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {props.footerChrome}
        </View>
      ) : null}
      {showContent ? (
        <KeyboardStickyView
          enabled={isKeyboardVisible}
          style={{ position: "absolute", bottom: footerChromeInset, left: 0, right: 0 }}
          offset={{ closed: 0, opened: 0 }}
        >
          {/* No paddingTop here: the overlay's measured height becomes the
              list's bottom inset, so any padding above the pill/composer
              pushes the resting content floor up by the same amount. */}
          <View ref={composerOverlayRef} onLayout={onComposerLayout} className="w-full">
            <Animated.View
              className="w-full self-center"
              layout={LinearTransition.duration(220)}
              style={{ maxWidth: contentMaxWidth }}
            >
              {props.activeWorkStartedAt ? (
                <WorkingDurationPill startedAt={props.activeWorkStartedAt} />
              ) : null}

              {props.activePendingApproval || props.activePendingUserInput ? (
                <Animated.View
                  className="shrink-0 gap-3 px-4 pb-3"
                  entering={FadeInDown.duration(220)}
                  exiting={FadeOut.duration(140)}
                >
                  {props.activePendingApproval ? (
                    <PendingApprovalCard
                      approval={props.activePendingApproval}
                      respondingApprovalId={props.respondingApprovalId}
                      onRespond={props.onRespondToApproval}
                    />
                  ) : null}
                  {props.activePendingUserInput ? (
                    <PendingUserInputCard
                      pendingUserInput={props.activePendingUserInput}
                      drafts={props.activePendingUserInputDrafts}
                      answers={props.activePendingUserInputAnswers}
                      respondingUserInputId={props.respondingUserInputId}
                      onSelectOption={props.onSelectUserInputOption}
                      onChangeCustomAnswer={props.onChangeUserInputCustomAnswer}
                      onSubmit={props.onSubmitUserInput}
                    />
                  ) : null}
                </Animated.View>
              ) : null}
            </Animated.View>

            <ThreadComposer
              editorRef={composerEditorRef}
              draftMessage={props.draftMessage}
              draftAttachments={props.draftAttachments}
              placeholder="Ask the repo agent, or run a command…"
              contentMaxWidth={contentMaxWidth}
              connectionState={props.connectionStateLabel}
              connectionError={props.connectionError}
              environmentLabel={props.environmentLabel}
              threadSyncPhase={threadSyncPhase}
              selectedThread={props.selectedThread}
              serverConfig={props.serverConfig}
              queueCount={props.selectedThreadQueueCount}
              activeThreadBusy={props.activeThreadBusy}
              environmentId={props.environmentId}
              projectCwd={props.projectWorkspaceRoot}
              bottomInset={composerBottomInset}
              onChangeDraftMessage={props.onChangeDraftMessage}
              onPickDraftImages={props.onPickDraftImages}
              onNativePasteImages={props.onNativePasteImages}
              onRemoveDraftImage={props.onRemoveDraftImage}
              onStopThread={props.onStopThread}
              onSendMessage={handleSendMessage}
              onReconnectEnvironment={props.onReconnectEnvironment}
              onManageEnvironments={props.onOpenConnectionEditor}
              onUpdateModelSelection={props.onUpdateThreadModelSelection}
              onUpdateRuntimeMode={props.onUpdateThreadRuntimeMode}
              onUpdateInteractionMode={props.onUpdateThreadInteractionMode}
              onExpandedChange={setComposerExpanded}
            />
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
});
