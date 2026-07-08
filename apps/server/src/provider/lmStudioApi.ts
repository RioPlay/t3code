import type { LmStudioSettings } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpBody, HttpClient } from "effect/unstable/http";

export class LmStudioApiError extends Schema.TaggedErrorClass<LmStudioApiError>()(
  "LmStudioApiError",
  {
    operation: Schema.String,
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `LM Studio API ${this.operation} failed: ${this.detail}`;
  }
}

export interface LmStudioModel {
  readonly id: string;
  readonly object?: string | undefined;
  readonly ownedBy?: string | undefined;
}

export interface LmStudioChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface LmStudioChatUsage {
  readonly promptTokens?: number | undefined;
  readonly completionTokens?: number | undefined;
  readonly totalTokens?: number | undefined;
}

export interface LmStudioChatCompletion {
  readonly content: string;
  readonly finishReason: string | null;
  readonly usage?: LmStudioChatUsage | undefined;
}

const isLmStudioApiError = Schema.is(LmStudioApiError);

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim() || "http://127.0.0.1:1234";
  return trimmed.replace(/\/+$/g, "").replace(/\/(?:v1|api\/v1)$/g, "");
}

function endpoint(settings: LmStudioSettings, path: `/v1/${string}` | `/api/v1/${string}`): string {
  return `${normalizeBaseUrl(settings.baseUrl)}${path}`;
}

function headers(settings: LmStudioSettings): Record<string, string> {
  const out: Record<string, string> = { "content-type": "application/json" };
  const apiKey = settings.apiKey.trim();
  if (apiKey.length > 0) {
    out.authorization = `Bearer ${apiKey}`;
  }
  return out;
}

function errorDetailFromBody(status: number, body: string): string {
  const suffix = body.trim();
  return suffix.length > 0 ? `HTTP ${status}: ${suffix}` : `HTTP ${status}`;
}

const fetchJson = (
  settings: LmStudioSettings,
  operation: string,
  path: `/v1/${string}` | `/api/v1/${string}`,
  init?: { readonly method?: "GET" | "POST"; readonly body?: unknown },
): Effect.Effect<unknown, LmStudioApiError, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const response =
      init?.method === "POST"
        ? yield* httpClient.post(endpoint(settings, path), {
            headers: headers(settings),
            ...(init.body === undefined ? {} : { body: HttpBody.jsonUnsafe(init.body) }),
          })
        : yield* httpClient.get(endpoint(settings, path), { headers: headers(settings) });

    if (response.status < 200 || response.status >= 300) {
      const text = yield* response.text;
      return yield* new LmStudioApiError({
        operation,
        detail: errorDetailFromBody(response.status, text),
      });
    }

    return yield* response.json.pipe(Effect.orElseSucceed(() => ({}) as unknown));
  }).pipe(
    Effect.mapError((cause) =>
      isLmStudioApiError(cause)
        ? cause
        : new LmStudioApiError({
            operation,
            detail: cause instanceof Error ? cause.message : "Request failed.",
            cause,
          }),
    ),
  );

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export const listLmStudioModels = (
  settings: LmStudioSettings,
): Effect.Effect<ReadonlyArray<LmStudioModel>, LmStudioApiError, HttpClient.HttpClient> =>
  fetchJson(settings, "listModels", "/v1/models").pipe(
    Effect.flatMap((payload) => {
      if (!payload || typeof payload !== "object") {
        return Effect.fail(
          new LmStudioApiError({ operation: "listModels", detail: "Response was not an object." }),
        );
      }
      const data = (payload as { readonly data?: unknown }).data;
      if (!Array.isArray(data)) {
        return Effect.fail(
          new LmStudioApiError({
            operation: "listModels",
            detail: "Response did not include a data array.",
          }),
        );
      }
      return Effect.succeed(
        data.flatMap((entry): LmStudioModel[] => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return [];
          }
          const record = entry as Record<string, unknown>;
          const id = readString(record, "id");
          if (!id) {
            return [];
          }
          return [
            {
              id,
              object: readString(record, "object"),
              ownedBy: readString(record, "owned_by") ?? readString(record, "ownedBy"),
            },
          ];
        }),
      );
    }),
  );

export const loadLmStudioModel = (
  settings: LmStudioSettings,
  model: string,
): Effect.Effect<void, LmStudioApiError, HttpClient.HttpClient> =>
  fetchJson(settings, "loadModel", "/api/v1/models/load", {
    method: "POST",
    body: { model },
  }).pipe(Effect.asVoid);

export const createLmStudioChatCompletion = (input: {
  readonly settings: LmStudioSettings;
  readonly model: string;
  readonly messages: ReadonlyArray<LmStudioChatMessage>;
}): Effect.Effect<LmStudioChatCompletion, LmStudioApiError, HttpClient.HttpClient> =>
  fetchJson(input.settings, "chatCompletion", "/v1/chat/completions", {
    method: "POST",
    body: {
      model: input.model,
      messages: input.messages,
      stream: false,
    },
  }).pipe(
    Effect.flatMap((payload) => {
      if (!payload || typeof payload !== "object") {
        return Effect.fail(
          new LmStudioApiError({
            operation: "chatCompletion",
            detail: "Response was not an object.",
          }),
        );
      }
      const record = payload as Record<string, unknown>;
      const choices = record.choices;
      const firstChoice = Array.isArray(choices) ? choices[0] : undefined;
      const message =
        firstChoice && typeof firstChoice === "object"
          ? (firstChoice as { readonly message?: unknown }).message
          : undefined;
      const content =
        message && typeof message === "object"
          ? (message as { readonly content?: unknown }).content
          : undefined;
      if (typeof content !== "string" || content.trim().length === 0) {
        return Effect.fail(
          new LmStudioApiError({
            operation: "chatCompletion",
            detail: "Response did not include assistant message content.",
          }),
        );
      }

      const finishReason =
        firstChoice && typeof firstChoice === "object"
          ? ((firstChoice as { readonly finish_reason?: unknown }).finish_reason ?? null)
          : null;
      const usageRecord =
        record.usage && typeof record.usage === "object"
          ? (record.usage as Record<string, unknown>)
          : undefined;
      let usage: LmStudioChatUsage | undefined;
      if (usageRecord) {
        const nextUsage: Record<string, number> = {};
        if (typeof usageRecord.prompt_tokens === "number") {
          nextUsage.promptTokens = usageRecord.prompt_tokens;
        }
        if (typeof usageRecord.completion_tokens === "number") {
          nextUsage.completionTokens = usageRecord.completion_tokens;
        }
        if (typeof usageRecord.total_tokens === "number") {
          nextUsage.totalTokens = usageRecord.total_tokens;
        }
        usage = Object.keys(nextUsage).length > 0 ? nextUsage : undefined;
      }

      return Effect.succeed({
        content,
        finishReason: typeof finishReason === "string" ? finishReason : null,
        ...(usage ? { usage } : {}),
      });
    }),
  );
