import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEMO_SAMPLE_HOMEWORK_URL,
  resolveDemoHomeworkLink,
} from "@/lib/demoHomework";

describe("sample homework page", () => {
  it("resolves the stored marker to the hosted page", () => {
    expect(resolveDemoHomeworkLink("https://example.com/homework")).toBe(
      "https://example.com/homework",
    );
    expect(resolveDemoHomeworkLink(DEMO_SAMPLE_HOMEWORK_URL)).toContain(
      "demo/sample-homework.html",
    );
  });

  it("posts the same way a student homework page does", () => {
    const html = readFileSync("public/demo/sample-homework.html", "utf8");
    expect(html).toContain("method=\"POST\"");
    expect(html).toContain("/formResponse");
    expect(html).toContain("name=\"entry.469494776\"");
    expect(html).toContain("name=\"entry.1222803705\"");
    expect(html).toContain("target=\"hf\"");
    expect(html).toContain("Avery Chen (sample)");
    expect(html).toContain("Submitted. Nice work!");
    expect(html).not.toContain("\u2014");
  });
});
