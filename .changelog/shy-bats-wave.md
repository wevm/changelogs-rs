---
changelogs: patch
---

Fixed PR number detection to find the *first* merge commit that brought a changelog file into the branch, rather than the most recent one. This prevents incorrect PR attribution on release branches where later merges could incorrectly claim authorship.
