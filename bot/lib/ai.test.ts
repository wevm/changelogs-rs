import { describe, expect, test } from "vitest";
import * as AI from "./ai.js";

const sampleDiff = `diff --git a/src/lib.rs b/src/lib.rs
index abc1234..def5678 100644
--- a/src/lib.rs
+++ b/src/lib.rs
@@ -10,6 +10,10 @@ pub fn parse(input: &str) -> Result<()> {
     let tokens = tokenize(input)?;
     let ast = build_ast(tokens)?;
+    // Validate before processing
+    validate(&ast)?;
     process(ast)
 }
+
+fn validate(ast: &Ast) -> Result<()> {
+    Ok(())
+}`;

describe("AI.generateChangelog", () => {
  test("generates a valid changelog entry", async () => {
    const result = await AI.generateChangelog({
      diff: sampleDiff,
      packageNames: ["changelogs"],
    });
    expect(result).not.toBeNull();
    expect(result).toContain("---");
    expect(result).toMatch(/changelogs:\s*(patch|minor|major)/);
  });

  test("returns null without CEREBRAS_API_KEY", async () => {
    const original = process.env.CEREBRAS_API_KEY;
    process.env.CEREBRAS_API_KEY = "";
    const result = await AI.generateChangelog({
      diff: sampleDiff,
      packageNames: ["changelogs"],
    });
    expect(result).toBeNull();
    process.env.CEREBRAS_API_KEY = original;
  });
});
