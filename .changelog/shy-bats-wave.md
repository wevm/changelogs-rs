---
changelogs: patch
---

Fixed PR number detection to check the add commit's message first (for squash merges), then fall back to merge commits. This ensures correct PR attribution for repositories using squash-and-merge workflow.
