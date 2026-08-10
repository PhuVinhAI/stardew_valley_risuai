import { describe, expect, test } from "bun:test";
import { decodeRpack, encodeRpack } from "@charx/risum-codec";

describe("RPack substitution codec", () => {
  test("round trips with the RisuAI map", async () => {
    const map = await Bun.file("projects/examples/danganronpa-her/.charx/rpack-map.base64")
      .text()
      .catch(() => "");
    if (!map) return;
    const bytes = Buffer.from(map.trim(), "base64");
    const original = Buffer.from("Stardew Valley / Danganronpa HER", "utf8");
    expect(decodeRpack(encodeRpack(original, bytes), bytes)).toEqual(original);
  });
});
