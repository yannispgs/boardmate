#!/usr/bin/env bash
#
# Fails the build when SonarCloud reports an unresolved issue on a pull
# request's new code.
#
# Why a script rather than a Quality Gate condition: our SonarCloud plan cannot
# associate anything but the built-in "Sonar way" gate, and that gate's
# conditions only look at ratings, coverage and duplication — never at the issue
# count, which is why hundreds of open issues still show up green. This stands in
# for the `new_violations = 0` condition we are not allowed to configure.
#
# The project is public, so every endpoint read here needs no token.
set -euo pipefail

readonly PROJECT_KEY="yannispgs_boardmate"
readonly API="https://sonarcloud.io/api"
readonly POLL_INTERVAL=15
readonly POLL_ATTEMPTS=40 # 10 minutes
readonly SETTLE_INTERVAL=15
readonly SETTLE_ATTEMPTS=8 # 2 minutes

: "${PR_NUMBER:?PR_NUMBER is required}"
: "${HEAD_SHA:?HEAD_SHA is required}"

# Automatic Analysis runs on SonarCloud's side, asynchronously, kicked off by the
# very push that started this workflow. Wait until the analysis it publishes is
# the one for THIS commit: reading too early grades the previous push, which
# would both miss new issues and re-report ones already fixed.
analysed_sha=""

for _ in $(seq "$POLL_ATTEMPTS"); do
  analysed_sha=$(
    curl -sSf "$API/project_pull_requests/list?project=$PROJECT_KEY" |
      jq -r --arg pr "$PR_NUMBER" \
        '.pullRequests[] | select(.key == $pr) | .commit.sha // ""'
  )

  if [ "$analysed_sha" = "$HEAD_SHA" ]; then
    break
  fi

  echo "Waiting for SonarCloud to analyse $HEAD_SHA (published: ${analysed_sha:-none})…"
  sleep "$POLL_INTERVAL"
done

if [ "$analysed_sha" != "$HEAD_SHA" ]; then
  # No analysis is not evidence of no issue, but it is not evidence of one
  # either — and a pull request touching only files Sonar has no analyser for
  # (Markdown, images) never gets one. Warn instead of blocking on it.
  echo "::warning::SonarCloud published no analysis for $HEAD_SHA within $((POLL_INTERVAL * POLL_ATTEMPTS))s — issue check skipped."
  exit 0
fi

open_issues() {
  curl -sSf "$API/issues/search?componentKeys=$PROJECT_KEY&pullRequest=$PR_NUMBER&resolved=false&ps=500"
}

# The analysis shows up before SonarCloud has finished closing the issues it no
# longer finds: read at once, a fix pushed right after an issue was still
# reported open (seen on #187, a green re-run later). A fixed delay would only
# guess how long that takes, so read again until two reads a few seconds apart
# name the same issues — the set, not the count: one issue closed while another
# opens leaves the total unchanged.
issues=$(open_issues)
keys=$(jq -r '[.issues[].key] | sort | join(",")' <<<"$issues")

for _ in $(seq "$SETTLE_ATTEMPTS"); do
  sleep "$SETTLE_INTERVAL"

  next=$(open_issues)
  next_keys=$(jq -r '[.issues[].key] | sort | join(",")' <<<"$next")

  if [[ "$next_keys" == "$keys" ]]; then
    break
  fi

  echo "SonarCloud is still settling the issues of $HEAD_SHA…"
  issues=$next
  keys=$next_keys
done

total=$(jq -r '.total' <<<"$issues")

if [ "$total" -eq 0 ]; then
  echo "SonarCloud reports no open issue on this pull request."
  exit 0
fi

# One annotation per issue, so each lands on its own line in the PR's diff.
jq -r --arg key "$PROJECT_KEY:" '
  .issues[] |
  "::error file=\(.component | ltrimstr($key)),line=\(.line // 1)::[\(.rule)] \(.message | gsub("\n"; " "))"
' <<<"$issues"

echo "SonarCloud reports $total open issue(s) on this pull request."
echo "Full list: https://sonarcloud.io/project/issues?id=$PROJECT_KEY&pullRequest=$PR_NUMBER&resolved=false"

exit 1
