import {
  ProviderDriverKind,
  type LmStudioSettings,
  type ModelCapabilities,
  type ServerProvider,
  type ServerProviderModel,
} from "@t3tools/contracts";
import { createModelCapabilities } from "@t3tools/shared/model";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";

import {
  buildServerProvider,
  nonEmptyTrimmed,
  providerModelsFromSettings,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";
import { listLmStudioModels, LmStudioApiError } from "../lmStudioApi.ts";

const PROVIDER = ProviderDriverKind.make("lmstudio");
const PRESENTATION = {
  displayName: "LM Studio",
  badgeLabel: "Local",
  showInteractionModeToggle: false,
} as const;

const DEFAULT_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [],
});
const isLmStudioApiError = Schema.is(LmStudioApiError);

const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

function lmStudioModelName(slug: string): string {
  const parts = slug.split(/[/:]/g);
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index]?.trim();
    if (part && part.length > 0) {
      return part.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }
  return slug;
}

function serverModelsFromLmStudio(models: ReadonlyArray<{ readonly id: string }>) {
  const seen = new Set<string>();
  const entries: ServerProviderModel[] = [];
  for (const model of models) {
    const slug = nonEmptyTrimmed(model.id);
    if (!slug || seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    entries.push({
      slug,
      name: lmStudioModelName(slug),
      isCustom: false,
      capabilities: DEFAULT_CAPABILITIES,
    });
  }
  return entries.toSorted((left, right) => left.name.localeCompare(right.name));
}

function formatLmStudioProbeError(cause: unknown, baseUrl: string): string {
  const detail = isLmStudioApiError(cause) ? cause.detail : undefined;
  const message = detail ?? (cause instanceof Error ? cause.message : "Unknown error.");
  const lower = message.toLowerCase();
  if (
    lower.includes("econnrefused") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("failed to fetch")
  ) {
    return `Couldn't reach LM Studio at ${baseUrl}. Start the LM Studio local server and check the Base URL.`;
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized")) {
    return "LM Studio rejected authentication. Check the configured API key or proxy.";
  }
  return `LM Studio server check failed: ${message}`;
}

export const makePendingLmStudioProvider = (
  settings: LmStudioSettings,
): Effect.Effect<ServerProviderDraft> =>
  Effect.gen(function* () {
    const checkedAt = yield* nowIso;
    const models = providerModelsFromSettings(
      [],
      PROVIDER,
      settings.customModels,
      DEFAULT_CAPABILITIES,
    );

    return buildServerProvider({
      presentation: PRESENTATION,
      enabled: settings.enabled,
      checkedAt,
      models,
      probe: {
        installed: settings.enabled,
        version: null,
        status: settings.enabled ? "warning" : "warning",
        auth: { status: settings.apiKey.trim().length > 0 ? "authenticated" : "unknown" },
        message: settings.enabled
          ? "LM Studio has not been checked yet."
          : "LM Studio is disabled in T3 Code settings.",
      },
    });
  });

export const checkLmStudioProviderStatus = (
  settings: LmStudioSettings,
): Effect.Effect<ServerProviderDraft, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const checkedAt = yield* nowIso;

    if (!settings.enabled) {
      return yield* makePendingLmStudioProvider(settings);
    }

    const result = yield* listLmStudioModels(settings).pipe(Effect.result);
    if (result._tag === "Failure") {
      const models = providerModelsFromSettings(
        [],
        PROVIDER,
        settings.customModels,
        DEFAULT_CAPABILITIES,
      );
      return buildServerProvider({
        presentation: PRESENTATION,
        enabled: true,
        checkedAt,
        models,
        probe: {
          installed: false,
          version: null,
          status: "error",
          auth: { status: settings.apiKey.trim().length > 0 ? "authenticated" : "unknown" },
          message: formatLmStudioProbeError(result.failure, settings.baseUrl),
        },
      });
    }

    const discoveredModels = serverModelsFromLmStudio(result.success);
    const models = providerModelsFromSettings(
      discoveredModels,
      PROVIDER,
      settings.customModels,
      DEFAULT_CAPABILITIES,
    );

    return buildServerProvider({
      presentation: PRESENTATION,
      enabled: true,
      checkedAt,
      models,
      probe: {
        installed: true,
        version: null,
        status: "ready",
        auth: { status: settings.apiKey.trim().length > 0 ? "authenticated" : "unknown" },
        message:
          models.length > 0
            ? `Connected to LM Studio at ${settings.baseUrl}.`
            : "Connected to LM Studio, but no models were returned by /v1/models.",
      },
    });
  });

export const stampLmStudioSnapshot = (input: {
  readonly snapshot: ServerProviderDraft;
  readonly instanceId: ServerProvider["instanceId"];
  readonly displayName: string | undefined;
  readonly accentColor: string | undefined;
  readonly continuationGroupKey: string;
}): ServerProvider => ({
  ...input.snapshot,
  instanceId: input.instanceId,
  driver: PROVIDER,
  ...(input.displayName ? { displayName: input.displayName } : {}),
  ...(input.accentColor ? { accentColor: input.accentColor } : {}),
  continuation: { groupKey: input.continuationGroupKey },
});
