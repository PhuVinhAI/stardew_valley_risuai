import { describe, expect, test } from "bun:test";
import { extractGameVersion, filterCharacterMatches, isEnglishXnb } from "@charx/core";

describe("Stardew canon research extraction", () => {
  test("keeps base-language XNB files only", () => {
    expect(isEnglishXnb("Characters/Dialogue/Abigail.xnb")).toBe(true);
    expect(isEnglishXnb("Characters/Dialogue/Abigail.ko-KR.xnb")).toBe(false);
  });

  test("filters top-level records by character name", () => {
    expect(
      filterCharacterMatches(
        {
          Abigail: "profile",
          event1: "speak Abigail happy",
          event2: "speak Sam happy",
        },
        "Abigail",
      ),
    ).toEqual({ Abigail: "profile", event1: "speak Abigail happy" });
  });

  test("reads the longest Stardew version marker", () => {
    expect(extractGameVersion(Buffer.from("game 1.6.15 and build 1.6.15.24356", "utf8"))).toBe(
      "1.6.15.24356",
    );
  });
});
