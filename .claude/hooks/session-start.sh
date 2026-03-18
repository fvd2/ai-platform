#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# ---------------------------------------------------------------------------
# 1. Install frontend dependencies
# ---------------------------------------------------------------------------
cd "$PROJECT_DIR"
pnpm install --frozen-lockfile || pnpm install

# ---------------------------------------------------------------------------
# 2. Install API dependencies
# ---------------------------------------------------------------------------
cd "$PROJECT_DIR/api"
pnpm install --frozen-lockfile || pnpm install

# ---------------------------------------------------------------------------
# 3. Install Playwright browsers (needed for E2E tests)
# ---------------------------------------------------------------------------
cd "$PROJECT_DIR"
npx playwright install chromium --with-deps 2>/dev/null || true

# ---------------------------------------------------------------------------
# 4. Populate api/.env from session environment variables
#
#    HOW TO USE: Set these env vars securely via Claude Code project settings
#    (.claude/settings.local.json → "env" block). The hook reads them from
#    the environment and writes api/.env so the Fastify server can load them.
# ---------------------------------------------------------------------------
ENV_FILE="$PROJECT_DIR/api/.env"

# Only write if the file doesn't already exist (idempotent)
if [ ! -f "$ENV_FILE" ]; then
  {
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}"
    echo "MICROSOFT_CLIENT_ID=${MICROSOFT_CLIENT_ID:-}"
    echo "MICROSOFT_CLIENT_SECRET=${MICROSOFT_CLIENT_SECRET:-}"
    echo "MICROSOFT_REDIRECT_URI=${MICROSOFT_REDIRECT_URI:-http://localhost:3000/api/graph/auth/callback}"
  } > "$ENV_FILE"
  echo "✓ Created api/.env from session environment"
fi

# ---------------------------------------------------------------------------
# 5. Ensure env vars are also available in the Claude Code session
# ---------------------------------------------------------------------------
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    [ -n "${ANTHROPIC_API_KEY:-}" ] && echo "export ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\""
    [ -n "${MICROSOFT_CLIENT_ID:-}" ] && echo "export MICROSOFT_CLIENT_ID=\"$MICROSOFT_CLIENT_ID\""
    [ -n "${MICROSOFT_CLIENT_SECRET:-}" ] && echo "export MICROSOFT_CLIENT_SECRET=\"$MICROSOFT_CLIENT_SECRET\""
    [ -n "${MICROSOFT_REDIRECT_URI:-}" ] && echo "export MICROSOFT_REDIRECT_URI=\"$MICROSOFT_REDIRECT_URI\""
  } >> "$CLAUDE_ENV_FILE"
fi

echo "✓ Session start hook completed"
