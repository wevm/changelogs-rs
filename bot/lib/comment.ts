const adjectives = [
  "brave",
  "calm",
  "dark",
  "eager",
  "fair",
  "gentle",
  "happy",
  "icy",
  "jolly",
  "keen",
  "lively",
  "merry",
  "nice",
  "odd",
  "proud",
  "quick",
  "rare",
  "shy",
  "tall",
  "unique",
  "vast",
  "warm",
  "young",
  "zesty",
  "bold",
  "cool",
  "dry",
  "easy",
  "fast",
  "good",
  "hot",
  "kind",
  "lazy",
  "mild",
  "neat",
  "old",
  "plain",
  "quiet",
  "rich",
  "safe",
  "tidy",
  "ugly",
  "vain",
  "weak",
  "aged",
  "big",
  "cute",
  "dull",
  "evil",
  "fine",
];

const nouns = [
  "lions",
  "bears",
  "wolves",
  "eagles",
  "hawks",
  "foxes",
  "deer",
  "owls",
  "cats",
  "dogs",
  "birds",
  "fish",
  "frogs",
  "bees",
  "ants",
  "mice",
  "rats",
  "bats",
  "crows",
  "doves",
  "ducks",
  "geese",
  "hens",
  "pigs",
  "cows",
  "goats",
  "sheep",
  "horses",
  "mules",
  "donkeys",
  "tigers",
  "pandas",
  "koalas",
  "seals",
  "whales",
  "sharks",
  "crabs",
  "clams",
  "snails",
  "slugs",
  "trees",
  "rocks",
  "waves",
  "winds",
  "clouds",
  "stars",
  "moons",
  "suns",
  "hills",
  "lakes",
];

const verbs = [
  "dance",
  "sing",
  "jump",
  "run",
  "walk",
  "swim",
  "fly",
  "crawl",
  "climb",
  "slide",
  "roll",
  "spin",
  "twist",
  "shake",
  "wave",
  "bow",
  "nod",
  "wink",
  "smile",
  "laugh",
  "cry",
  "shout",
  "whisper",
  "hum",
  "buzz",
  "roar",
  "growl",
  "bark",
  "meow",
  "chirp",
  "play",
  "rest",
  "sleep",
  "wake",
  "eat",
  "drink",
  "cook",
  "bake",
  "read",
  "write",
  "draw",
  "paint",
  "build",
  "break",
  "fix",
  "clean",
  "wash",
  "dry",
  "fold",
  "pack",
];

function randomItem<value>(arr: value[]): value {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return `${randomItem(adjectives)}-${randomItem(nouns)}-${randomItem(verbs)}`;
}

export function found(parameters: found.Parameters): string {
  const editUrl = `https://github.com/${parameters.repo}/edit/${parameters.headRef}/${parameters.changelogFile}`;
  return `### ✅ Changelog found on PR.\n\n[Edit changelog](${editUrl})`;
}

export declare namespace found {
  type Parameters = {
    repo: string;
    headRef: string;
    changelogFile: string;
  };
}

export function notFound(parameters: notFound.Parameters): string {
  const { repo, headRef, aiContent, changedPackages = [] } = parameters;
  const frontmatter =
    changedPackages.length > 0
      ? changedPackages.map((p) => `${p}: patch`).join("\n")
      : "<package-name>: patch";
  const template =
    aiContent ?? `---\n${frontmatter}\n---\n\nBrief description of changes.`;

  const encodedTemplate = encodeURIComponent(template);
  const id = generateId();
  const newFile = `.changelog/${id}.md`;
  const addUrl = `https://github.com/${repo}/new/${headRef}?filename=${newFile}&value=${encodedTemplate}`;

  if (aiContent) {
    return `### ⚠️ Changelog not found.

A changelog entry is required before merging. We've generated a suggested changelog based on your changes:

<details>
<summary>Preview</summary>

\`\`\`markdown
${aiContent}
\`\`\`

</details>

**[Add changelog](${addUrl})** to commit this to your branch.`;
  }

  return `### ⚠️ Changelog not found.

A changelog entry is required before merging.

**[Add changelog](${addUrl})**`;
}

export declare namespace notFound {
  type Parameters = {
    repo: string;
    headRef: string;
    aiContent: string | null;
    changedPackages?: string[];
  };
}
