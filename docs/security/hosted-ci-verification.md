# Hosted CI verification

Sprint 6 preserves the Vercel exclusion and workflow trigger for `codex/security-review-sprint-6`. The owner confirmation required for a push remains outstanding. Local results and the current red dependency gate are recorded in [Sprint 6 verification](sprint-6-verification.json).

Sprint 5 local branch is `codex/security-review-sprint-5`. The owner selected **keep the branch local for now**. There is no hosted job receipt for this revision.

Both repository-root and web-project Vercel configuration set `git.deploymentEnabled["codex/security-*"]` to `false`. Existing cron entries and deployment defaults for other branches are preserved. The Security engineering workflow accepts this review branch on push. Its jobs use read-only contents permissions and declare no deployment environment. Repository source cannot establish the actual Vercel project root, production branch, branch overrides, linked projects or environment-variable assignments. [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration)

Before authorizing a push, the owner should record confirmations for each connected project and integration:

1. Vercel uses the expected Git repository, root directory and production branch. The review branch is excluded from deploys. Check any overlapping rules, preview branch tracking, deploy hooks, forks or integrations.
2. Production credentials are absent from preview/custom environments, CI variables and secrets available to the review branch. Record environment names and whether credentials are isolated. Keep values private.
3. Inspect GitHub Actions, repository apps and webhooks for deployment side effects. Check protected branches, owner review and bypass rules. After the first run, require the exact aggregate check name on the production branch through GitHub Rulesets or branch protection. [GitHub required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
4. Approve the exact review-branch push and no merge or deploy. Retain workflow URL, commit SHA, job results, artifact hashes and timestamp. The receipt must cover dependency inventory, static rules, secrets, scoped regressions, typechecks, production build and aggregate status. Treat missing/skipped jobs as unresolved.

The local repeat of the same advisory policy is documented in [Sprint 5 verification](sprint-5-verification.json). Hosted statuses for every job are pending.
