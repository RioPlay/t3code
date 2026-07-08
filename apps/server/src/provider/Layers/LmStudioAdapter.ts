import {
  EventId,
  ApprovalRequestId,
  ProviderDriverKind,
  ProviderInstanceId,
  type LmStudioSettings,
  type ProviderApprovalDecision,
  type ProviderRuntimeEvent,
  type ProviderSendTurnInput,
  type ProviderSession,
  type ProviderSessionStartInput,
  RuntimeItemId,
  RuntimeRequestId,
  ThreadId,
  TurnId,
  type ProviderUserInputAnswers,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { HttpClient } from "effect/unstable/http";

import { ServerConfig } from "../../config.ts";
import {
  createLmStudioChatCompletion,
  loadLmStudioModel,
  type LmStudioChatMessage,
} from "../lmStudioApi.ts";
import {
  ProviderAdapterRequestError,
  ProviderAdapterSessionClosedError,
  ProviderAdapterSessionNotFoundError,
} from "../Errors.ts";

const PROVIDER = ProviderDriverKind.make("lmstudio");
const SYSTEM_PROMPT =
  "You are running inside T3 Code through LM Studio. Answer the user's coding questions clearly. You do not have access to tools, files, or shell commands unless the user pastes that context into the conversation.";

interface LmStudioTurnSnapshot {
  readonly id: TurnId;
  readonly items: Array<unknown>;
}

interface LmStudioSessionContext {
  session: ProviderSession;
  messages: Array<LmStudioChatMessage>;
  turns: Array<LmStudioTurnSnapshot>;
  readonly sessionScope: Scope.Closeable;
  activeFiber: Fiber.Fiber<void, never> | undefined;
  activeTurnId: TurnId | undefined;
  stopped: boolean;
}

interface EventBaseInput {
  readonly threadId: ThreadId;
  readonly turnId?: TurnId | undefined;
  readonly itemId?: string | undefined;
  readonly requestId?: string | undefined;
}

const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

const toRequestError = (
  method: string,
  cause: unknown,
  fallback: string,
): ProviderAdapterRequestError =>
  new ProviderAdapterRequestError({
    provider: PROVIDER,
    method,
    detail: cause instanceof Error ? cause.message : fallback,
    cause,
  });

function userMessageFromTurn(input: ProviderSendTurnInput): string {
  const lines: Array<string> = [];
  const text = input.input?.trim();
  if (text) {
    lines.push(text);
  }
  const attachments = input.attachments ?? [];
  if (attachments.length > 0) {
    lines.push(
      "",
      "Attachment metadata:",
      ...attachments.map(
        (attachment) =>
          `- ${attachment.name} (${attachment.mimeType}, ${attachment.sizeBytes} bytes)`,
      ),
    );
  }
  return lines.join("\n").trim();
}

function resolveTurnModel(input: ProviderSendTurnInput, context: LmStudioSessionContext): string {
  return input.modelSelection?.model?.trim() || context.session.model || "local-model";
}

function appendTurnItem(
  context: LmStudioSessionContext,
  turnId: TurnId | undefined,
  item: unknown,
): void {
  if (!turnId) {
    return;
  }
  let turn = context.turns.find((candidate) => candidate.id === turnId);
  if (!turn) {
    turn = { id: turnId, items: [] };
    context.turns.push(turn);
  }
  turn.items.push(item);
}

function ensureSessionContext(
  sessions: ReadonlyMap<ThreadId, LmStudioSessionContext>,
  threadId: ThreadId,
): LmStudioSessionContext {
  const context = sessions.get(threadId);
  if (!context) {
    throw new ProviderAdapterSessionNotFoundError({ provider: PROVIDER, threadId });
  }
  if (context.stopped) {
    throw new ProviderAdapterSessionClosedError({ provider: PROVIDER, threadId });
  }
  return context;
}

export const makeLmStudioAdapter = Effect.fn("makeLmStudioAdapter")(function* (
  settings: LmStudioSettings,
  options?: {
    readonly instanceId?: ProviderInstanceId | undefined;
  },
) {
  const serverConfig = yield* ServerConfig;
  const httpClient = yield* HttpClient.HttpClient;
  const boundInstanceId = options?.instanceId ?? ProviderInstanceId.make("lmstudio");
  const events = yield* Queue.unbounded<ProviderRuntimeEvent>();
  const sessions = new Map<ThreadId, LmStudioSessionContext>();
  let nextEventId = 0;
  let nextTurnId = 0;

  const eventId = () => EventId.make(`lmstudio-event-${nextEventId++}`);
  const turnId = () => TurnId.make(`lmstudio-turn-${nextTurnId++}`);
  const buildEventBase = (input: EventBaseInput) =>
    nowIso.pipe(
      Effect.map((createdAt) => ({
        eventId: eventId(),
        provider: PROVIDER,
        providerInstanceId: boundInstanceId,
        threadId: input.threadId,
        createdAt,
        ...(input.turnId ? { turnId: input.turnId } : {}),
        ...(input.itemId ? { itemId: RuntimeItemId.make(input.itemId) } : {}),
        ...(input.requestId ? { requestId: RuntimeRequestId.make(input.requestId) } : {}),
      })),
    );
  const emit = (event: ProviderRuntimeEvent) => Queue.offer(events, event).pipe(Effect.asVoid);

  const stopContext = (context: LmStudioSessionContext): Effect.Effect<void> =>
    Effect.gen(function* () {
      if (context.stopped) {
        return;
      }
      context.stopped = true;
      if (context.activeFiber) {
        yield* Fiber.interrupt(context.activeFiber).pipe(Effect.ignore);
      }
      context.activeFiber = undefined;
      context.activeTurnId = undefined;
      context.session = {
        ...context.session,
        status: "closed",
        updatedAt: yield* nowIso,
      };
      yield* Scope.close(context.sessionScope, Exit.void).pipe(Effect.ignore);
      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId })),
        type: "session.exited",
        payload: { exitKind: "graceful" },
      });
    });

  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      const contexts = [...sessions.values()];
      sessions.clear();
      yield* Effect.forEach(contexts, stopContext, { concurrency: "unbounded", discard: true });
    }).pipe(Effect.ensuring(Queue.shutdown(events))),
  );

  const runTurn = (context: LmStudioSessionContext, input: ProviderSendTurnInput, id: TurnId) =>
    Effect.gen(function* () {
      const model = resolveTurnModel(input, context);
      const userMessage = userMessageFromTurn(input);
      if (userMessage.length === 0) {
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "sendTurn",
          detail: "Cannot send an empty LM Studio turn.",
        });
      }

      context.activeFiber = undefined;
      context.activeTurnId = id;
      context.session = {
        ...context.session,
        status: "running",
        model,
        activeTurnId: id,
        updatedAt: yield* nowIso,
      };
      context.messages.push({ role: "user", content: userMessage });

      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId })),
        type: "session.state.changed",
        payload: { state: "running" },
      });
      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id })),
        type: "turn.started",
        payload: { model },
      });

      const itemId = `assistant:${id}`;
      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id, itemId })),
        type: "item.started",
        payload: { itemType: "assistant_message", status: "inProgress" },
      });

      const completion = yield* (
        settings.loadModelOnDemand
          ? loadLmStudioModel(settings, model).pipe(
              Effect.catch(() => Effect.void),
              Effect.flatMap(() =>
                createLmStudioChatCompletion({
                  settings,
                  model,
                  messages: context.messages,
                }),
              ),
            )
          : createLmStudioChatCompletion({
              settings,
              model,
              messages: context.messages,
            })
      ).pipe(
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.mapError((cause) => toRequestError("chatCompletion", cause, "Request failed.")),
      );

      context.messages.push({ role: "assistant", content: completion.content });
      appendTurnItem(context, id, { type: "assistant_message", content: completion.content });

      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id, itemId })),
        type: "content.delta",
        payload: { streamKind: "assistant_text", delta: completion.content },
      });
      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id, itemId })),
        type: "item.completed",
        payload: { itemType: "assistant_message", status: "completed" },
      });
      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id })),
        type: "turn.completed",
        payload: {
          state: "completed",
          stopReason: completion.finishReason,
          ...(completion.usage
            ? {
                modelUsage: {
                  inputTokens: completion.usage.promptTokens,
                  outputTokens: completion.usage.completionTokens,
                  totalTokens: completion.usage.totalTokens,
                },
              }
            : {}),
        },
      });

      context.activeFiber = undefined;
      context.activeTurnId = undefined;
      context.session = {
        ...context.session,
        status: "ready",
        activeTurnId: undefined,
        updatedAt: yield* nowIso,
      };
      yield* emit({
        ...(yield* buildEventBase({ threadId: context.session.threadId })),
        type: "session.state.changed",
        payload: { state: "ready" },
      });
    }).pipe(
      Effect.catch((cause: ProviderAdapterRequestError) =>
        Effect.gen(function* () {
          context.activeFiber = undefined;
          context.activeTurnId = undefined;
          context.session = {
            ...context.session,
            status: "error",
            lastError: cause.message,
            updatedAt: yield* nowIso,
          };
          yield* emit({
            ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id })),
            type: "turn.completed",
            payload: { state: "failed", errorMessage: cause.message },
          });
          yield* emit({
            ...(yield* buildEventBase({ threadId: context.session.threadId, turnId: id })),
            type: "runtime.error",
            payload: { message: cause.message, class: "provider_error" },
          });
        }),
      ),
    );

  return {
    provider: PROVIDER,
    capabilities: { sessionModelSwitch: "in-session" as const },
    startSession: (input: ProviderSessionStartInput) =>
      Effect.gen(function* () {
        if (sessions.has(input.threadId)) {
          yield* stopContext(ensureSessionContext(sessions, input.threadId));
          sessions.delete(input.threadId);
        }
        const sessionScope = yield* Scope.make();
        const createdAt = yield* nowIso;
        const model = input.modelSelection?.model ?? "local-model";
        const session: ProviderSession = {
          provider: PROVIDER,
          providerInstanceId: boundInstanceId,
          status: "ready",
          runtimeMode: input.runtimeMode,
          cwd: input.cwd ?? serverConfig.cwd,
          model,
          threadId: input.threadId,
          createdAt,
          updatedAt: createdAt,
        };
        sessions.set(input.threadId, {
          session,
          messages: [{ role: "system", content: SYSTEM_PROMPT }],
          turns: [],
          sessionScope,
          activeFiber: undefined,
          activeTurnId: undefined,
          stopped: false,
        });
        yield* emit({
          ...(yield* buildEventBase({ threadId: input.threadId })),
          type: "session.started",
          payload: { message: "Connected to LM Studio." },
        });
        yield* emit({
          ...(yield* buildEventBase({ threadId: input.threadId })),
          type: "thread.started",
          payload: {},
        });
        return session;
      }),
    sendTurn: (input: ProviderSendTurnInput) =>
      Effect.gen(function* () {
        const context = ensureSessionContext(sessions, input.threadId);
        if (context.activeTurnId) {
          return yield* new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "sendTurn",
            detail: "LM Studio already has a turn running for this thread.",
          });
        }
        const id = turnId();
        const fiber = yield* runTurn(context, input, id).pipe(Effect.forkIn(context.sessionScope));
        context.activeFiber = fiber;
        return { threadId: input.threadId, turnId: id };
      }),
    interruptTurn: (threadId: ThreadId, turnIdToInterrupt?: TurnId) =>
      Effect.gen(function* () {
        const context = ensureSessionContext(sessions, threadId);
        if (!turnIdToInterrupt || context.activeTurnId === turnIdToInterrupt) {
          if (context.activeFiber) {
            yield* Fiber.interrupt(context.activeFiber).pipe(Effect.ignore);
          }
        }
      }),
    respondToRequest: (
      threadId: ThreadId,
      requestId: ApprovalRequestId,
      _decision: ProviderApprovalDecision,
    ) =>
      Effect.fail(
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "respondToRequest",
          detail: `LM Studio does not support approval requests (${threadId}:${requestId}).`,
        }),
      ),
    respondToUserInput: (
      threadId: ThreadId,
      requestId: ApprovalRequestId,
      _answers: ProviderUserInputAnswers,
    ) =>
      Effect.fail(
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "respondToUserInput",
          detail: `LM Studio does not support user-input requests (${threadId}:${requestId}).`,
        }),
      ),
    stopSession: (threadId: ThreadId) =>
      Effect.gen(function* () {
        const context = ensureSessionContext(sessions, threadId);
        sessions.delete(threadId);
        yield* stopContext(context);
      }),
    listSessions: () => Effect.sync(() => [...sessions.values()].map((context) => context.session)),
    hasSession: (threadId: ThreadId) => Effect.sync(() => sessions.has(threadId)),
    readThread: (threadId: ThreadId) =>
      Effect.sync(() => {
        const context = ensureSessionContext(sessions, threadId);
        return { threadId, turns: context.turns };
      }),
    rollbackThread: (threadId: ThreadId, numTurns: number) =>
      Effect.sync(() => {
        const context = ensureSessionContext(sessions, threadId);
        const removeCount = Math.max(0, Math.floor(numTurns));
        if (removeCount > 0) {
          context.turns.splice(Math.max(0, context.turns.length - removeCount), removeCount);
          context.messages.splice(
            Math.max(1, context.messages.length - removeCount * 2),
            removeCount * 2,
          );
        }
        return { threadId, turns: context.turns };
      }),
    stopAll: () =>
      Effect.gen(function* () {
        const contexts = [...sessions.values()];
        sessions.clear();
        yield* Effect.forEach(contexts, stopContext, { concurrency: "unbounded", discard: true });
      }),
    streamEvents: Stream.fromQueue(events),
  };
});
