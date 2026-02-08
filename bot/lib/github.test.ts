import { Octokit } from "@octokit/rest";
import { describe, expect, test } from "vitest";
import * as GitHub from "./github.js";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = "wevm";
const repo = "changelogs-rs";

describe("GitHub.verifySignature", () => {
  const secret = "test-secret";
  const payload = '{"action":"opened"}';

  test("valid", () => {
    const crypto = require("node:crypto");
    const sig =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(
      GitHub.verifySignature({ payload, signature: sig, secret }),
    ).toMatchInlineSnapshot(`true`);
  });

  test("invalid", () => {
    expect(
      GitHub.verifySignature({
        payload,
        signature: "sha256=invalid",
        secret,
      }),
    ).toMatchInlineSnapshot(`false`);
  });

  test("null signature", () => {
    expect(
      GitHub.verifySignature({ payload, signature: null, secret }),
    ).toMatchInlineSnapshot(`false`);
  });
});

describe("GitHub.getChangelogFiles", () => {
  test("PR with changelog", async () => {
    const files = await GitHub.getChangelogFiles({
      octokit,
      owner,
      repo,
      prNumber: 25,
    });
    expect(files).toMatchInlineSnapshot(`
      [
        ".changelog/plain-frogs-hum.md",
      ]
    `);
  });

  test("PR without changelog", async () => {
    const files = await GitHub.getChangelogFiles({
      octokit,
      owner,
      repo,
      prNumber: 39,
    });
    expect(files).toMatchInlineSnapshot(`[]`);
  });
});

describe("GitHub.getChangedPackages", () => {
  test("detects changed packages", async () => {
    const packages = await GitHub.getChangedPackages({
      octokit,
      owner,
      repo,
      ref: "master",
      prNumber: 25,
    });
    expect(packages).toMatchInlineSnapshot(`
      [
        "changelogs",
      ]
    `);
  });
});

describe("GitHub.getPRDiff", () => {
  test("returns diff", async () => {
    const diff = await GitHub.getPRDiff({
      octokit,
      owner,
      repo,
      prNumber: 39,
    });
    expect(diff).toMatchInlineSnapshot(`
      "diff --git a/README.md b/README.md
      index 066e7ea..503e364 100644
      --- a/README.md
      +++ b/README.md
      @@ -1,3 +1,4 @@
      +
       <p align="center">
         <picture>
           <source media="(prefers-color-scheme: dark)" srcset=".github/banner-dark.svg">
      "
    `);
  });
});

describe("GitHub.findBotComment", () => {
  test("no bot comment", async () => {
    const result = await GitHub.findBotComment({
      octokit,
      owner,
      repo,
      prNumber: 39,
    });
    expect(result).toMatchInlineSnapshot(`null`);
  });
});

describe("GitHub.upsertComment", () => {
  test.todo("creates a comment (skipped to avoid PR spam)");
  test.todo("updates an existing comment (skipped to avoid PR spam)");
});
