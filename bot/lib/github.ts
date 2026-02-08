import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export async function verifySignature(
  parameters: verifySignature.Parameters,
): Promise<boolean> {
  if (!parameters.signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(parameters.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(parameters.payload),
  );
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  if (parameters.signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= parameters.signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export declare namespace verifySignature {
  type Parameters = {
    payload: string;
    signature: string | null;
    secret: string;
  };
}

export async function createOctokit(
  parameters: createOctokit.Parameters,
): Promise<Octokit> {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: parameters.appId,
      privateKey: parameters.privateKey,
      installationId: parameters.installationId,
    },
  });
}

export declare namespace createOctokit {
  type Parameters = {
    appId: string;
    installationId: number;
    privateKey: string;
  };
}

export async function getChangelogFiles(
  parameters: getChangelogFiles.Parameters,
): Promise<string[]> {
  const files: string[] = [];
  for await (const response of parameters.octokit.paginate.iterator(
    parameters.octokit.rest.pulls.listFiles,
    {
      owner: parameters.owner,
      repo: parameters.repo,
      pull_number: parameters.prNumber,
      per_page: 100,
    },
  )) {
    for (const file of response.data) {
      if (
        file.filename.startsWith(".changelog/") &&
        file.filename.endsWith(".md") &&
        !file.filename.endsWith("README.md") &&
        file.status === "added"
      ) {
        files.push(file.filename);
      }
    }
  }
  return files;
}

export declare namespace getChangelogFiles {
  type Parameters = {
    octokit: Octokit;
    owner: string;
    repo: string;
    prNumber: number;
  };
}

export async function getPRDiff(
  parameters: getPRDiff.Parameters,
): Promise<string> {
  const { data } = await parameters.octokit.rest.pulls.get({
    owner: parameters.owner,
    repo: parameters.repo,
    pull_number: parameters.prNumber,
    mediaType: { format: "diff" },
  });
  const diff = data as unknown as string;
  const maxLength = 12000;
  if (diff.length > maxLength) {
    return `${diff.slice(0, maxLength)}\n... (diff truncated)`;
  }
  return diff;
}

export declare namespace getPRDiff {
  type Parameters = {
    octokit: Octokit;
    owner: string;
    repo: string;
    prNumber: number;
  };
}

type PackageInfo = {
  name: string;
  path: string;
};

async function discoverPackages(
  parameters: DiscoverPackagesParameters,
): Promise<PackageInfo[]> {
  try {
    const { data } = await parameters.octokit.rest.repos.getContent({
      owner: parameters.owner,
      repo: parameters.repo,
      path: "Cargo.toml",
      ref: parameters.ref,
    });
    if ("content" in data) {
      const content = atob(data.content);
      const workspaceMembers = content.match(
        /members\s*=\s*\[([\s\S]*?)\]/,
      )?.[1];
      if (workspaceMembers) {
        const memberPaths =
          workspaceMembers
            .match(/"([^"]+)"/g)
            ?.map((m: string) => m.replace(/"/g, "")) ?? [];
        const packages: PackageInfo[] = [];
        for (const memberPath of memberPaths) {
          const name = await getCargoPackageName({
            octokit: parameters.octokit,
            owner: parameters.owner,
            repo: parameters.repo,
            ref: parameters.ref,
            memberPath,
          });
          packages.push({ name: name ?? memberPath, path: memberPath });
        }
        return packages;
      }
      const name = content.match(/name\s*=\s*"([^"]+)"/)?.[1];
      if (name) return [{ name, path: "." }];
    }
  } catch {
    // Not a Rust project
  }

  try {
    const { data } = await parameters.octokit.rest.repos.getContent({
      owner: parameters.owner,
      repo: parameters.repo,
      path: "pyproject.toml",
      ref: parameters.ref,
    });
    if ("content" in data) {
      const content = atob(data.content);

      const uvMembers = content.match(
        /\[tool\.uv\.workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/,
      )?.[1];
      if (uvMembers) {
        const memberPaths =
          uvMembers
            .match(/"([^"]+)"/g)
            ?.map((m: string) => m.replace(/"/g, "")) ?? [];
        const packages: PackageInfo[] = [];
        for (const memberPath of memberPaths) {
          const name = await getPythonPackageName({
            octokit: parameters.octokit,
            owner: parameters.owner,
            repo: parameters.repo,
            ref: parameters.ref,
            memberPath,
          });
          packages.push({ name: name ?? memberPath, path: memberPath });
        }
        return packages;
      }

      const name =
        content.match(/\[project\][\s\S]*?name\s*=\s*"([^"]+)"/)?.[1] ??
        content.match(/\[tool\.poetry\][\s\S]*?name\s*=\s*"([^"]+)"/)?.[1];
      if (name) return [{ name, path: "." }];
    }
  } catch {
    // Not a Python project
  }

  return [];
}

