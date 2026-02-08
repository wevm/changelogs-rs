import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as AI from "../lib/ai.js";
import * as Comment from "../lib/comment.js";
import * as GitHub from "../lib/github.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const event = req.headers["x-github-event"] as string | undefined;
  const body =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  if (
    !GitHub.verifySignature({
      payload: body,
      signature: signature ?? null,
      secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
    })
  ) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  if (event !== "pull_request") {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const payload =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const action: string = payload.action;

  if (action !== "opened" && action !== "synchronize") {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const pr = payload.pull_request;
  const repo = payload.repository;
  const installationId: number = payload.installation.id;
  const owner: string = repo.owner.login;
  const repoName: string = repo.name;
  const prNumber: number = pr.number;
  const headRef: string = pr.head.ref;
  const headSha: string = pr.head.sha;
  const fullRepo = `${owner}/${repoName}`;

  try {
    const octokit = await GitHub.createOctokit({ installationId });

    const [changelogFiles, existingComment] = await Promise.all([
      GitHub.getChangelogFiles({ octokit, owner, repo: repoName, prNumber }),
      GitHub.findBotComment({ octokit, owner, repo: repoName, prNumber }),
    ]);

    let commentBody: string;

    if (changelogFiles.length > 0) {
      commentBody = Comment.found({
        repo: fullRepo,
        headRef,
        changelogFile: changelogFiles[0],
      });
    } else {
      let aiContent: string | null = null;

      const changedPackages = await GitHub.getChangedPackages({
        octokit,
        owner,
        repo: repoName,
        ref: headSha,
        prNumber,
      });

      if (process.env.CEREBRAS_API_KEY) {
        const diff = await GitHub.getPRDiff({
          octokit,
          owner,
          repo: repoName,
          prNumber,
        });
        aiContent = await AI.generateChangelog({
          diff,
          packageNames: changedPackages,
        });
      }

      commentBody = Comment.notFound({
        repo: fullRepo,
        headRef,
        aiContent,
        changedPackages,
      });
    }

    await GitHub.upsertComment({
      octokit,
      owner,
      repo: repoName,
      prNumber,
      body: commentBody,
      existingCommentId: existingComment?.id ?? null,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
