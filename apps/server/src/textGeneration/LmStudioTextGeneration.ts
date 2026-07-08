import {
  type LmStudioSettings,
  type ModelSelection,
  TextGenerationError,
} from "@t3tools/contracts";
import { sanitizeBranchFragment, sanitizeFeatureBranchName } from "@t3tools/shared/git";
import { extractJsonObject } from "@t3tools/shared/schemaJson";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";

import { createLmStudioChatCompletion, loadLmStudioModel } from "../provider/lmStudioApi.ts";
import * as TextGeneration from "./TextGeneration.ts";
import {
  buildBranchNamePrompt,
  buildCommitMessagePrompt,
  buildPrContentPrompt,
  buildThreadTitlePrompt,
} from "./TextGenerationPrompts.ts";
import {
  sanitizeCommitSubject,
  sanitizePrTitle,
  sanitizeThreadTitle,
} from "./TextGenerationUtils.ts";

const isTextGenerationError = Schema.is(TextGenerationError);

function resolveModel(selection: ModelSelection): string {
  return selection.model?.trim() || "local-model";
}

export const makeLmStudioTextGeneration = Effect.fn("makeLmStudioTextGeneration")(function* (
  settings: LmStudioSettings,
) {
  const httpClient = yield* HttpClient.HttpClient;
  const runLmStudioJson = <S extends Schema.Top>({
    operation,
    prompt,
    outputSchema,
    modelSelection,
  }: {
    operation:
      | "generateCommitMessage"
      | "generatePrContent"
      | "generateBranchName"
      | "generateThreadTitle";
    prompt: string;
    outputSchema: S;
    modelSelection: ModelSelection;
  }): Effect.Effect<S["Type"], TextGenerationError, S["DecodingServices"]> =>
    Effect.gen(function* () {
      const model = resolveModel(modelSelection);
      if (settings.loadModelOnDemand) {
        yield* loadLmStudioModel(settings, model).pipe(
          Effect.provideService(HttpClient.HttpClient, httpClient),
          Effect.catch(() => Effect.void),
        );
      }
      const completion = yield* createLmStudioChatCompletion({
        settings,
        model,
        messages: [
          {
            role: "system",
            content:
              "Return only valid JSON matching the requested shape. Do not include markdown fences or explanatory text.",
          },
          { role: "user", content: prompt },
        ],
      }).pipe(
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.mapError(
          (cause) =>
            new TextGenerationError({
              operation,
              detail: "LM Studio chat completion request failed.",
              cause,
            }),
        ),
      );

      const decodeOutput = Schema.decodeEffect(Schema.fromJsonString(outputSchema));
      return yield* decodeOutput(extractJsonObject(completion.content)).pipe(
        Effect.catchTags({
          SchemaError: (cause) =>
            Effect.fail(
              new TextGenerationError({
                operation,
                detail: "LM Studio returned invalid structured output.",
                cause,
              }),
            ),
        }),
      );
    }).pipe(
      Effect.mapError((cause) =>
        isTextGenerationError(cause)
          ? cause
          : new TextGenerationError({
              operation,
              detail: "LM Studio text generation failed.",
              cause,
            }),
      ),
    );

  const generateCommitMessage: TextGeneration.TextGeneration["Service"]["generateCommitMessage"] =
    Effect.fn("LmStudioTextGeneration.generateCommitMessage")(function* (input) {
      const { prompt, outputSchema } = buildCommitMessagePrompt({
        branch: input.branch,
        stagedSummary: input.stagedSummary,
        stagedPatch: input.stagedPatch,
        includeBranch: input.includeBranch === true,
      });

      const generated = yield* runLmStudioJson({
        operation: "generateCommitMessage",
        prompt,
        outputSchema,
        modelSelection: input.modelSelection,
      });

      return {
        subject: sanitizeCommitSubject(generated.subject),
        body: generated.body.trim(),
        ...("branch" in generated && typeof generated.branch === "string"
          ? { branch: sanitizeFeatureBranchName(generated.branch) }
          : {}),
      };
    });

  const generatePrContent: TextGeneration.TextGeneration["Service"]["generatePrContent"] =
    Effect.fn("LmStudioTextGeneration.generatePrContent")(function* (input) {
      const { prompt, outputSchema } = buildPrContentPrompt({
        baseBranch: input.baseBranch,
        headBranch: input.headBranch,
        commitSummary: input.commitSummary,
        diffSummary: input.diffSummary,
        diffPatch: input.diffPatch,
      });

      const generated = yield* runLmStudioJson({
        operation: "generatePrContent",
        prompt,
        outputSchema,
        modelSelection: input.modelSelection,
      });

      return {
        title: sanitizePrTitle(generated.title),
        body: generated.body.trim(),
      };
    });

  const generateBranchName: TextGeneration.TextGeneration["Service"]["generateBranchName"] =
    Effect.fn("LmStudioTextGeneration.generateBranchName")(function* (input) {
      const { prompt, outputSchema } = buildBranchNamePrompt({
        message: input.message,
        attachments: input.attachments,
      });

      const generated = yield* runLmStudioJson({
        operation: "generateBranchName",
        prompt,
        outputSchema,
        modelSelection: input.modelSelection,
      });

      return { branch: sanitizeBranchFragment(generated.branch) };
    });

  const generateThreadTitle: TextGeneration.TextGeneration["Service"]["generateThreadTitle"] =
    Effect.fn("LmStudioTextGeneration.generateThreadTitle")(function* (input) {
      const { prompt, outputSchema } = buildThreadTitlePrompt({
        message: input.message,
        attachments: input.attachments,
      });

      const generated = yield* runLmStudioJson({
        operation: "generateThreadTitle",
        prompt,
        outputSchema,
        modelSelection: input.modelSelection,
      });

      return { title: sanitizeThreadTitle(generated.title) };
    });

  return {
    generateCommitMessage,
    generatePrContent,
    generateBranchName,
    generateThreadTitle,
  } satisfies TextGeneration.TextGeneration["Service"];
});
