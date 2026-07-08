import { describe, expect, it } from "vite-plus/test";

import { buildThreadHeaderSubtitle } from "./threadHeaderSubtitle";

describe("threadHeaderSubtitle", () => {
  it("builds thread header subtitles with project, environment, and connection context", () => {
    expect(
      buildThreadHeaderSubtitle({
        projectTitle: "t3code",
        environmentLabel: "Local",
        connectionStateLabel: null,
      }),
    ).toBe("t3code · Local");

    expect(
      buildThreadHeaderSubtitle({
        projectTitle: "t3code",
        environmentLabel: null,
        connectionStateLabel: "Reconnecting",
      }),
    ).toBe("t3code · Reconnecting");
  });
});
