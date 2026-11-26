import { describe, expect, it } from "vitest";

import { versionFromTagRef } from "../../scripts/check-tag-version";

describe("versionFromTagRef", () => {
  it("parses v-prefixed semver tags", () => {
    expect(versionFromTagRef("refs/tags/v7.1.0")).toBe("7.1.0");
  });

  it("parses bare semver tags", () => {
    expect(versionFromTagRef("refs/tags/7.0.2")).toBe("7.0.2");
  });

  it("ignores non-tag refs", () => {
    expect(versionFromTagRef("refs/heads/main")).toBeNull();
  });

  it("ignores non-semver tag names", () => {
    expect(versionFromTagRef("refs/tags/latest")).toBeNull();
  });
});