type DiscoverPackagesParameters = {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string;
};

async function getPythonPackageName(
  parameters: GetPythonPackageNameParameters,
): Promise<string | null> {
  try {
    const { data } = await parameters.octokit.rest.repos.getContent({
      owner: parameters.owner,
      repo: parameters.repo,
      path: `${parameters.memberPath}/pyproject.toml`,
      ref: parameters.ref,
    });
    if ("content" in data) {
      const content = atob(data.content);
      return (
        content.match(/\[project\][\s\S]*?name\s*=\s*"([^"]+)"/)?.[1] ??
        content.match(/\[tool\.poetry\][\s\S]*?name\s*=\s*"([^"]+)"/)?.[1] ??
        null
      );
    }
  } catch {
    // Member pyproject.toml not found
  }
  return null;
}

type GetPythonPackageNameParameters = {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string;
  memberPath: string;
};

async function getCargoPackageName(
  parameters: GetCargoPackageNameParameters,
): Promise<string | null> {
  try {
    const { data } = await parameters.octokit.rest.repos.getContent({
      owner: parameters.owner,
      repo: parameters.repo,
      path: `${parameters.memberPath}/Cargo.toml`,
      ref: parameters.ref,
    });
    if ("content" in data) {
      const content = atob(data.content);
      return content.match(/name\s*=\s*"([^"]+)"/)?.[1] ?? null;
    }
  } catch {
    // Member Cargo.toml not found
  }
  return null;
}

type GetCargoPackageNameParameters = {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string;
  memberPath: string;
};

export async function getChangedPackages(
  parameters: getChangedPackages.Parameters,
): Promise<string[]> {
  const [packages, changedFiles] = await Promise.all([
    discoverPackages(parameters),
    listChangedFiles(parameters),
  ]);

  if (packages.length === 0) return [];

  if (packages.length === 1 && packages[0].path === ".") {
    return [packages[0].name];
  }

  const changed = new Set<string>();
  for (const file of changedFiles) {
    for (const pkg of packages) {
      if (pkg.path !== "." && file.startsWith(`${pkg.path}/`)) {
        changed.add(pkg.name);
      }
    }
  }
  return [...changed];
}

export declare namespace getChangedPackages {
  type Parameters = {
    octokit: Octokit;
    owner: string;
    repo: string;
    ref: string;
    prNumber: number;
  };
}

async function listChangedFiles(
  parameters: ListChangedFilesParameters,
): Promise<string[]> {
  const files: string[] = [];
  for await (const response of parameters.octokit.paginate.iterator(
    parameters.octokit.rest.pulls.listFiles,
    {
      owner: parameters.owner,
      repo: parameters.repo,
      pull_number: parameters.prNumber,
      per_page: 100,
    },
  )) {
    for (const file of response.data) {
      files.push(file.filename);
    }
  }
  return files;
}

type ListChangedFilesParameters = {
  octokit: Octokit;
  owner: string;
  repo: string;
  prNumber: number;
};

type BotComment = {
  id: number;
  body: string;
};

export async function findBotComment(
  parameters: findBotComment.Parameters,
): Promise<BotComment | null> {
  for await (const response of parameters.octokit.paginate.iterator(
    parameters.octokit.rest.issues.listComments,
    {
      owner: parameters.owner,
      repo: parameters.repo,
      issue_number: parameters.prNumber,
      per_page: 100,
    },
  )) {
    for (const comment of response.data) {
      if (
        comment.performed_via_github_app &&
        comment.body &&
        (comment.body.startsWith("### ✅ Changelog") ||
          comment.body.startsWith("### ⚠️ Changelog"))
      ) {
        return { id: comment.id, body: comment.body };
      }
    }
  }
  return null;
}

export declare namespace findBotComment {
  type Parameters = {
    octokit: Octokit;
    owner: string;
    repo: string;
    prNumber: number;
  };
}

export async function upsertComment(
  parameters: upsertComment.Parameters,
): Promise<void> {
  if (parameters.existingCommentId) {
    await parameters.octokit.rest.issues.updateComment({
      owner: parameters.owner,
      repo: parameters.repo,
      comment_id: parameters.existingCommentId,
      body: parameters.body,
    });
  } else {
    await parameters.octokit.rest.issues.createComment({
      owner: parameters.owner,
      repo: parameters.repo,
      issue_number: parameters.prNumber,
      body: parameters.body,
    });
  }
}

export declare namespace upsertComment {
  type Parameters = {
    octokit: Octokit;
    owner: string;
    repo: string;
    prNumber: number;
    body: string;
    existingCommentId: number | null;
  };
}
