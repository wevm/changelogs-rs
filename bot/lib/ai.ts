const cerebrasApiUrl = "https://api.cerebras.ai/v1/chat/completions";

export async function generateChangelog(
  parameters: generateChangelog.Parameters,
): Promise<string | null> {
  const { apiKey } = parameters;
  if (!apiKey) return null;

  const packages =
    parameters.packageNames.length > 0
      ? parameters.packageNames.join(", ")
      : "<package-name>";

  const prompt = `Generate a changelog entry for this git diff.

Available packages: ${packages}

Respond with ONLY a markdown file in this exact format (no explanation):

---
<package-name>: patch
<another-package>: minor
---

Brief description of changes.

Rules:
- Replace <package-name> with actual package names from the list above
- Include ALL packages that were modified in the frontmatter
- Use "patch" for bug fixes, "minor" for features, "major" for breaking changes
- Keep the summary concise (1-3 sentences)
- Use past tense (e.g. "Added", "Fixed", "Removed")
- Code fences are allowed in the summary when helpful
- For breaking changes to public API, include a migration path. \`\`\`diff code fences are encouraged.

Git diff:
${parameters.diff}`;

  try {
    const response = await fetch(cerebrasApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 512,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || !content.startsWith("---")) return null;

    return content;
  } catch {
    return null;
  }
}

export declare namespace generateChangelog {
  type Parameters = {
    apiKey: string | undefined;
    diff: string;
    packageNames: string[];
  };
}
