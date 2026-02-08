import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as Comment from "./comment.js";

beforeEach(() => {
  let i = 0;
  vi.spyOn(Math, "random").mockImplementation(() => [0.1, 0.2, 0.3][i++ % 3]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Comment.found", () => {
  test("default", () => {
    expect(
      Comment.found({
        repo: "wevm/viem",
        headRef: "my-branch",
        changelogFile: ".changelog/cool-cats-dance.md",
      }),
    ).toMatchInlineSnapshot(`
      "### ✅ Changelog found on PR.

      [Edit changelog](https://github.com/wevm/viem/edit/my-branch/.changelog/cool-cats-dance.md)"
    `);
  });
});

describe("Comment.notFound", () => {
  test("without ai", () => {
    expect(
      Comment.notFound({
        repo: "wevm/viem",
        headRef: "my-branch",
        aiContent: null,
      }),
    ).toMatchInlineSnapshot(`
      "### ⚠️ Changelog not found.

      A changelog entry is required before merging.

      **[Add changelog](https://github.com/wevm/viem/new/my-branch?filename=.changelog/gentle-birds-bow.md&value=---%0A%3Cpackage-name%3E%3A%20patch%0A---%0A%0ABrief%20description%20of%20changes.)**"
    `);
  });

  test("with ai content", () => {
    const aiContent = `---
my-crate: patch
---

Fixed a bug.`;
    expect(
      Comment.notFound({
        repo: "wevm/viem",
        headRef: "my-branch",
        aiContent,
      }),
    ).toMatchInlineSnapshot(`
      "### ⚠️ Changelog not found.

      A changelog entry is required before merging. We've generated a suggested changelog based on your changes:

      <details>
      <summary>Preview</summary>

      \`\`\`markdown
      ---
      my-crate: patch
      ---

      Fixed a bug.
      \`\`\`

      </details>

      **[Add changelog](https://github.com/wevm/viem/new/my-branch?filename=.changelog/gentle-birds-bow.md&value=---%0Amy-crate%3A%20patch%0A---%0A%0AFixed%20a%20bug.)** to commit this to your branch."
    `);
  });

  test("with changed packages", () => {
    expect(
      Comment.notFound({
        repo: "wevm/viem",
        headRef: "my-branch",
        aiContent: null,
        changedPackages: ["my-core", "my-utils"],
      }),
    ).toMatchInlineSnapshot(`
      "### ⚠️ Changelog not found.

      A changelog entry is required before merging.

      **[Add changelog](https://github.com/wevm/viem/new/my-branch?filename=.changelog/gentle-birds-bow.md&value=---%0Amy-core%3A%20patch%0Amy-utils%3A%20patch%0A---%0A%0ABrief%20description%20of%20changes.)**"
    `);
  });
});
