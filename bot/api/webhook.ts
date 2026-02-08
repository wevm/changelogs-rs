import * as AI from "../lib/ai.js";
import * as Comment from "../lib/comment.js";
import * as GitHub from "../lib/github.js";

type Env = {
  CEREBRAS_API_KEY?: string;
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const body = await request.text();

    if (
      !(await GitHub.verifySignature({
        payload: body,
        signature,
        secret: env.GITHUB_WEBHOOK_SECRET,
      }))
    ) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event !== "pull_request") {
      return Response.json({ ok: true, skipped: true });
    }

    const payload = JSON.parse(body);
    const action: string = payload.action;

    if (action !== "opened" && action !== "synchronize") {
      return Response.json({ ok: true, skipped: true });
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
      const octokit = await GitHub.createOctokit({
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_PRIVATE_KEY,
        installationId,
      });

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

        const apiKey = env.CEREBRAS_API_KEY;
        if (apiKey) {
          const diff = await GitHub.getPRDiff({
            octokit,
            owner,
            repo: repoName,
            prNumber,
          });
          aiContent = await AI.generateChangelog({
            apiKey,
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

      return Response.json({ ok: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};
