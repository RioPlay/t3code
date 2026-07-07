import { describe, expect, it } from "@effect/vitest";

import { sanitizeApnsNotificationPayload } from "./agentActivityPayloads.ts";

describe("sanitizeApnsNotificationPayload", () => {
  it("bounds FCM notification title, body, and deep link payloads", () => {
    const longTitle = "x".repeat(300);
    const sanitized = sanitizeApnsNotificationPayload({
      title: longTitle,
      body: `${"Input: ".repeat(40)}Project`,
      environmentId: "env",
      threadId: "thread",
      deepLink: "https://example.test/not-an-app-link",
    });

    expect(sanitized.title.length).toBeLessThanOrEqual(120);
    expect(sanitized.body.length).toBeLessThanOrEqual(120);
    expect(sanitized.deepLink).toBe("/");
    expect(sanitized.environmentId).toBe("env");
    expect(sanitized.threadId).toBe("thread");
  });

  it("preserves valid in-app deep links", () => {
    const sanitized = sanitizeApnsNotificationPayload({
      title: "Thread",
      body: "Input: Project",
      environmentId: "env",
      threadId: "thread",
      deepLink: "/threads/env/thread",
    });

    expect(sanitized.deepLink).toBe("/threads/env/thread");
  });
});
