#!/bin/bash
# Agent Analytics post-commit hook template
# This hook logs commit metadata to the Agent Analytics API

# Capture commit metadata
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -1)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_EMAIL=$(git log -1 --pretty=%ae)
COMMIT_TIMESTAMP=$(git log -1 --pretty=%ct)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l | tr -d ' ')
LINES_ADDED=$(git diff HEAD~1 HEAD --numstat 2>/dev/null | awk '{add+=$1} END {print add+0}')
LINES_DELETED=$(git diff HEAD~1 HEAD --numstat 2>/dev/null | awk '{del+=$2} END {print del+0}')

# Call CLI to log commit (run in background to not block git)
agent-analytics log-commit \
  --hash "$COMMIT_HASH" \
  --message "$COMMIT_MSG" \
  --author "$COMMIT_AUTHOR" \
  --email "$COMMIT_EMAIL" \
  --timestamp "$COMMIT_TIMESTAMP" \
  --files-changed "$FILES_CHANGED" \
  --lines-added "$LINES_ADDED" \
  --lines-deleted "$LINES_DELETED" \
  2>/dev/null &

