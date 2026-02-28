import { describe, it, expect } from "vitest";
import { truncate, relativeTime } from "./utils";

describe("truncate", () => {
  it("returns text unchanged when shorter than limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates text and appends ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello…");
  });

  it("returns text unchanged when exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("relativeTime", () => {
  it("returns 'just now' for very recent dates", () => {
    expect(relativeTime(new Date())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(relativeTime(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(relativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(relativeTime(threeDaysAgo)).toBe("3d ago");
  });
});
