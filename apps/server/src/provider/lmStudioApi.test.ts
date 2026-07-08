import { assert, it } from "@effect/vitest";
import { LmStudioSettings } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";

import {
  createLmStudioChatCompletion,
  listLmStudioModels,
  loadLmStudioModel,
} from "./lmStudioApi.ts";

const decodeLmStudioSettings = Schema.decodeSync(LmStudioSettings);

const defaultSettings = decodeLmStudioSettings({
  baseUrl: "http://127.0.0.1:1234",
});

function makeHttpClientLayer(response: (request: HttpClientRequest.HttpClientRequest) => Response) {
  return Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, response(request))),
    ),
  );
}

it.layer(
  makeHttpClientLayer((request) => {
    assert.equal(request.url, "http://127.0.0.1:1234/v1/models");
    return Response.json({
      data: [
        { id: "llama-3.2-3b", object: "model", owned_by: "local" },
        { id: "mistral-7b", object: "model" },
        { id: "   ", object: "model" },
      ],
    });
  }),
)("listLmStudioModels", (it) => {
  it.effect("normalizes base URLs and parses model ids", () =>
    Effect.gen(function* () {
      const models = yield* listLmStudioModels(
        decodeLmStudioSettings({ baseUrl: "http://127.0.0.1:1234/v1/" }),
      );

      assert.deepEqual(models, [
        { id: "llama-3.2-3b", object: "model", ownedBy: "local" },
        { id: "mistral-7b", object: "model", ownedBy: undefined },
      ]);
    }),
  );
});

it.layer(
  makeHttpClientLayer((request) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "http://127.0.0.1:1234/api/v1/models/load");
    return Response.json({ ok: true });
  }),
)("loadLmStudioModel", (it) => {
  it.effect("posts to the LM Studio load endpoint", () =>
    loadLmStudioModel(defaultSettings, "llama-3.2-3b"),
  );
});

it.layer(
  makeHttpClientLayer((request) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "http://127.0.0.1:1234/v1/chat/completions");
    return Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: { role: "assistant", content: "Hi there." },
        },
      ],
      usage: {
        prompt_tokens: 3,
        completion_tokens: 5,
        total_tokens: 8,
      },
    });
  }),
)("createLmStudioChatCompletion", (it) => {
  it.effect("returns assistant content", () =>
    Effect.gen(function* () {
      const completion = yield* createLmStudioChatCompletion({
        settings: defaultSettings,
        model: "llama-3.2-3b",
        messages: [{ role: "user", content: "Hello" }],
      });

      assert.equal(completion.content, "Hi there.");
      assert.equal(completion.finishReason, "stop");
      assert.deepEqual(completion.usage, {
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
      });
    }),
  );
});
