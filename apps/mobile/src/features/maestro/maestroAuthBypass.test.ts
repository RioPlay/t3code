import { describe, expect, it } from "vite-plus/test";

import { buildMaestroShellSnapshot, MAESTRO_FIXTURE_THREAD_ID } from "./maestroFixture";

describe("maestroFixture", () => {
  it("builds a shell snapshot with the Maestro review thread", () => {
    const snapshot = buildMaestroShellSnapshot();
    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.threads[0]?.id).toBe(MAESTRO_FIXTURE_THREAD_ID);
    expect(snapshot.projects).toHaveLength(1);
  });
});
