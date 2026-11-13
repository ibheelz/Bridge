#!/bin/zsh
# Unattended dev loop for the Bridge project.
# auto-dev/loop.sh runs this repeatedly. If Claude usage is exhausted the call
# fails fast and the next run tries again, so work resumes on its own once
# the limit resets.
#
# Pause:  touch auto-dev/STOP      Resume: rm auto-dev/STOP
# Quit:   pkill -f auto-dev/loop.sh

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
PROJECT="/Users/bheelz/Desktop/web-apps/Bridge"
DIR="$PROJECT/auto-dev"
LOG="$DIR/log.txt"
LOCK="$DIR/.lock"

cd "$PROJECT" || exit 1
[ -f "$DIR/STOP" ] && exit 0

# One run at a time. A lock older than 2 hours is treated as stale.
if [ -d "$LOCK" ]; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +120)" ]; then rmdir "$LOCK"; else exit 0; fi
fi
mkdir "$LOCK" || exit 0
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

echo "=== $(date '+%Y-%m-%d %H:%M:%S') run start" >> "$LOG"

claude -p "$(cat "$DIR/prompt.md")" \
  --permission-mode acceptEdits \
  --allowedTools "Read" "Edit" "Write" "Glob" "Grep" \
    "Bash(npm install:*)" "Bash(npm run build:*)" "Bash(npx astro check:*)" \
    "Bash(node:*)" "Bash(ls:*)" "Bash(mkdir:*)" "Bash(cp:*)" \
    "Bash(git switch:*)" "Bash(git branch:*)" "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git add:*)" "Bash(git commit:*)" \
  >> "$LOG" 2>&1
RC=$?

echo "=== $(date '+%Y-%m-%d %H:%M:%S') run end (exit $RC)" >> "$LOG"
exit $RC
